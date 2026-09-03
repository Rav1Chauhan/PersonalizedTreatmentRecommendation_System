/*
# Create patients and patient_treatment_history tables

1. New Tables
- `patients`: Stores patient profiles with demographic and medical data.
  - id (uuid PK)
  - user_id (uuid FK -> auth.users, defaults to auth.uid())
  - name (text, not null)
  - age (integer, not null)
  - gender (text, not null, check constraint: male/female/other)
  - weight_kg (numeric, nullable)
  - height_cm (numeric, nullable)
  - bmi (numeric, nullable)
  - diagnosis (text, nullable)
  - symptoms (text[], default '{}')
  - allergies (text[], default '{}')
  - chronic_conditions (text[], default '{}')
  - genetic_disorders (text[], default '{}')
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())

- `patient_treatment_history`: Stores previous treatments per patient.
  - id (uuid PK)
  - patient_id (uuid FK -> patients, ON DELETE CASCADE)
  - treatment_name (text, not null)
  - outcome (text, nullable)
  - adverse_reaction (text, nullable)
  - started_at (date, nullable)
  - ended_at (date, nullable)
  - notes (text, nullable)
  - created_at (timestamptz, default now())

2. Indexes
- patients_user_id_idx on patients(user_id)
- patient_treatment_history_patient_id_idx on patient_treatment_history(patient_id)

3. Security
- RLS enabled on both tables.
- patients: owner-scoped CRUD via auth.uid() = user_id
- patient_treatment_history: scoped through parent patients table ownership check
*/

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer NOT NULL CHECK (age >= 0 AND age <= 150),
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  weight_kg numeric CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 1000)),
  height_cm numeric CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm < 300)),
  bmi numeric CHECK (bmi IS NULL OR (bmi > 0 AND bmi < 100)),
  diagnosis text,
  symptoms text[] NOT NULL DEFAULT '{}',
  allergies text[] NOT NULL DEFAULT '{}',
  chronic_conditions text[] NOT NULL DEFAULT '{}',
  genetic_disorders text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patients_user_id_idx ON patients(user_id);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patients" ON patients;
CREATE POLICY "select_own_patients" ON patients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_patients" ON patients;
CREATE POLICY "insert_own_patients" ON patients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_patients" ON patients;
CREATE POLICY "update_own_patients" ON patients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_patients" ON patients;
CREATE POLICY "delete_own_patients" ON patients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS patient_treatment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_name text NOT NULL,
  outcome text,
  adverse_reaction text,
  started_at date,
  ended_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_treatment_history_patient_id_idx ON patient_treatment_history(patient_id);

ALTER TABLE patient_treatment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_treatment_history" ON patient_treatment_history;
CREATE POLICY "select_own_treatment_history" ON patient_treatment_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_treatment_history.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_treatment_history" ON patient_treatment_history;
CREATE POLICY "insert_own_treatment_history" ON patient_treatment_history FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_treatment_history.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_treatment_history" ON patient_treatment_history;
CREATE POLICY "update_own_treatment_history" ON patient_treatment_history FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_treatment_history.patient_id AND patients.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_treatment_history.patient_id AND patients.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_treatment_history" ON patient_treatment_history;
CREATE POLICY "delete_own_treatment_history" ON patient_treatment_history FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients WHERE patients.id = patient_treatment_history.patient_id AND patients.user_id = auth.uid())
  );
