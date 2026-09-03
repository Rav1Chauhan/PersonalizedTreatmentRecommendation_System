import { requireAuth, getServerSupabase } from '@/lib/api-auth';
import { buildPatientContext } from '@/services/context-builder';
import { LLMOrchestrator } from '@/services/llm/orchestrator';
import { checkSafety } from '@/services/safety-engine';
import { rankCandidates } from '@/services/ranking-service';
import { getMLModel } from '@/services/patient-ml';
import { MODEL_VERSION, MEDICAL_DISCLAIMER, MAX_INPUT_CHARS } from '@/lib/config';
import type {
  ProviderName,
  ProviderStatus,
  RecommendationCandidate,
  ExcludedCandidate,
  RecommendationResponse,
  ProviderBreakdown,
} from '@/types';

export async function POST(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.userId === null) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { patientId, problem, providers, topK } = body;

    if (!patientId || !problem) {
      return Response.json({ error: 'Patient ID and problem are required' }, { status: 400 });
    }

    if (problem.length > MAX_INPUT_CHARS) {
      return Response.json({ error: `Problem text exceeds maximum length of ${MAX_INPUT_CHARS} characters` }, { status: 400 });
    }

    const supabase = getServerSupabase(req);

    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (patientError || !patientData) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    const { data: historyData } = await supabase
      .from('patient_treatment_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    const history = (historyData || []).map((h: Record<string, unknown>) => ({
      treatmentName: h.treatment_name as string,
      outcome: (h.outcome as string) || null,
      adverseReaction: (h.adverse_reaction as string) || null,
      startedAt: (h.started_at as string) || null,
      endedAt: (h.ended_at as string) || null,
      notes: (h.notes as string) || null,
    }));

    const context = buildPatientContext(
      problem,
      {
        age: patientData.age,
        gender: patientData.gender,
        weightKg: patientData.weight_kg !== null ? Number(patientData.weight_kg) : null,
        heightCm: patientData.height_cm !== null ? Number(patientData.height_cm) : null,
        bmi: patientData.bmi !== null ? Number(patientData.bmi) : null,
        diagnosis: patientData.diagnosis,
        symptoms: patientData.symptoms || [],
        allergies: patientData.allergies || [],
        chronicConditions: patientData.chronic_conditions || [],
        geneticDisorders: patientData.genetic_disorders || [],
      },
      history
    );

    const orchestrator = new LLMOrchestrator();
    const requestedProviders = providers as ProviderName[] | undefined;

    const { results, providerStatus, deduplicatedCandidates } = await orchestrator.execute(
      context,
      requestedProviders
    );

    const successfulResults = results.filter((r) => r.status === 'success');
    if (successfulResults.length === 0) {
      return Response.json({
        error: 'All AI providers failed or returned no candidates. Please try again.',
        providerStatus,
      }, { status: 503 });
    }

    const rankedCandidates = rankCandidates(
      deduplicatedCandidates,
      context,
      undefined,
      topK || 5
    );

    const recommendations: RecommendationCandidate[] = [];
    const excludedCandidates: ExcludedCandidate[] = [];

    for (const candidate of rankedCandidates) {
      const safetyResult = checkSafety(candidate.treatment, context);

      if (safetyResult.status === 'excluded') {
        excludedCandidates.push({
          treatment: candidate.treatment,
          reason: safetyResult.reasons.join('; '),
          providers: candidate.providers,
        });
        continue;
      }

      const reviewRequired = safetyResult.status !== 'known';

      recommendations.push({
        rank: 0,
        treatment: candidate.treatment,
        scores: candidate.scores,
        providers: candidate.providers,
        safety: safetyResult,
        evidence: candidate.evidence,
        reason: candidate.reason,
        considerations: candidate.allConsiderations,
        reviewRequired,
      });
    }

    recommendations.sort((a, b) => b.scores.final - a.scores.final);
    recommendations.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    const providerBreakdown: ProviderBreakdown[] = results.map((r) => ({
      provider: r.provider,
      status: r.status,
      candidates: r.candidates.map((c) => c.treatment),
    }));

    const { data: requestRecord, error: requestError } = await supabase
      .from('recommendation_requests')
      .insert({
        patient_id: patientId,
        problem_text: problem,
        model_version: MODEL_VERSION,
      })
      .select()
      .single();

    const requestId = requestRecord?.id || 'unknown';

    if (requestRecord && !requestError) {
      for (const rec of recommendations) {
        const { data: candRecord } = await supabase
          .from('recommendation_candidates')
          .insert({
            request_id: requestId,
            treatment: rec.treatment,
            rank: rec.rank,
            final_score: rec.scores.final,
            llm_support_score: rec.scores.llmSupport,
            retrieval_score: rec.scores.retrieval,
            diagnosis_relevance_score: rec.scores.diagnosisRelevance,
            patient_context_score: rec.scores.patientContext,
            evidence_quality_score: rec.scores.evidenceQuality,
            ml_probability: rec.scores.mlProbability,
            safety_status: rec.safety.status,
            review_required: rec.reviewRequired,
            reason: rec.reason,
            considerations: rec.considerations,
            providers: rec.providers,
          })
          .select()
          .single();

        if (candRecord) {
          for (const evidence of rec.evidence) {
            await supabase.from('recommendation_evidence').insert({
              candidate_id: candRecord.id,
              source: evidence.source,
              source_url: evidence.sourceUrl,
              title: evidence.title,
              condition: evidence.condition,
              similarity: evidence.similarity,
              evidence_quality: evidence.evidenceQuality,
            });
          }
        }
      }

      for (const result of results) {
        await supabase.from('recommendation_providers').insert({
          request_id: requestId,
          provider: result.provider,
          status: result.status,
          latency_ms: result.latencyMs,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          error_code: result.errorCode,
          candidates: result.candidates.map((c) => c.treatment),
        });
      }
    }

    const fullProviderStatus = {} as Record<ProviderName, ProviderStatus>;
    for (const result of results) {
      fullProviderStatus[result.provider] = result.status;
    }

    const response: RecommendationResponse = {
      requestId,
      patient: { id: patientId },
      problem,
      providerStatus: fullProviderStatus,
      recommendations,
      excludedCandidates,
      providerBreakdown,
      disclaimer: MEDICAL_DISCLAIMER,
      modelVersion: MODEL_VERSION,
    };

    return Response.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Recommendation API error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
