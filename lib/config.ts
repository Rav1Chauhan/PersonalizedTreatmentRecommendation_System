import type { RankingWeights } from '@/types';

function getWeight(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
}

export const RANKING_WEIGHTS: RankingWeights = {
  llm: getWeight('LLM_WEIGHT', 0.25),
  retrieval: getWeight('RETRIEVAL_WEIGHT', 0.20),
  diagnosis: getWeight('DIAGNOSIS_WEIGHT', 0.20),
  context: getWeight('CONTEXT_WEIGHT', 0.15),
  evidence: getWeight('EVIDENCE_WEIGHT', 0.10),
  ml: getWeight('ML_WEIGHT', 0.10),
};

export const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
export const MAX_INPUT_CHARS = parseInt(process.env.MAX_INPUT_CHARS || '5000', 10);
export const MAX_OUTPUT_TOKENS = parseInt(process.env.MAX_OUTPUT_TOKENS || '2048', 10);
export const MODEL_VERSION = process.env.MODEL_VERSION || '1.0.0';

export function isProviderEnabled(provider: string): boolean {
  const key = `ENABLE_${provider.toUpperCase()}`;
  const val = process.env[key];
  if (val === undefined) return true;
  return val === 'true';
}

export function getEnabledProviders(): string[] {
  const providers: string[] = [];
  if (isProviderEnabled('gemini')) providers.push('gemini');
  if (isProviderEnabled('openai')) providers.push('openai');
  if (isProviderEnabled('claude')) providers.push('claude');
  return providers;
}

export const MEDICAL_DISCLAIMER =
  'Educational clinical decision-support output. It does not diagnose conditions or prescribe treatment. Candidate treatment options require review by a qualified healthcare professional.';
