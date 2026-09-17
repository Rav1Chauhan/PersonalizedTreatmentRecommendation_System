# Production Audit — Personalized Treatment Recommendation System

**Audit date:** 2026-09-17
**Auditor:** Staff-level full-stack + security + healthcare software review
**Repository:** PersonalizedTreatmentRecommendation_System (Bolt-generated prototype)

---

## 1. Current Architecture

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 13 App Router, React 18, Tailwind, shadcn/ui | Functional prototype |
| API | Next.js Route Handlers (`/api/v1/*`), all `force-dynamic` | Functional, thin handlers |
| Auth | Supabase Auth (email/password), JWT bearer tokens | Working |
| Database | Supabase (PostgreSQL), 6 tables, RLS enabled | Working with 1 critical defect |
| LLM | 3 providers (Gemini, OpenAI, Claude) via parallel orchestration | Working but over-engineered for single-provider target |
| Evidence Retrieval | In-process TF-IDF + Jaccard similarity over 28 hardcoded records | Prototype only |
| ML | In-process one-vs-rest logistic regression, 25 synthetic samples | Experimental, not validated |
| Safety | Hardcoded allergy/adverse-reaction engine with ~45 drug aliases | Prototype, deterministic |
| Ranking | 6-signal weighted hybrid scoring | Functional, weights not validated |
| Deployment | Netlify (`@netlify/plugin-nextjs`) | Configured |

---

## 2. Current Folder Structure

```
app/
  (dashboard)/
    dashboard/page.tsx          — overview stats
    patients/
      page.tsx                  — patient list + search
      new/page.tsx              — create patient form
      [id]/
        page.tsx                — patient detail + treatment history
        analyze/page.tsx        — problem input + provider selection
        results/page.tsx        — recommendation results display
    history/page.tsx            — recommendation history by patient
    system/page.tsx             — system info + ML/dataset details
  api/v1/
    auth/login/route.ts
    auth/signup/route.ts
    health/route.ts
    model/info/route.ts
    patients/route.ts           — GET list, POST create
    patients/[id]/route.ts      — GET, PUT, DELETE
    patients/[id]/history/route.ts — GET, POST treatment history
    recommendations/route.ts    — POST generate recommendations
    safety/check/route.ts       — POST standalone safety check
    history/patient/[id]/route.ts — GET recommendation history
  globals.css
  layout.tsx
  page.tsx                      — login/signup
components/
  auth-provider.tsx             — Supabase auth context
  ui/                           — shadcn/ui components (50+ files)
hooks/
  use-toast.ts
lib/
  api-auth.ts                   — server-side auth helpers
  api-client.ts                 — browser fetch wrapper
  config.ts                     — env-driven config + ranking weights
  supabase.ts                   — client factories (browser, server, admin)
  utils.ts                      — cn() classname merger
services/
  context-builder.ts            — patient context + scoring heuristics
  evidence-retrieval.ts         — TF-IDF/Jaccard RAG over hardcoded dataset
  patient-ml.ts                 — logistic regression ML model
  ranking-service.ts            — hybrid ranking engine
  safety-engine.ts              — allergy/adverse-reaction safety gate
  llm/
    base.ts                     — LLMProvider interface, prompt builder, parser
    gemini.ts                   — Gemini provider
    openai.ts                   — OpenAI provider
    claude.ts                   — Claude provider
    orchestrator.ts             — parallel fan-out + deduplication
supabase/migrations/
  20260902085954_create_patients_and_history_tables.sql
  20260902090026_create_recommendation_tables.sql
types/
  index.ts                      — all TypeScript domain types
```

---

## 3. Current Recommendation Flow

```
1. Client POST /api/v1/recommendations { patientId, problem, providers?, topK? }
2. requireAuth(req) — extracts JWT, calls supabase.auth.getUser()
3. Manual validation — checks patientId/problem present, problem length ≤ 5000
4. Load patient row from Supabase (by id, no ownership check in route)
5. Load treatment history from Supabase
6. buildPatientContext(problem, patient, history)
7. LLMOrchestrator.execute(context, requestedProviders)
   — runs enabled providers in parallel via Promise.all
   — each provider: HTTP POST to external API with timeout
   — parseLLMResponse strips markdown fences, JSON-parses, validates candidates array
8. Deduplicate candidates by normalized treatment name
9. rankCandidates(deduplicated, context, weights, topK)
   — for each candidate: retrieve evidence, compute 6 sub-scores
   — finalScore = weighted sum (llm 0.25, retrieval 0.20, diagnosis 0.20, context 0.15, evidence 0.10, ml 0.10)
   — sort descending, slice to topK
10. For each ranked candidate: checkSafety(treatment, context)
    — allergy match → excluded
    — adverse reaction → review_required with warning
    — unknown drug → review_required
    — known drug → known
11. Partition into recommendations[] and excludedCandidates[]
12. Sort recommendations by final score, assign rank
13. Persist: insert recommendation_requests, then loop-insert candidates, evidence, providers (sequential awaits, NOT atomic)
14. Return RecommendationResponse JSON
```

**Critical ordering issue:** Safety runs AFTER ranking (step 10 after step 9). A safety-excluded candidate is already ranked and scored before being filtered. This is a presentation-level filter, not an architectural constraint. A high score does not "rescue" an excluded candidate in the current code, but the ranking computation is wasted work and the architecture does not enforce safety-before-ranking.

---

## 4. Current LLM Implementation

### Gemini (`services/llm/gemini.ts`)
- Model: `gemini-1.5-flash`
- Endpoint: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- Temperature: 0.3, maxOutputTokens: 2048, responseMimeType: `application/json`
- Timeout via `AbortController` at `LLM_TIMEOUT_MS` (30000ms)
- System prompt + user prompt concatenated as separate `parts` in a single `contents` entry
- Token usage read from `usageMetadata`
- Error handling: `NO_API_KEY`, `TIMEOUT`, `NO_CANDIDATES`, `REQUEST_FAILED`, `HTTP_{status}`

### OpenAI (`services/llm/openai.ts`)
- Model: `gpt-4o-mini`
- Standard chat completions API with `response_format: { type: 'json_object' }`
- Same timeout/error pattern

### Claude (`services/llm/claude.ts`)
- Model: `claude-3-5-sonnet-20241022`
- Uses `system` field for system prompt, `messages` for user message
- No explicit temperature (defaults to 1.0 server-side — inconsistent with 0.3 on other providers)

### Orchestrator (`services/llm/orchestrator.ts`)
- Registers only enabled providers (env-driven)
- `Promise.all` parallel execution
- Dedup by normalized treatment name (lowercase, strip articles, remove non-alphanumerics)
- Merges reasoning summaries, considerations, evidenceNeeded across providers
- Tracks `providerSupportRatio` = providers.length / totalProviders
- Sorts by provider count (consensus ranking)

### Prompt Construction (`services/llm/base.ts`)
- `SYSTEM_PROMPT`: declares non-doctor role, JSON-only output, candidate schema
- `buildUserPrompt(context)`: concatenates problem, demographics, diagnosis, symptoms, allergies, chronic conditions, genetic disorders, previous treatments
- **No prompt injection defense** — patient data is directly interpolated into the prompt
- **No context minimization** — full patient context sent regardless of relevance

---

## 5. Current Database Schema

### `patients`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| user_id | uuid FK → auth.users | default auth.uid() |
| name | text | |
| age | int2 | CHECK 0–150 |
| gender | text | CHECK male/female/other |
| weight_kg | numeric | CHECK ≥ 0 |
| height_cm | numeric | CHECK ≥ 0 |
| bmi | numeric | CHECK ≥ 0 |
| diagnosis | text | nullable |
| symptoms | text[] | default '{}' |
| allergies | text[] | default '{}' |
| chronic_conditions | text[] | default '{}' |
| genetic_disorders | text[] | default '{}' |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### `patient_treatment_history`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| patient_id | uuid FK → patients | ON DELETE CASCADE |
| treatment_name | text | |
| outcome | text | nullable |
| adverse_reaction | text | nullable |
| started_at | date | nullable |
| ended_at | date | nullable |
| notes | text | nullable |
| created_at | timestamptz | |

### `recommendation_requests`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| patient_id | uuid FK → patients | CASCADE |
| user_id | uuid FK → auth.users | default auth.uid() |
| problem_text | text | |
| model_version | text | |
| created_at | timestamptz | |

**Missing:** status, model_name, prompt_version, ranking_version, safety_version, retrieval_version, completed_at

### `recommendation_candidates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| request_id | uuid FK → requests | CASCADE |
| treatment | text | |
| rank | int4 | |
| final_score | numeric | |
| llm_support_score | numeric | |
| retrieval_score | numeric | |
| diagnosis_relevance_score | numeric | |
| patient_context_score | numeric | |
| evidence_quality_score | numeric | |
| ml_probability | numeric | nullable |
| safety_status | text | |
| review_required | bool | default true |
| reason | text | |
| considerations | text[] | |
| providers | text[] | |
| created_at | timestamptz | |

**Missing:** normalized_treatment

### `recommendation_evidence`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| candidate_id | uuid FK → candidates | CASCADE |
| source | text | |
| source_url | text | nullable |
| title | text | |
| condition | text | |
| similarity | numeric | |
| evidence_quality | text | |
| created_at | timestamptz | |

**Missing:** publisher, publication_date, evidence_level, chunk_id, retrieval_method, retrieved_at

### `recommendation_providers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| request_id | uuid FK → requests | |
| provider | text | |
| status | text | |
| latency_ms | int4 | nullable |
| input_tokens | int4 | nullable |
| output_tokens | int4 | nullable |
| error_code | text | nullable |
| candidates | text[] | |
| created_at | timestamptz | |

---

## 6. Current RLS Policies (Live Database State)

### `patients` — 4 policies, all scoped by `auth.uid() = user_id`
- SELECT, INSERT, UPDATE, DELETE — **correct**

### `patient_treatment_history` — 4 policies, all via EXISTS subquery through patients
- SELECT, INSERT, UPDATE, DELETE — **correct**

### `recommendation_requests` — 4 policies
- `select_own_requests` — `USING (auth.uid() = user_id)` — **correct**
- `insert_own_requests` — `WITH CHECK (auth.uid() = user_id)` — **correct**
- `delete_own_requests` — `USING (auth.uid() = user_id)` — **correct**
- **`select_own_providers` — `USING (true)` — CRITICAL DEFECT**

The `select_own_providers` policy was erroneously created on `recommendation_requests` instead of `recommendation_providers` during the migration. It was then dropped and recreated on the correct table, but **the erroneous policy on `recommendation_requests` was never dropped**. This means **any authenticated user can SELECT ALL recommendation_requests rows across all users**, leaking every patient's problem text, patient_id, and model version.

### `recommendation_candidates` — 2 policies (SELECT, INSERT only)
- **No UPDATE or DELETE policies** — rows cannot be modified or deleted via the API client (not critical since candidates are write-once, but inconsistent)

### `recommendation_evidence` — 2 policies (SELECT, INSERT only)
- Same as candidates — no UPDATE/DELETE

### `recommendation_providers` — 2 policies (SELECT, INSERT only)
- Same pattern — no UPDATE/DELETE

### Column-level grants
Both `anon` and `authenticated` roles have full `SELECT/INSERT/UPDATE/DELETE` on **all columns** of **all 6 tables**. RLS is the only access control. There are no column-level restrictions.

---

## 7. Current Authentication Flow

```
1. User submits email/password on login page (app/page.tsx)
2. auth-provider.tsx calls supabase.auth.signInWithPassword()
   — OR signup route POST /api/v1/auth/signup
3. Supabase returns JWT access_token + refresh_token
4. Browser stores session in Supabase client (localStorage)
5. api-client.ts (apiFetch) reads session.access_token, attaches as Bearer header
6. API routes call requireAuth(req) → extractToken → supabase.auth.getUser()
7. requireAuth returns { userId } or { error }
8. Route uses getServerSupabase(req) — creates Supabase client with user's JWT
9. RLS policies enforce user-scoped access at the database level
```

**Issues:**
- Login/signup routes call `getServerSupabase()` without passing `req` (inconsistent but not broken since auth operations don't need RLS)
- `requireAuth` returns the userId but **routes never check patient ownership explicitly** — they rely entirely on RLS
- No rate limiting on login/signup
- No session expiry handling on the frontend (relies on Supabase client auto-refresh)

---

## 8. Current Safety Engine

**File:** `services/safety-engine.ts`

- `DRUG_ALIASES`: ~45 generic→brand mappings (bidirectional lookup)
- `ALLERGY_CLASS_CROSS_REACTIVITY`: 4 allergy classes (penicillin, sulfa, nsaid, statin) with member drug lists
- `checkSafety(treatmentName, context)`:
  1. Normalize treatment name
  2. Get all aliases for the treatment
  3. Check allergy match (substring-contains between treatment aliases and cross-reactive allergy drugs) → `excluded`
  4. Check prior adverse reaction match → adds warning, status becomes `review_required`
  5. If drug not in alias DB and no warnings → `review_required` ("not found in known medication database")
  6. If warnings present → `review_required`
  7. Otherwise → `known` (source: drug_database)

**Issues:**
- "known" status is misleading — it means "recognized in local alias dictionary," not "verified safe for this patient"
- No drug-drug interaction checking
- No contraindication checking (e.g., pregnancy, renal impairment)
- Substring matching is crude (e.g., "pen" would match "penicillin")
- No dosing/indication validation
- ~45 drugs is far too small for a real safety database
- No external authoritative source

---

## 9. Current RAG Implementation

**File:** `services/evidence-retrieval.ts`

- 28 hardcoded `EvidenceRecord` entries sourced from "UCI Drug Reviews" and "Clinical Guidelines"
- Covers: depression, anxiety, pain, allergies, insomnia, diabetes, cholesterol, hypertension, GERD, asthma, neuropathic pain, hypothyroidism
- `retrieveEvidence(treatmentName, context, topK=5)`:
  - Builds query string from treatment name + diagnosis + symptoms
  - Tokenizes (lowercase, strip non-alphanumerics, drop 1-char tokens)
  - Scores each record: `cosineSimilarity(query, record) * 0.6 + jaccardSimilarity * 0.4`
  - Filters similarity > 0.05, sorts, slices to topK
- `computeEvidenceQuality`: weighted blend of condition match (0.4), text similarity (0.3), rating (0.3) → bucketed into high/moderate/low/very_low

**Issues:**
- Not a real RAG pipeline — no embeddings, no vector store, no chunking, no document ingestion
- 28 records is too small to be useful
- No provenance metadata (publisher, publication date, evidence level)
- No external authoritative sources (PubMed, Cochrane, FDA)
- TF-cosine without IDF is suboptimal
- Evidence is retrieved AFTER candidate generation, not used to ground generation

---

## 10. Current ML Implementation

**File:** `services/patient-ml.ts`

- One-vs-rest logistic regression implemented from scratch
- 25 synthetic training samples, 16 features
- Features: age, gender (0/1/0.5), bmi, hasDepression, hasAnxiety, hasPain, hasInsomnia, hasHypertension, hasDiabetes, hasHighCholesterol, priorCBT, priorSSRI, priorSNRI, priorLifestyle, priorTherapy, priorOther
- Training: lr=0.01, 200 epochs, squared-error gradient
- `predictProbability(treatmentName, context)` → sigmoid of standardized features × weights + bias
- Returns null if treatment not in vocabulary
- Model info explicitly states "Experimental — NOT clinical validity — synthetic"

**Issues:**
- 25 samples is far too few for meaningful training
- No train/validation split, no cross-validation
- No calibration, no precision/recall reporting
- No data leakage checks
- No temporal or external validation
- Synthetic data only — no real patient outcomes
- ML score (weight 0.10) influences ranking without validation

---

## 11. Security Vulnerabilities

| # | Severity | Vulnerability | Details |
|---|---|---|---|
| 1 | **P0** | RLS bypass on `recommendation_requests` | `select_own_providers` policy with `USING (true)` allows any authenticated user to read all recommendation requests across all users. Leaks patient_id, problem_text, model_version. |
| 2 | **P0** | No server-side input validation | API routes use ad-hoc `if (!field)` checks. No Zod schemas. Malformed UUIDs, excessive payloads, and invalid types are not rejected properly. |
| 3 | **P0** | No rate limiting | No rate limiting on any endpoint. AI recommendation generation (expensive Gemini calls) can be called unlimited times. Login/signup have no brute-force protection. |
| 4 | **P1** | Raw error messages leaked to client | `return NextResponse.json({ error: error.message })` in catch blocks exposes internal exception details, stack traces, and Supabase error messages. |
| 5 | **P1** | No prompt injection defense | Patient-entered text (symptoms, diagnosis, problem description) is directly interpolated into LLM prompts. A malicious user could inject instructions via patient data fields. |
| 6 | **P1** | No context minimization | Full patient context (name, all conditions, all history) is sent to the LLM. Patient name is unnecessary for clinical reasoning and increases PII exposure. |
| 7 | **P1** | Service-role key in health route | `getSupabaseAdmin()` used in health check bypasses RLS. Low risk since it only does `SELECT ... LIMIT 1`, but the pattern is dangerous if copied. |
| 8 | **P1** | No request correlation IDs | No request/trace IDs generated. Errors cannot be traced to specific requests. |
| 9 | **P2** | No UPDATE/DELETE policies on recommendation tables | `recommendation_candidates`, `recommendation_evidence`, `recommendation_providers` lack UPDATE and DELETE policies. Rows are effectively immutable via the API client, but this is inconsistent with the full CRUD grants on the roles. |
| 10 | **P2** | Column-level grants too permissive | Both `anon` and `authenticated` have full CRUD on all columns of all tables. No column-level restrictions (e.g., `user_id` should not be user-editable on patients). |
| 11 | **P2** | No audit logging | No structured logging of who accessed what, when. No audit trail for recommendation generation. |
| 12 | **P2** | No CORS configuration | API routes have no explicit CORS headers. Relies on same-origin by default. |
| 13 | **P2** | No session management policy | No max session duration, no concurrent session limit. |

---

## 12. Functional Bugs

| # | Severity | Bug | Details |
|---|---|---|---|
| 1 | **P1** | BMI null-out on partial update | `PUT /patients/[id]` — if only `weightKg` is provided (not `heightCm`), `currentHeight` is set to `null`, causing `computeBmi` to return `null`, wiping the existing BMI. |
| 2 | **P2** | DELETE returns success regardless | `DELETE /patients/[id]` returns `{ success: true }` even if no row was deleted (patient didn't exist). Should return 404. |
| 3 | **P2** | Duplicated code | `parseArray` and `mapPatient` are duplicated verbatim between `patients/route.ts` and `patients/[id]/route.ts`. |
| 4 | **P3** | Unused import | `getMLModel` imported in `recommendations/route.ts` but never used directly (it's used inside `rankCandidates`). |
| 5 | **P3** | No pagination on patient list | `GET /patients` returns all patients with no pagination. Will degrade with scale. |
| 6 | **P3** | Provider count display hardcoded to 3 | Dashboard shows "X/3" providers configured. Will be wrong after Gemini-only migration. |
| 7 | **P3** | Simulated progress steps | Analyze page shows 7 progress steps (Gemini, OpenAI, Claude, etc.) on a cosmetic timer, not tied to actual API progress. |

---

## 13. Missing Production Features

| Feature | Priority | Notes |
|---|---|---|
| Zod input validation (all endpoints) | P0 | No server-side schema validation exists |
| Rate limiting (login, signup, recommendations) | P0 | None implemented |
| Prompt injection defense | P1 | Patient data treated as trusted |
| Context minimization before LLM | P1 | Full PII sent to external API |
| Structured error responses | P1 | Raw errors leaked |
| Request correlation IDs | P1 | No traceability |
| Structured logging / observability | P2 | No logging at all |
| Audit trail | P2 | No record of who did what |
| Atomic persistence | P2 | Sequential awaits, partial failure possible |
| Tests (unit, integration, security) | P2 | Zero tests exist |
| CI/CD pipeline | P2 | No GitHub Actions |
| Threat model documentation | P2 | None exists |
| Evidence provenance metadata | P2 | No publisher, date, evidence level |
| Evaluation framework | P3 | No eval suite |
| Dependency audit | P3 | Not performed |
| Secrets scanning | P3 | Not performed |

---

## 14. Technical Debt

| Area | Debt | Impact |
|---|---|---|
| Multi-LLM abstraction | 3 providers, 5 files, orchestrator consensus logic | Unnecessary complexity for Gemini-only target |
| Hardcoded evidence dataset | 28 records in source code | Not scalable, not maintainable |
| Synthetic ML training data | 25 samples in source code | Not trainable, not extensible |
| In-process ML/retrieval | No external model serving | Cannot scale, no GPU, no model versioning |
| Duplicated route helpers | parseArray, mapPatient copied | Maintenance risk |
| No shared types for DB rows | Manual field mapping everywhere | Type safety gap |
| No service layer separation | Business logic in route handlers | Hard to test, hard to reuse |
| No environment management | `.env.example` has 3-provider config | Needs Gemini-only cleanup |

---

## 15. Recommended Target Architecture

```
Next.js Frontend
        ↓
API Layer (thin route handlers)
        ↓
Zod Request Validation
        ↓
Authentication (Supabase JWT)
        ↓
Authorization (patient ownership check)
        ↓
Rate Limiter
        ↓
RecommendationService (service layer)
        ↓
PatientContextBuilder + Context Minimizer
        ↓
Evidence Retrieval (RAG)
        ↓
Gemini Gateway (single provider, structured output)
        ↓
Zod Response Validation
        ↓
Candidate Normalization + Dedup
        ↓
Safety Engine V2 (deterministic, before ranking)
        ↓
Safety Filter (excluded candidates removed)
        ↓
Ranking Engine (evidence-grounded, no LLM consensus)
        ↓
Explanation Engine (Gemini, presentation only)
        ↓
Atomic Persistence (transactional)
        ↓
Audit Logging
        ↓
Standardized API Response
```

**Key architectural changes from current:**
1. Single LLM provider (Gemini) — remove OpenAI/Claude/orchestrator
2. Safety BEFORE ranking — not after
3. Dedicated service layer — business logic out of route handlers
4. Zod validation at every boundary
5. Context minimizer — strip PII before sending to Gemini
6. Prompt injection defense — structured prompt separation
7. Atomic persistence — single transaction for recommendation + candidates + evidence
8. Structured logging with request IDs
9. Rate limiting on expensive endpoints
10. Standardized API response format

---

## 16. Exact Files That Need Modification

### Phase 1 — Gemini-Only Migration
| File | Action |
|---|---|
| `services/llm/openai.ts` | Delete |
| `services/llm/claude.ts` | Delete |
| `services/llm/orchestrator.ts` | Delete or replace with single-provider gateway |
| `services/llm/base.ts` | Simplify — remove multi-provider abstractions |
| `services/llm/gemini.ts` | Refactor into `services/gemini/` module with client, schemas, prompts |
| `lib/config.ts` | Remove OpenAI/Claude config, add Gemini-specific config |
| `types/index.ts` | Remove `ProviderName`, `ProviderStatus`, `ProviderResult`, `ProviderBreakdown` multi-provider types |
| `app/api/v1/recommendations/route.ts` | Update to use single Gemini gateway |
| `app/api/v1/health/route.ts` | Remove multi-provider checks |
| `app/api/v1/model/info/route.ts` | Update for single provider |
| `app/(dashboard)/dashboard/page.tsx` | Remove multi-provider UI |
| `app/(dashboard)/patients/[id]/analyze/page.tsx` | Remove provider selection checkboxes |
| `app/(dashboard)/patients/[id]/results/page.tsx` | Remove provider comparison tab |
| `app/(dashboard)/system/page.tsx` | Update for single provider |
| `.env.example` | Remove OpenAI/Claude vars, add Gemini-only vars |
| `docs/architecture.md` | Update diagrams |

### Phase 2 — RLS/Security Fixes
| File | Action |
|---|---|
| New migration SQL | Drop erroneous `select_own_providers` policy on `recommendation_requests`; add missing UPDATE/DELETE policies on recommendation tables |
| `app/api/v1/patients/[id]/route.ts` | Add explicit ownership check |
| `app/api/v1/patients/[id]/history/route.ts` | Add patient ownership verification |
| `app/api/v1/history/patient/[id]/route.ts` | Add patient ownership verification |
| `app/api/v1/recommendations/route.ts` | Add patient ownership verification |
| `app/api/v1/safety/check/route.ts` | Add patient ownership verification |

### Phase 3 — Auth Hardening
| File | Action |
|---|---|
| `lib/api-auth.ts` | Add ownership verification helper |
| `app/api/v1/auth/login/route.ts` | Pass `req` to `getServerSupabase` for consistency |
| `app/api/v1/auth/signup/route.ts` | Same |

### Phase 4 — Zod Validation
| File | Action |
|---|---|
| New: `lib/validation/auth.ts` | Login/signup schemas |
| New: `lib/validation/patient.ts` | Patient create/update schemas |
| New: `lib/validation/history.ts` | Treatment history schemas |
| New: `lib/validation/recommendation.ts` | Recommendation request schema |
| All API route files | Replace ad-hoc validation with Zod |

### Phase 5 — Rate Limiting
| File | Action |
|---|---|
| New: `lib/rate-limit.ts` | Rate limiter implementation |
| All API route files | Apply rate limiting middleware |

### Phase 6 — Gemini Structured Output Gateway
| File | Action |
|---|---|
| New: `services/gemini/client.ts` | HTTP client with timeout, retry, error handling |
| New: `services/gemini/generate.ts` | Generation + Zod validation |
| New: `services/gemini/schemas.ts` | Zod schemas for Gemini output |
| New: `services/gemini/errors.ts` | Controlled error types |
| New: `services/gemini/prompts/system.ts` | System prompt with injection defense |
| New: `services/gemini/prompts/candidate-generation.ts` | Candidate generation prompt |
| New: `services/gemini/prompts/explanation.ts` | Explanation generation prompt |

### Phase 7 — Safety Engine V2
| File | Action |
|---|---|
| New: `services/safety/engine.ts` | Main safety engine |
| New: `services/safety/medication-identity.ts` | Drug normalization |
| New: `services/safety/allergy-check.ts` | Allergy checking |
| New: `services/safety/adverse-reaction-check.ts` | Prior reaction checking |
| New: `services/safety/interaction-check.ts` | Drug interaction checking |
| New: `services/safety/contraindication-check.ts` | Contraindication checking |
| New: `services/safety/types.ts` | Safety types |
| `services/safety-engine.ts` | Delete (replaced by `services/safety/`) |

### Phase 8 — RAG/Evidence Provenance
| File | Action |
|---|---|
| `services/evidence-retrieval.ts` | Add provenance fields to evidence records |
| New migration | Add columns to `recommendation_evidence` table |
| `types/index.ts` | Update `EvidenceItem` type |

### Phase 9 — Recommendation Service Refactor
| File | Action |
|---|---|
| New: `services/recommendation/recommendation-engine.ts` | Orchestrates the full pipeline |
| New: `services/recommendation/candidate-generator.ts` | Gemini candidate generation |
| New: `services/recommendation/ranking-engine.ts` | Ranking logic |
| New: `services/recommendation/explanation-engine.ts` | Explanation generation |
| `app/api/v1/recommendations/route.ts` | Slim down to validate → auth → call service → respond |

### Phase 10–18 — Tests, Eval, Observability, CI/CD, Docs
| File | Action |
|---|---|
| New: `tests/unit/**` | Unit tests for safety, ranking, validation, context |
| New: `tests/integration/**` | Integration tests for API routes |
| New: `tests/security/**` | RLS and authorization tests |
| New: `eval/**` | AI evaluation framework |
| New: `lib/logger.ts` | Structured logging |
| New: `.github/workflows/ci.yml` | CI pipeline |
| New: `.github/workflows/security.yml` | Security scanning |
| New: `docs/threat-model.md` | Threat model |
| New: `docs/security.md` | Security documentation |
| `README.md` | Update for Gemini-only architecture |
| `docs/architecture.md` | Update for new pipeline |

---

## 17. Phase-by-Phase Implementation Plan

| Phase | Scope | Estimated Changes | Stop Condition |
|---|---|---|---|
| 0 | Repository audit (this document) | Documentation only | Audit approved |
| 1 | Gemini-only migration | ~15 files modified/deleted, ~5 new files | Build passes, recommendations work with Gemini only |
| 2 | RLS hardening | 1 migration + 5 route files | RLS security tests pass |
| 3 | Auth/authorization hardening | 3 files modified, 1 new helper | Ownership checks verified |
| 4 | Zod validation | 4 new schemas, 8 route files updated | All endpoints reject invalid input |
| 5 | Rate limiting | 1 new module, 5+ routes updated | Rate limit headers returned |
| 6 | Gemini structured output gateway | 7 new files | Zod validates Gemini output |
| 7 | Safety Engine V2 | 7 new files, 1 deleted | Safety runs before ranking |
| 8 | RAG/evidence provenance | 1 migration, 2 files updated | Evidence has full provenance |
| 9 | Recommendation service refactor | 4 new files, 1 route slimmed | Route handler is thin |
| 10 | Ranking improvements | 1 file updated | LLM consensus removed from ranking |
| 11 | ML isolation | 1 file updated, eval notes | ML marked experimental, no ranking influence |
| 12 | Audit logging | 1 new module, routes updated | All requests logged with trace ID |
| 13–15 | Tests | ~20+ test files | All tests pass |
| 16 | AI evaluation suite | 4 new files/dirs | Eval runner executes cases |
| 17 | Observability | 1 new module | Metrics structured |
| 18 | CI/CD | 2 workflow files | CI passes on push |
| 19 | Threat model | 1 document | Complete |
| 20 | Deployment hardening | Config files | Production-ready |

---

## 18. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| RLS bypass leaks patient data | **Confirmed** | Critical — all users' data exposed | Phase 2: drop erroneous policy immediately |
| Prompt injection via patient fields | High | High — LLM could be manipulated | Phase 6: structured prompt separation |
| Gemini API cost abuse | High | Medium — unbounded API calls | Phase 5: rate limiting |
| Partial persistence failure | Medium | Medium — inconsistent state | Phase 9: atomic transactions |
| ML influences ranking without validation | Confirmed | Medium — unvalidated signal | Phase 11: remove ML from ranking |
| Safety engine too narrow | Confirmed | High — missing interactions/contraindications | Phase 7: Safety Engine V2 |
| Evidence fabrication | Medium | High — unsupported clinical claims | Phase 8: evidence-grounded generation |
| Error message information leakage | Confirmed | Medium — internal details exposed | Phase 9: structured error handling |
| Dependency vulnerabilities | Unknown | Variable | Phase 20: `npm audit` |

---

## Summary

The project is a functional prototype with a well-organized UI, working auth, and a complete recommendation pipeline. However, it has **one confirmed critical security vulnerability** (RLS bypass on `recommendation_requests`), **no input validation**, **no rate limiting**, **no prompt injection defense**, and **no tests**. The multi-LLM architecture adds unnecessary complexity when the target is Gemini-only. The safety engine is a reasonable starting point but is too narrow for production use. The evidence retrieval and ML components are explicitly synthetic and should not influence clinical recommendations without validation.

The recommended path is to proceed phase-by-phase as outlined above, starting with the RLS fix (Phase 2) as the most urgent security item, followed by the Gemini-only migration (Phase 1).
