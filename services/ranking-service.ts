import type {
  CandidateScores,
  PatientContext,
  RankingWeights,
  EvidenceItem,
} from '@/types';
import { RANKING_WEIGHTS } from '@/lib/config';
import { computeDiagnosisRelevance, computePatientContextScore, generateReason } from './context-builder';
import { retrieveEvidence, getEvidenceQualityScore, getRetrievalScore } from './evidence-retrieval';
import { getMLModel } from './patient-ml';
import type { DeduplicatedCandidate as OrchCandidate } from '@/services/llm/orchestrator';

export interface RankedCandidate extends OrchCandidate {
  scores: CandidateScores;
  evidence: EvidenceItem[];
  reason: string;
  diagnosisRelevanceScore: number;
  patientContextScore: number;
  evidenceQualityScore: number;
  retrievalScore: number;
  mlProbability: number | null;
  llmSupportScore: number;
}

export function rankCandidates(
  candidates: OrchCandidate[],
  context: PatientContext,
  weights: RankingWeights = RANKING_WEIGHTS,
  topK: number = 5
): RankedCandidate[] {
  const mlModel = getMLModel();

  const scored = candidates.map((candidate) => {
    const llmSupportScore = candidate.providerSupportRatio;

    const evidence = retrieveEvidence(candidate.treatment, context, 5);
    const retrievalScore = getRetrievalScore(candidate.treatment, context);
    const evidenceQualityScore = getEvidenceQualityScore(evidence);

    const primaryCondition = evidence.length > 0 ? evidence[0].condition : null;
    const diagnosisRelevanceScore = computeDiagnosisRelevance(
      candidate.treatment,
      context,
      primaryCondition
    );

    const patientContextScore = computePatientContextScore(candidate, context);

    const mlProbability = mlModel.predictProbability(candidate.treatment, context);

    const mlContribution = mlProbability !== null ? mlProbability : 0;
    const finalScore =
      llmSupportScore * weights.llm +
      retrievalScore * weights.retrieval +
      diagnosisRelevanceScore * weights.diagnosis +
      patientContextScore * weights.context +
      evidenceQualityScore * weights.evidence +
      mlContribution * weights.ml;

    const scores: CandidateScores = {
      final: Math.round(finalScore * 100) / 100,
      llmSupport: Math.round(llmSupportScore * 100) / 100,
      retrieval: Math.round(retrievalScore * 100) / 100,
      diagnosisRelevance: Math.round(diagnosisRelevanceScore * 100) / 100,
      patientContext: Math.round(patientContextScore * 100) / 100,
      evidenceQuality: Math.round(evidenceQualityScore * 100) / 100,
      mlProbability: mlProbability !== null ? Math.round(mlProbability * 100) / 100 : null,
    };

    const reason = generateReason(candidate, scores, context);

    return {
      ...candidate,
      scores,
      evidence,
      reason,
      diagnosisRelevanceScore,
      patientContextScore,
      evidenceQualityScore,
      retrievalScore,
      mlProbability,
      llmSupportScore,
    };
  });

  scored.sort((a, b) => b.scores.final - a.scores.final);

  return scored.slice(0, topK).map((c, idx) => ({
    ...c,
    rank: idx + 1,
  }));
}
