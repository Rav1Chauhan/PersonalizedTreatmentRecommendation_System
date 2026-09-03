import type { ProviderResult, RawCandidate, ProviderName, PatientContext } from '@/types';
import { LLM_TIMEOUT_MS, MAX_OUTPUT_TOKENS } from '@/lib/config';

export interface LLMProvider {
  name: ProviderName;
  execute(context: PatientContext): Promise<ProviderResult>;
}

export const SYSTEM_PROMPT = `You are a clinical decision-support assistant for educational and research purposes. You are NOT a doctor and do not diagnose or prescribe.

Given a patient's current problem and medical history, suggest candidate treatment options. For each candidate:
1. treatment: The name of the treatment or intervention
2. reasoning_summary: A brief explanation of why this candidate is relevant
3. considerations: Important factors to evaluate (list of strings)
4. evidence_needed: What clinical evidence should be reviewed (list of strings)

Rules:
- Never state a definitive diagnosis
- Never recommend a specific dosage
- If information is insufficient, say so honestly
- Consider the patient's allergies, chronic conditions, and previous treatment outcomes
- Output valid JSON only, no markdown formatting

Output format:
{
  "candidates": [
    {
      "treatment": "name",
      "reasoning_summary": "short explanation",
      "considerations": ["factor1", "factor2"],
      "evidence_needed": ["evidence1", "evidence2"]
    }
  ]
}`;

export function buildUserPrompt(context: PatientContext): string {
  const parts: string[] = [
    `Current Problem: ${context.problem}`,
    `Age: ${context.age}`,
    `Gender: ${context.gender}`,
  ];

  if (context.bmi !== null) {
    parts.push(`BMI: ${context.bmi.toFixed(1)}`);
  }
  if (context.diagnosis) {
    parts.push(`Known Diagnosis: ${context.diagnosis}`);
  }
  if (context.symptoms.length > 0) {
    parts.push(`Symptoms: ${context.symptoms.join(', ')}`);
  }
  if (context.allergies.length > 0) {
    parts.push(`Allergies: ${context.allergies.join(', ')}`);
  }
  if (context.chronicConditions.length > 0) {
    parts.push(`Chronic Conditions: ${context.chronicConditions.join(', ')}`);
  }
  if (context.geneticDisorders.length > 0) {
    parts.push(`Genetic Disorders: ${context.geneticDisorders.join(', ')}`);
  }
  if (context.previousTreatments.length > 0) {
    const treatmentLines = context.previousTreatments.map(
      (t) =>
        `  - ${t.treatmentName} (outcome: ${t.outcome || 'unknown'}${t.adverseReaction ? `, adverse reaction: ${t.adverseReaction}` : ''})`
    );
    parts.push(`Previous Treatments:\n${treatmentLines.join('\n')}`);
  }

  parts.push(`Provide up to 5 candidate treatment options as JSON.`);

  return parts.join('\n');
}

export function parseLLMResponse(rawText: string): RawCandidate[] {
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
      return [];
    }
    return parsed.candidates
      .filter((c: unknown): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c: Record<string, unknown>) => ({
        treatment: String(c.treatment || '').trim(),
        reasoningSummary: String(c.reasoning_summary || c.reasoningSummary || '').trim(),
        considerations: Array.isArray(c.considerations)
          ? c.considerations.map(String)
          : [],
        evidenceNeeded: Array.isArray(c.evidence_needed)
          ? c.evidence_needed.map(String)
          : [],
      }))
      .filter((c: RawCandidate) => c.treatment.length > 0);
  } catch {
    return [];
  }
}

export function makeTimeout(): AbortSignal {
  return AbortSignal.timeout(LLM_TIMEOUT_MS);
}

export function emptyProviderResult(provider: ProviderName): ProviderResult {
  return {
    provider,
    status: 'error',
    latencyMs: null,
    inputTokens: null,
    outputTokens: null,
    errorCode: 'NO_RESPONSE',
    candidates: [],
  };
}

export { MAX_OUTPUT_TOKENS };
