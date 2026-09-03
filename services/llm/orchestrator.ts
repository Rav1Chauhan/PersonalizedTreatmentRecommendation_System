import type {
  ProviderResult,
  ProviderName,
  PatientContext,
  RawCandidate,
} from '@/types';
import { LLMProvider } from './base';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { isProviderEnabled } from '@/lib/config';

export interface DeduplicatedCandidate {
  treatment: string;
  reasoningSummaries: string[];
  allConsiderations: string[];
  allEvidenceNeeded: string[];
  providers: ProviderName[];
  providerSupportRatio: number;
  providerCount: number;
}

export class LLMOrchestrator {
  private providers: Map<ProviderName, LLMProvider>;

  constructor() {
    this.providers = new Map();
    if (isProviderEnabled('gemini')) {
      this.providers.set('gemini', new GeminiProvider());
    }
    if (isProviderEnabled('openai')) {
      this.providers.set('openai', new OpenAIProvider());
    }
    if (isProviderEnabled('claude')) {
      this.providers.set('claude', new ClaudeProvider());
    }
  }

  getEnabledProviders(): ProviderName[] {
    return Array.from(this.providers.keys());
  }

  async execute(
    context: PatientContext,
    requestedProviders?: ProviderName[]
  ): Promise<{
    results: ProviderResult[];
    providerStatus: Record<ProviderName, ProviderStatus>;
    deduplicatedCandidates: DeduplicatedCandidate[];
  }> {
    let activeProviders = this.getEnabledProviders();

    if (requestedProviders && requestedProviders.length > 0) {
      activeProviders = activeProviders.filter((p) => requestedProviders.includes(p));
    }

    if (activeProviders.length === 0) {
      return {
        results: [],
        providerStatus: {} as Record<ProviderName, ProviderStatus>,
        deduplicatedCandidates: [],
      };
    }

    const promises = activeProviders.map((name) => {
      const provider = this.providers.get(name)!;
      return provider.execute(context);
    });

    const results = await Promise.all(promises);

    const providerStatus = {} as Record<ProviderName, ProviderStatus>;
    for (const result of results) {
      providerStatus[result.provider] = result.status;
    }

    const successfulResults = results.filter((r) => r.status === 'success' && r.candidates.length > 0);

    const deduplicatedCandidates = this.deduplicate(successfulResults);

    return {
      results,
      providerStatus,
      deduplicatedCandidates,
    };
  }

  private normalizeTreatmentName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\b(the|a|an)\b/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private deduplicate(results: ProviderResult[]): DeduplicatedCandidate[] {
    const candidateMap = new Map<string, DeduplicatedCandidate>();
    const totalProviders = results.length;

    for (const result of results) {
      for (const raw of result.candidates) {
        const normalized = this.normalizeTreatmentName(raw.treatment);
        if (normalized.length === 0) continue;

        const existing = candidateMap.get(normalized);

        if (existing) {
          if (!existing.providers.includes(result.provider)) {
            existing.providers.push(result.provider);
          }
          if (raw.reasoningSummary && !existing.reasoningSummaries.includes(raw.reasoningSummary)) {
            existing.reasoningSummaries.push(raw.reasoningSummary);
          }
          for (const c of raw.considerations) {
            if (!existing.allConsiderations.includes(c)) {
              existing.allConsiderations.push(c);
            }
          }
          for (const e of raw.evidenceNeeded) {
            if (!existing.allEvidenceNeeded.includes(e)) {
              existing.allEvidenceNeeded.push(e);
            }
          }
        } else {
          candidateMap.set(normalized, {
            treatment: raw.treatment,
            reasoningSummaries: raw.reasoningSummary ? [raw.reasoningSummary] : [],
            allConsiderations: [...raw.considerations],
            allEvidenceNeeded: [...raw.evidenceNeeded],
            providers: [result.provider],
            providerSupportRatio: 0,
            providerCount: 0,
          });
        }
      }
    }

    const candidates = Array.from(candidateMap.values());
    for (const c of candidates) {
      c.providerCount = c.providers.length;
      c.providerSupportRatio = totalProviders > 0 ? c.providers.length / totalProviders : 0;
    }

    candidates.sort((a, b) => b.providerCount - a.providerCount);

    return candidates;
  }
}

import type { ProviderStatus } from '@/types';
