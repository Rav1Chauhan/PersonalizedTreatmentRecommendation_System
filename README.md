# Personalized Treatment Recommendation System

## Project Overview

A clinical decision-support web application that combines patient history with multi-LLM analysis to produce candidate treatment options. A patient (or clinician) describes a health problem in natural language, and the system queries **Google Gemini**, **OpenAI**, and **Anthropic Claude** in parallel, then aggregates, deduplicates, retrieves evidence, applies safety constraints, and ranks the results with explainable scoring.

## Problem Statement

Treatment recommendations are often made without fully considering a patient's complete history — prior treatments, outcomes, adverse reactions, allergies, chronic conditions, and genetic factors. This system addresses that gap by:

1. Consolidating the full patient context
2. Querying multiple AI providers for diverse perspectives
3. Applying evidence retrieval (RAG) for grounding
4. Enforcing safety constraints (allergy exclusion)
5. Producing explainable, ranked candidate treatments

## Medical Disclaimer

> **This system provides educational clinical decision-support output. It does not diagnose conditions or prescribe treatment. Candidate treatment options require review by a qualified healthcare professional.**

This application is:
- NOT a doctor
- NOT a diagnostic system
- NOT an autonomous prescribing system
- NOT a replacement for a clinician
- NOT a medical emergency service

## System Architecture

See [docs/architecture.md](docs/architecture.md) for full architecture diagrams including:
- System architecture diagram
- LLM orchestration sequence diagram
- Recommendation pipeline flowchart
- Database entity-relationship diagram
- Request lifecycle diagram

## Multi-LLM Architecture

The system queries three AI providers in parallel using `Promise.all`:

```
Patient Problem + History
       ↓
Gemini ────────┐
OpenAI ────────┼──→ Normalizer → Deduplication → Ranking
Claude ────────┘
```

- All enabled providers execute concurrently (never sequential unless only one is enabled)
- Provider failures are recorded but do not block the pipeline
- If all providers fail, a controlled 503 error is returned
- Provider status (success/timeout/error) is always shown to the user

## Key Features

### Patient History Personalization
- Age, gender, BMI, diagnosis, symptoms, allergies, chronic conditions, genetic disorders
- Previous treatment history with outcomes and adverse reactions
- Context-aware ranking — different patients with the same diagnosis can get different rankings

### RAG / Evidence Retrieval
- TF-IDF retrieval for keyword-based matching
- Semantic similarity using embedding-based cosine similarity
- Evidence quality scoring based on condition match, text similarity, and source reliability

### Patient-History ML
- Experimental logistic regression classifier using patient features
- Predicts treatment probability based on historical patterns
- **Does not establish clinical validity** — it is an experimental personalization signal

### Safety Engine
- Allergy exclusion (hard constraint — overrides all scores)
- Drug alias normalization
- Unknown safety information → `review_required` (never assumed safe)
- Safety status: `known`, `review_required`, `excluded`, `unknown`

### Hybrid Ranking
Configurable weighted scoring combining:
- LLM provider support
- Retrieval relevance
- Diagnosis relevance
- Patient context match
- Evidence quality
- ML probability

Safety exclusion is a **hard constraint**, not a weighted feature.

## Database

PostgreSQL (Supabase) with the following tables:
- `patients` — patient profiles with medical history fields
- `patient_treatment_history` — previous treatments, outcomes, adverse reactions
- `recommendation_requests` — logged problem submissions
- `recommendation_candidates` — ranked treatment candidates with scores
- `recommendation_providers` — per-provider status tracking
- `recommendation_evidence` — evidence sources linked to candidates

All tables use Row-Level Security (RLS) with ownership-based policies.

## API

All endpoints are under `/api/v1/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/signup` | Account registration |
| POST | `/api/v1/patients` | Create patient |
| GET | `/api/v1/patients` | List patients |
| GET | `/api/v1/patients/[id]` | Get patient detail |
| PUT | `/api/v1/patients/[id]` | Update patient |
| DELETE | `/api/v1/patients/[id]` | Delete patient |
| POST | `/api/v1/patients/[id]/history` | Add treatment history |
| GET | `/api/v1/patients/[id]/history` | Get treatment history |
| POST | `/api/v1/recommendations` | Generate recommendations |
| GET | `/api/v1/recommendations/[id]` | Get recommendation detail |
| GET | `/api/v1/history/patient/[id]` | Patient recommendation history |
| POST | `/api/v1/safety/check` | Safety check for a treatment |
| GET | `/api/v1/health` | System health check |
| GET | `/api/v1/model/info` | Model and provider info |

## Frontend

- **Login/Signup** — email/password authentication
- **Dashboard** — patient overview, recent requests, provider status, system status
- **Patient Management** — create, view, edit, delete patients with full medical profile
- **Patient History** — add and view previous treatments, outcomes, adverse reactions
- **Problem Input** — large natural-language textarea for describing symptoms
- **AI Analysis** — live progress showing each pipeline step and provider status
- **Recommendation Results** — ranked candidates with full score breakdown, safety status, evidence
- **Provider Comparison** — side-by-side view of what each LLM suggested
- **Recommendation History** — past requests with dates, problems, top candidates

## Installation

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your API keys to .env.local
# GEMINI_API_KEY=...
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...
```

### Running Locally

The development server starts automatically. Open your browser to the displayed URL.

## Environment Variables

See [`.env.example`](.env.example) for all required variables. Key variables:

- `GEMINI_API_KEY` — Google Gemini API key
- `OPENAI_API_KEY` — OpenAI API key
- `ANTHROPIC_API_KEY` — Anthropic Claude API key
- `ENABLE_GEMINI`, `ENABLE_OPENAI`, `ENABLE_CLAUDE` — Toggle individual providers
- `JWT_SECRET` — JWT signing secret (used by Supabase Auth)

Never commit real API keys. API keys stay server-side and are never exposed to the browser.

## Security

- JWT authentication via Supabase Auth
- Row-Level Security on all database tables
- Password hashing (handled by Supabase Auth)
- CORS configuration
- Input validation on all API routes
- API keys never exposed to the client
- Audit logging of recommendation requests
- Rate limiting on LLM-calling endpoints

## Limitations

### Medical Limitations
- This is an educational/research tool, not a medical device
- Recommendations require qualified clinician review
- The system does not diagnose conditions
- The system does not prescribe treatment
- LLM consensus does not establish clinical validity
- ML model performance does not establish clinical validity

### Technical Limitations
- LLM providers may return inaccurate or hallucinated information
- Evidence retrieval is limited to available/loaded datasets
- Safety checks are based on known allergies and aliases, not a comprehensive drug database
- Provider latency and cost depend on external API usage

### Dataset Limitations
- Uses synthetic demo data for demonstration
- Evidence retrieval uses publicly available, appropriately licensed datasets
- No real private patient information is used
- Dataset coverage is limited and may not represent all conditions or treatments

## Future Improvements

- Integration with comprehensive drug interaction databases
- Real-time evidence retrieval from medical literature APIs
- Fine-tuned ML models on larger validated datasets
- Clinician feedback loop for ranking improvement
- FHIR/HL7 interoperability for EHR integration
- Multi-language support
- Mobile-responsive native app
