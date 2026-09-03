import type { PatientContext, EvidenceItem } from '@/types';

interface EvidenceRecord {
  source: string;
  sourceUrl: string | null;
  title: string;
  condition: string;
  treatment: string;
  effectivenessRating: number | null;
  reviewText: string;
}

const EVIDENCE_DATASET: EvidenceRecord[] = [
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Sertraline for depression', condition: 'depression', treatment: 'sertraline', effectivenessRating: 8.5, reviewText: 'sertraline effective for depression with mild side effects' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Fluoxetine for depression', condition: 'depression', treatment: 'fluoxetine', effectivenessRating: 8.0, reviewText: 'fluoxetine commonly prescribed for depression and anxiety' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Escitalopram for anxiety', condition: 'anxiety', treatment: 'escitalopram', effectivenessRating: 8.7, reviewText: 'escitalopram effective for generalized anxiety disorder' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Venlafaxine for depression', condition: 'depression', treatment: 'venlafaxine', effectivenessRating: 7.5, reviewText: 'venlafaxine SNRI for depression with good response' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Bupropion for depression', condition: 'depression', treatment: 'bupropion', effectivenessRating: 7.8, reviewText: 'bupropion atypical antidepressant for depression' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Mirtazapine for depression', condition: 'depression', treatment: 'mirtazapine', effectivenessRating: 7.6, reviewText: 'mirtazapine for depression with sleep benefits' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Ibuprofen for pain', condition: 'pain', treatment: 'ibuprofen', effectivenessRating: 8.2, reviewText: 'ibuprofen NSAID for mild to moderate pain relief' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Acetaminophen for pain', condition: 'pain', treatment: 'acetaminophen', effectivenessRating: 7.5, reviewText: 'acetaminophen analgesic for pain and fever' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Naproxen for pain', condition: 'pain', treatment: 'naproxen', effectivenessRating: 8.0, reviewText: 'naproxen NSAID for pain inflammation' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Loratadine for allergies', condition: 'allergic rhinitis', treatment: 'loratadine', effectivenessRating: 8.3, reviewText: 'loratadine antihistamine for seasonal allergies' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Cetirizine for allergies', condition: 'allergic rhinitis', treatment: 'cetirizine', effectivenessRating: 8.5, reviewText: 'cetirizine antihistamine for allergy symptoms' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Melatonin for insomnia', condition: 'insomnia', treatment: 'melatonin', effectivenessRating: 7.2, reviewText: 'melatonin supplement for sleep onset insomnia' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Diphenhydramine for insomnia', condition: 'insomnia', treatment: 'diphenhydramine', effectivenessRating: 6.8, reviewText: 'diphenhydramine sedating antihistamine for sleep' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Metformin for diabetes', condition: 'type 2 diabetes', treatment: 'metformin', effectivenessRating: 9.0, reviewText: 'metformin first-line treatment for type 2 diabetes' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Atorvastatin for cholesterol', condition: 'high cholesterol', treatment: 'atorvastatin', effectivenessRating: 8.8, reviewText: 'atorvastatin statin for lowering LDL cholesterol' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Lisinopril for hypertension', condition: 'hypertension', treatment: 'lisinopril', effectivenessRating: 8.5, reviewText: 'lisinopril ACE inhibitor for blood pressure control' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Amlodipine for hypertension', condition: 'hypertension', treatment: 'amlodipine', effectivenessRating: 8.3, reviewText: 'amlodipine calcium channel blocker for hypertension' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Omeprazole for GERD', condition: 'gerd', treatment: 'omeprazole', effectivenessRating: 8.6, reviewText: 'omeprazole proton pump inhibitor for acid reflux' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Montelukast for asthma', condition: 'asthma', treatment: 'montelukast', effectivenessRating: 7.8, reviewText: 'montelukast leukotriene receptor antagonist for asthma' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Gabapentin for neuropathic pain', condition: 'neuropathic pain', treatment: 'gabapentin', effectivenessRating: 7.5, reviewText: 'gabapentin for nerve pain and neuropathy' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Levothyroxine for hypothyroidism', condition: 'hypothyroidism', treatment: 'levothyroxine', effectivenessRating: 9.2, reviewText: 'levothyroxine thyroid hormone replacement for hypothyroidism' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Sertraline for anxiety', condition: 'anxiety', treatment: 'sertraline', effectivenessRating: 8.2, reviewText: 'sertraline SSRI also effective for anxiety disorders' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Duloxetine for depression', condition: 'depression', treatment: 'duloxetine', effectivenessRating: 7.9, reviewText: 'duloxetine SNRI for depression and chronic pain' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Lorazepam for anxiety', condition: 'anxiety', treatment: 'lorazepam', effectivenessRating: 8.0, reviewText: 'lorazepam benzodiazepine for acute anxiety' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'Cognitive Behavioral Therapy for anxiety', condition: 'anxiety', treatment: 'cognitive behavioral therapy', effectivenessRating: 8.5, reviewText: 'CBT evidence-based therapy for anxiety disorders' },
  { source: 'UCI Drug Reviews', sourceUrl: 'https://archive.ics.uci.edu/dataset/462', title: 'CBT for depression', condition: 'depression', treatment: 'cognitive behavioral therapy', effectivenessRating: 8.4, reviewText: 'cognitive behavioral therapy for depression treatment' },
  { source: 'Clinical Guidelines', sourceUrl: null, title: 'Lifestyle modification for hypertension', condition: 'hypertension', treatment: 'lifestyle modification', effectivenessRating: 7.5, reviewText: 'diet exercise and weight management for blood pressure' },
  { source: 'Clinical Guidelines', sourceUrl: null, title: 'Exercise for depression', condition: 'depression', treatment: 'exercise', effectivenessRating: 7.0, reviewText: 'regular exercise shown to improve depressive symptoms' },
  { source: 'Clinical Guidelines', sourceUrl: null, title: 'Sleep hygiene for insomnia', condition: 'insomnia', treatment: 'sleep hygiene', effectivenessRating: 7.3, reviewText: 'sleep hygiene practices for improving sleep quality' },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

function cosineSimilarity(
  tfA: Map<string, number>,
  tfB: Map<string, number>
): number {
  let dotProduct = 0;
  tfA.forEach((freq, term) => {
    const otherFreq = tfB.get(term);
    if (otherFreq) {
      dotProduct += freq * otherFreq;
    }
  });
  let normA = 0;
  tfA.forEach((freq) => {
    normA += freq * freq;
  });
  let normB = 0;
  tfB.forEach((freq) => {
    normB += freq * freq;
  });
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function semanticSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach((t) => {
    if (setB.has(t)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

function computeEvidenceQuality(
  conditionMatch: number,
  textSimilarity: number,
  rating: number | null
): string {
  const conditionScore = conditionMatch;
  const textScore = textSimilarity;
  const ratingScore = rating !== null ? rating / 10 : 0.5;

  const combined = conditionScore * 0.4 + textScore * 0.3 + ratingScore * 0.3;

  if (combined >= 0.7) return 'high';
  if (combined >= 0.4) return 'moderate';
  if (combined >= 0.2) return 'low';
  return 'very_low';
}

export function retrieveEvidence(
  treatmentName: string,
  context: PatientContext,
  topK: number = 5
): EvidenceItem[] {
  const query = `${treatmentName} ${context.diagnosis || ''} ${context.symptoms.join(' ')}`;
  const queryTokens = tokenize(query);
  const queryTF = termFrequency(queryTokens);

  const scored = EVIDENCE_DATASET.map((record) => {
    const recordText = `${record.title} ${record.reviewText} ${record.condition} ${record.treatment}`;
    const recordTokens = tokenize(recordText);
    const recordTF = termFrequency(recordTokens);

    const tfidfSim = cosineSimilarity(queryTF, recordTF);
    const semanticSim = semanticSimilarity(query, recordText);

    const combinedSimilarity = tfidfSim * 0.6 + semanticSim * 0.4;

    const conditionMatch =
      context.diagnosis &&
      record.condition.toLowerCase().includes(context.diagnosis.toLowerCase())
        ? 1.0
        : semanticSimilarity(context.diagnosis || '', record.condition);

    return {
      record,
      similarity: combinedSimilarity,
      conditionMatch,
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored
    .filter((s) => s.similarity > 0.05)
    .slice(0, topK)
    .map((s) => ({
      source: s.record.source,
      sourceUrl: s.record.sourceUrl,
      title: s.record.title,
      condition: s.record.condition,
      similarity: Math.round(s.similarity * 100) / 100,
      evidenceQuality: computeEvidenceQuality(
        s.conditionMatch,
        s.similarity,
        s.record.effectivenessRating
      ),
    }));
}

export function getEvidenceQualityScore(evidence: EvidenceItem[]): number {
  if (evidence.length === 0) return 0;

  const qualityWeight: Record<string, number> = {
    high: 1.0,
    moderate: 0.7,
    low: 0.4,
    very_low: 0.2,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const e of evidence) {
    const weight = qualityWeight[e.evidenceQuality] || 0.3;
    totalScore += e.similarity * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.min(1.0, totalScore / totalWeight);
}

export function getRetrievalScore(treatmentName: string, context: PatientContext): number {
  const evidence = retrieveEvidence(treatmentName, context, 10);
  if (evidence.length === 0) return 0;

  const topScore = evidence[0].similarity;
  const avgScore =
    evidence.reduce((sum, e) => sum + e.similarity, 0) / evidence.length;

  return Math.round((topScore * 0.6 + avgScore * 0.4) * 100) / 100;
}

export function getDatasetInfo() {
  return {
    name: 'UCI Drug Reviews (synthetic subset for demonstration)',
    license: 'Creative Commons Attribution 4.0',
    source: 'https://archive.ics.uci.edu/dataset/462',
    recordCount: EVIDENCE_DATASET.length,
    limitations:
      'This is a synthetic subset for demonstration. Not for clinical use. Coverage is limited.',
  };
}
