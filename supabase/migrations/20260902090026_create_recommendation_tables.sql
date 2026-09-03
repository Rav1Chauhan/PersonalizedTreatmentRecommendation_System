/*
# Create recommendation tables

1. New Tables
- `recommendation_requests`: Logs each recommendation submission.
  - id (uuid PK)
  - patient_id (uuid FK -> patients, ON DELETE CASCADE)
  - user_id (uuid FK -> auth.users, defaults to auth.uid())
  - problem_text (text, not null)
  - model_version (text, not null)
  - created_at (timestamptz)

- `recommendation_candidates`: Ranked treatment candidates per request.
  - id (uuid PK)
  - request_id (uuid FK -> recommendation_requests, ON DELETE CASCADE)
  - treatment (text, not null)
  - rank (integer, not null)
  - final_score (numeric)
  - llm_support_score (numeric)
  - retrieval_score (numeric)
  - diagnosis_relevance_score (numeric)
  - patient_context_score (numeric)
  - evidence_quality_score (numeric)
  - ml_probability (numeric, nullable)
  - safety_status (text, not null)
  - review_required (boolean, default true)
  - reason (text)
  - considerations (text[], default '{}')
  - providers (text[], default '{}')
  - created_at (timestamptz)

- `recommendation_providers`: Per-provider execution tracking.
  - id (uuid PK)
  - request_id (uuid FK -> recommendation_requests, ON DELETE CASCADE)
  - provider (text, not null)
  - status (text, not null)
  - latency_ms (integer, nullable)
  - input_tokens (integer, nullable)
  - output_tokens (integer, nullable)
  - error_code (text, nullable)
  - candidates (text[], default '{}')
  - created_at (timestamptz)

- `recommendation_evidence`: Evidence sources linked to candidates.
  - id (uuid PK)
  - candidate_id (uuid FK -> recommendation_candidates, ON DELETE CASCADE)
  - source (text)
  - source_url (text, nullable)
  - title (text)
  - condition (text)
  - similarity (numeric)
  - evidence_quality (text)
  - created_at (timestamptz)

2. Indexes
- recommendation_requests_patient_id_idx
- recommendation_candidates_request_id_idx
- recommendation_providers_request_id_idx
- recommendation_evidence_candidate_id_idx

3. Security
- RLS enabled on all tables.
- All scoped through patients -> user_id ownership chain.
*/

CREATE TABLE IF NOT EXISTS recommendation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_text text NOT NULL,
  model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_requests_patient_id_idx ON recommendation_requests(patient_id);
CREATE INDEX IF NOT EXISTS recommendation_requests_user_id_idx ON recommendation_requests(user_id);

ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_requests" ON recommendation_requests;
CREATE POLICY "select_own_requests" ON recommendation_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_requests" ON recommendation_requests;
CREATE POLICY "insert_own_requests" ON recommendation_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_requests" ON recommendation_requests;
CREATE POLICY "delete_own_requests" ON recommendation_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS recommendation_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  treatment text NOT NULL,
  rank integer NOT NULL,
  final_score numeric,
  llm_support_score numeric,
  retrieval_score numeric,
  diagnosis_relevance_score numeric,
  patient_context_score numeric,
  evidence_quality_score numeric,
  ml_probability numeric,
  safety_status text NOT NULL,
  review_required boolean NOT NULL DEFAULT true,
  reason text,
  considerations text[] NOT NULL DEFAULT '{}',
  providers text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_candidates_request_id_idx ON recommendation_candidates(request_id);

ALTER TABLE recommendation_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_candidates" ON recommendation_candidates;
CREATE POLICY "select_own_candidates" ON recommendation_candidates FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM recommendation_requests WHERE recommendation_requests.id = recommendation_candidates.request_id AND recommendation_requests.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_candidates" ON recommendation_candidates;
CREATE POLICY "insert_own_candidates" ON recommendation_candidates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM recommendation_requests WHERE recommendation_requests.id = recommendation_candidates.request_id AND recommendation_requests.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS recommendation_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  candidates text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_providers_request_id_idx ON recommendation_providers(request_id);

ALTER TABLE recommendation_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_providers" ON recommendation_providers;
CREATE POLICY "select_own_providers" ON recommendation_requests FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "select_own_providers" ON recommendation_providers;
CREATE POLICY "select_own_providers" ON recommendation_providers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM recommendation_requests WHERE recommendation_requests.id = recommendation_providers.request_id AND recommendation_requests.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_providers" ON recommendation_providers;
CREATE POLICY "insert_own_providers" ON recommendation_providers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM recommendation_requests WHERE recommendation_requests.id = recommendation_providers.request_id AND recommendation_requests.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS recommendation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES recommendation_candidates(id) ON DELETE CASCADE,
  source text,
  source_url text,
  title text,
  condition text,
  similarity numeric,
  evidence_quality text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_evidence_candidate_id_idx ON recommendation_evidence(candidate_id);

ALTER TABLE recommendation_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_evidence" ON recommendation_evidence;
CREATE POLICY "select_own_evidence" ON recommendation_evidence FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM recommendation_candidates
      JOIN recommendation_requests ON recommendation_requests.id = recommendation_candidates.request_id
      WHERE recommendation_candidates.id = recommendation_evidence.candidate_id
      AND recommendation_requests.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_evidence" ON recommendation_evidence;
CREATE POLICY "insert_own_evidence" ON recommendation_evidence FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM recommendation_candidates
      JOIN recommendation_requests ON recommendation_requests.id = recommendation_candidates.request_id
      WHERE recommendation_candidates.id = recommendation_evidence.candidate_id
      AND recommendation_requests.user_id = auth.uid()
    )
  );
