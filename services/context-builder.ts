import type { PatientContext } from '@/types';
import type { DeduplicatedCandidate } from '@/services/llm/orchestrator';

export function buildPatientContext(
  problem: string,
  patient: {
    age: number;
    gender: string;
    weightKg: number | null;
    heightCm: number | null;
    bmi: number | null;
    diagnosis: string | null;
    symptoms: string[];
    allergies: string[];
    chronicConditions: string[];
    geneticDisorders: string[];
  },
  history: Array<{
    treatmentName: string;
    outcome: string | null;
    adverseReaction: string | null;
    startedAt: string | null;
    endedAt: string | null;
    notes: string | null;
  }>
): PatientContext {
  return {
    problem,
    age: patient.age,
    gender: patient.gender,
    bmi: patient.bmi,
    diagnosis: patient.diagnosis,
    symptoms: patient.symptoms || [],
    allergies: patient.allergies || [],
    chronicConditions: patient.chronicConditions || [],
    geneticDisorders: patient.geneticDisorders || [],
    previousTreatments: history.map((h) => ({
      id: '',
      patientId: '',
      treatmentName: h.treatmentName,
      outcome: h.outcome,
      adverseReaction: h.adverseReaction,
      startedAt: h.startedAt,
      endedAt: h.endedAt,
      notes: h.notes,
      createdAt: '',
    })),
  };
}

export function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function computeDiagnosisRelevance(
  treatmentName: string,
  context: PatientContext,
  evidenceCondition: string | null
): number {
  if (!context.diagnosis && !evidenceCondition) return 0.3;

  const diagnosis = (context.diagnosis || '').toLowerCase();
  const condition = (evidenceCondition || '').toLowerCase();
  const treatment = treatmentName.toLowerCase();

  if (diagnosis && condition) {
    if (diagnosis === condition || condition.includes(diagnosis) || diagnosis.includes(condition)) {
      return 0.9;
    }
    const sharedWords = diagnosis.split(/\s+/).filter((w) => condition.includes(w) && w.length > 2);
    if (sharedWords.length > 0) return 0.6;
  }

  if (context.symptoms.length > 0) {
    const symptomMatch = context.symptoms.some((s) => {
      const symptom = s.toLowerCase();
      return treatment.includes(symptom) || symptom.includes(treatment.split(/\s+/)[0]);
    });
    if (symptomMatch) return 0.5;
  }

  if (diagnosis && treatment.includes(diagnosis.split(/\s+/)[0])) {
    return 0.4;
  }

  return 0.2;
}

export function computePatientContextScore(
  candidate: DeduplicatedCandidate,
  context: PatientContext
): number {
  let score = 0;

  const allContextText = [
    context.diagnosis || '',
    ...context.symptoms,
    ...context.chronicConditions,
    ...context.geneticDisorders,
  ]
    .join(' ')
    .toLowerCase();

  const treatmentLower = candidate.treatment.toLowerCase();

  for (const symptom of context.symptoms) {
    if (treatmentLower.includes(symptom.toLowerCase()) || symptom.toLowerCase().includes(treatmentLower)) {
      score += 0.2;
    }
  }

  for (const condition of context.chronicConditions) {
    if (treatmentLower.includes(condition.toLowerCase())) {
      score += 0.15;
    }
  }

  for (const prev of context.previousTreatments) {
    const prevLower = prev.treatmentName.toLowerCase();
    if (treatmentLower.includes(prevLower) || prevLower.includes(treatmentLower)) {
      if (prev.outcome && prev.outcome.toLowerCase().includes('success')) {
        score += 0.1;
      } else if (prev.outcome && prev.outcome.toLowerCase().includes('fail')) {
        score -= 0.15;
      }
      if (prev.adverseReaction && prev.adverseReaction.toLowerCase() !== 'none') {
        score -= 0.2;
      }
    }
  }

  if (context.age > 60) {
    if (treatmentLower.includes('exercise') || treatmentLower.includes('lifestyle')) {
      score += 0.05;
    }
  }

  if (context.bmi !== null && context.bmi > 30) {
    if (treatmentLower.includes('lifestyle') || treatmentLower.includes('exercise') || treatmentLower.includes('metformin')) {
      score += 0.05;
    }
  }

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

export function generateReason(
  candidate: DeduplicatedCandidate,
  scores: {
    llmSupport: number;
    retrieval: number;
    diagnosisRelevance: number;
    patientContext: number;
    evidenceQuality: number;
    mlProbability: number | null;
  },
  context: PatientContext
): string {
  const parts: string[] = [];

  if (candidate.providerCount === 3) {
    parts.push('Recommended by all three AI providers');
  } else if (candidate.providerCount === 2) {
    parts.push(`Supported by ${candidate.providers.join(' and ')}`);
  } else {
    parts.push(`Suggested by ${candidate.providers[0]}`);
  }

  if (scores.diagnosisRelevance > 0.7 && context.diagnosis) {
    parts.push(`highly relevant to the patient's diagnosis of ${context.diagnosis}`);
  } else if (scores.diagnosisRelevance > 0.5) {
    parts.push('moderately relevant to the patient\'s condition');
  }

  if (scores.evidenceQuality > 0.6) {
    parts.push('supported by available evidence');
  } else if (scores.evidenceQuality > 0.3) {
    parts.push('has partial evidence support');
  } else {
    parts.push('has limited evidence in the current dataset');
  }

  if (scores.patientContext > 0.4) {
    parts.push('aligns well with the patient\'s personal medical history');
  }

  if (scores.mlProbability !== null && scores.mlProbability > 0.5) {
    parts.push('the patient-history ML model assigns a favorable probability');
  } else if (scores.mlProbability === null) {
    parts.push('the ML model has no prior data for this treatment');
  }

  if (candidate.reasoningSummaries.length > 0) {
    parts.push(`Provider reasoning: ${candidate.reasoningSummaries[0]}`);
  }

  return parts.join(', ') + '.';
}
