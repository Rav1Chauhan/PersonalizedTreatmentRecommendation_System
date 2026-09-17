export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { MODEL_VERSION, isProviderEnabled } from '@/lib/config';
import { getMLModel } from '@/services/patient-ml';
import { getDatasetInfo } from '@/services/evidence-retrieval';
import type { ProviderName } from '@/types';

export async function GET() {
  const mlModel = getMLModel();
  const datasetInfo = getDatasetInfo();
  const mlInfo = mlModel.getModelInfo();

  const enabledProviders: ProviderName[] = [];
  if (isProviderEnabled('gemini')) enabledProviders.push('gemini');
  if (isProviderEnabled('openai')) enabledProviders.push('openai');
  if (isProviderEnabled('claude')) enabledProviders.push('claude');

  return NextResponse.json({
    embeddingModel: 'TF-IDF + Jaccard similarity (computed in-process)',
    embeddingDimension: 0,
    retrievalModel: 'Hybrid TF-IDF + semantic similarity',
    patientMlModel: mlInfo.modelType,
    modelVersion: MODEL_VERSION,
    enabledProviders,
    ml: {
      featureCount: mlInfo.featureCount,
      trainingSamples: mlInfo.trainingSamples,
      vocabularySize: mlInfo.vocabularySize,
      vocabulary: mlModel.getVocabulary(),
      limitations: mlInfo.limitations,
    },
    evidenceDataset: datasetInfo,
  });
}
