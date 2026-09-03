export type UserRole = 'admin' | 'clinician' | 'researcher' | 'patient';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  diagnosis: string | null;
  symptoms: string[];
  allergies: string[];
  chronicConditions: string[];
  geneticDisorders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentHistoryEntry {
  id: string;
  patientId: string;
  treatmentName: string;
  outcome: string | null;
  adverseReaction: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export type ProviderName = 'gemini' | 'openai' | 'claude';
export type ProviderStatus = 'success' | 'timeout' | 'error' | 'disabled';

export interface ProviderResult {
  provider: ProviderName;
  status: ProviderStatus;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  errorCode: string | null;
  candidates: RawCandidate[];
}

export interface RawCandidate {
  treatment: string;
  reasoningSummary: string;
  considerations: string[];
  evidenceNeeded: string[];
}

export type SafetyStatus = 'known' | 'review_required' | 'excluded' | 'unknown';

export interface SafetyCheckResult {
  status: SafetyStatus;
  reasons: string[];
  warnings: string[];
  source: string | null;
}

export interface EvidenceItem {
  source: string;
  sourceUrl: string | null;
  title: string;
  condition: string;
  similarity: number;
  evidenceQuality: string;
}

export interface CandidateScores {
  final: number;
  llmSupport: number;
  retrieval: number;
  diagnosisRelevance: number;
  patientContext: number;
  evidenceQuality: number;
  mlProbability: number | null;
}

export interface RecommendationCandidate {
  rank: number;
  treatment: string;
  scores: CandidateScores;
  providers: ProviderName[];
  safety: SafetyCheckResult;
  evidence: EvidenceItem[];
  reason: string;
  considerations: string[];
  reviewRequired: boolean;
}

export interface ExcludedCandidate {
  treatment: string;
  reason: string;
  providers: ProviderName[];
}

export interface RecommendationResponse {
  requestId: string;
  patient: { id: string };
  problem: string;
  providerStatus: Record<ProviderName, ProviderStatus>;
  recommendations: RecommendationCandidate[];
  excludedCandidates: ExcludedCandidate[];
  providerBreakdown: ProviderBreakdown[];
  disclaimer: string;
  modelVersion: string;
}

export interface ProviderBreakdown {
  provider: ProviderName;
  status: ProviderStatus;
  candidates: string[];
}

export interface RecommendationRequest {
  patientId: string;
  problem: string;
  providers?: ProviderName[];
  topK?: number;
}

export interface PatientContext {
  problem: string;
  age: number;
  gender: string;
  bmi: number | null;
  diagnosis: string | null;
  symptoms: string[];
  allergies: string[];
  chronicConditions: string[];
  geneticDisorders: string[];
  previousTreatments: TreatmentHistoryEntry[];
}

export interface RankingWeights {
  llm: number;
  retrieval: number;
  diagnosis: number;
  context: number;
  evidence: number;
  ml: number;
}

export interface ModelInfo {
  embeddingModel: string;
  embeddingDimension: number;
  retrievalModel: string;
  patientMlModel: string;
  modelVersion: string;
  enabledProviders: ProviderName[];
}

export interface HealthStatus {
  application: 'healthy' | 'degraded' | 'unhealthy';
  database: 'connected' | 'disconnected';
  mlModels: 'loaded' | 'not_loaded';
  providers: Record<ProviderName, boolean>;
  timestamp: string;
}
