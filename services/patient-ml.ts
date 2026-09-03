import type { PatientContext } from '@/types';

interface TrainingSample {
  features: Record<string, number>;
  label: string;
}

const TRAINING_DATA: TrainingSample[] = [
  { features: { age: 35, gender: 0, bmi: 24, hasDepression: 1, hasAnxiety: 0, priorSSRI: 0 }, label: 'sertraline' },
  { features: { age: 28, gender: 1, bmi: 22, hasDepression: 1, hasAnxiety: 1, priorSSRI: 0 }, label: 'escitalopram' },
  { features: { age: 45, gender: 0, bmi: 28, hasDepression: 1, hasAnxiety: 0, priorSSRI: 1 }, label: 'venlafaxine' },
  { features: { age: 52, gender: 1, bmi: 26, hasDepression: 1, hasAnxiety: 0, priorSSRI: 1 }, label: 'bupropion' },
  { features: { age: 30, gender: 1, bmi: 21, hasDepression: 1, hasAnxiety: 1, priorSSRI: 0 }, label: 'fluoxetine' },
  { features: { age: 60, gender: 0, bmi: 30, hasDepression: 0, hasAnxiety: 0, priorHypertension: 1 }, label: 'lisinopril' },
  { features: { age: 55, gender: 1, bmi: 29, hasDepression: 0, hasAnxiety: 0, priorHypertension: 1 }, label: 'amlodipine' },
  { features: { age: 65, gender: 0, bmi: 32, hasDepression: 0, hasAnxiety: 0, priorDiabetes: 1 }, label: 'metformin' },
  { features: { age: 58, gender: 1, bmi: 27, hasDepression: 0, hasAnxiety: 0, priorCholesterol: 1 }, label: 'atorvastatin' },
  { features: { age: 40, gender: 0, bmi: 25, hasDepression: 0, hasAnxiety: 0, priorPain: 1 }, label: 'ibuprofen' },
  { features: { age: 35, gender: 1, bmi: 23, hasDepression: 0, hasAnxiety: 0, priorPain: 1 }, label: 'acetaminophen' },
  { features: { age: 25, gender: 0, bmi: 22, hasDepression: 0, hasAnxiety: 0, priorInsomnia: 1 }, label: 'melatonin' },
  { features: { age: 50, gender: 1, bmi: 28, hasDepression: 0, hasAnxiety: 0, priorGERD: 1 }, label: 'omeprazole' },
  { features: { age: 42, gender: 0, bmi: 26, hasDepression: 0, hasAnxiety: 1, priorAnxiety: 1 }, label: 'lorazepam' },
  { features: { age: 38, gender: 1, bmi: 24, hasDepression: 0, hasAnxiety: 1, priorAnxiety: 0 }, label: 'sertraline' },
  { features: { age: 48, gender: 0, bmi: 27, hasDepression: 1, hasAnxiety: 0, priorSSRI: 0 }, label: 'mirtazapine' },
  { features: { age: 33, gender: 1, bmi: 22, hasDepression: 0, hasAnxiety: 0, priorAllergies: 1 }, label: 'loratadine' },
  { features: { age: 45, gender: 0, bmi: 25, hasDepression: 0, hasAnxiety: 0, priorAllergies: 1 }, label: 'cetirizine' },
  { features: { age: 55, gender: 1, bmi: 30, hasDepression: 0, hasAnxiety: 0, priorHypothyroidism: 1 }, label: 'levothyroxine' },
  { features: { age: 42, gender: 0, bmi: 26, hasDepression: 0, hasAnxiety: 0, priorNeuropathicPain: 1 }, label: 'gabapentin' },
  { features: { age: 36, gender: 1, bmi: 23, hasDepression: 0, hasAnxiety: 1, priorAnxiety: 1 }, label: 'cognitive behavioral therapy' },
  { features: { age: 44, gender: 0, bmi: 27, hasDepression: 1, hasAnxiety: 0, priorSSRI: 0 }, label: 'cognitive behavioral therapy' },
  { features: { age: 29, gender: 1, bmi: 21, hasDepression: 0, hasAnxiety: 0, priorInsomnia: 1 }, label: 'sleep hygiene' },
  { features: { age: 50, gender: 0, bmi: 31, hasDepression: 0, hasAnxiety: 0, priorHypertension: 1 }, label: 'lifestyle modification' },
  { features: { age: 37, gender: 1, bmi: 24, hasDepression: 1, hasAnxiety: 0, priorSSRI: 0 }, label: 'exercise' },
];

const FEATURE_KEYS = [
  'age', 'gender', 'bmi', 'hasDepression', 'hasAnxiety', 'priorSSRI',
  'priorHypertension', 'priorDiabetes', 'priorCholesterol', 'priorPain',
  'priorInsomnia', 'priorGERD', 'priorAnxiety', 'priorAllergies',
  'priorHypothyroidism', 'priorNeuropathicPain',
];

function extractFeatures(context: PatientContext): Record<string, number> {
  const features: Record<string, number> = {
    age: context.age,
    gender: context.gender === 'male' ? 0 : context.gender === 'female' ? 1 : 0.5,
    bmi: context.bmi ?? 25,
    hasDepression: context.diagnosis?.toLowerCase().includes('depression') ? 1 : 0,
    hasAnxiety: context.diagnosis?.toLowerCase().includes('anxiety') ? 1 : 0,
    priorSSRI: context.previousTreatments.some((t) =>
      ['sertraline', 'fluoxetine', 'escitalopram', 'paroxetine', 'citalopram'].some((s) =>
        t.treatmentName.toLowerCase().includes(s)
      )
    ) ? 1 : 0,
    priorHypertension: context.chronicConditions.some((c) => c.toLowerCase().includes('hypertension')) ? 1 : 0,
    priorDiabetes: context.chronicConditions.some((c) => c.toLowerCase().includes('diabetes')) ? 1 : 0,
    priorCholesterol: context.chronicConditions.some((c) => c.toLowerCase().includes('cholesterol')) ? 1 : 0,
    priorPain: context.symptoms.some((s) => s.toLowerCase().includes('pain')) ? 1 : 0,
    priorInsomnia: context.symptoms.some((s) =>
      s.toLowerCase().includes('insomnia') || s.toLowerCase().includes('sleep')
    ) ? 1 : 0,
    priorGERD: context.chronicConditions.some((c) => c.toLowerCase().includes('gerd') || c.toLowerCase().includes('reflux')) ? 1 : 0,
    priorAnxiety: context.diagnosis?.toLowerCase().includes('anxiety') ? 1 : 0,
    priorAllergies: context.allergies.length > 0 ? 1 : 0,
    priorHypothyroidism: context.chronicConditions.some((c) => c.toLowerCase().includes('thyroid')) ? 1 : 0,
    priorNeuropathicPain: context.symptoms.some((s) => s.toLowerCase().includes('nerve') || s.toLowerCase().includes('neuropath')) ? 1 : 0,
  };
  return features;
}

function normalizeFeature(value: number, key: string): number {
  if (key === 'age') return value / 100;
  if (key === 'bmi') return value / 50;
  return value;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export class PatientHistoryML {
  private vocabulary: string[];
  private weights: Map<string, Map<string, number>>;
  private biases: Map<string, number>;
  private featureMeans: Map<string, number>;
  private featureStds: Map<string, number>;

  constructor() {
    this.vocabulary = [...new Set(TRAINING_DATA.map((s) => s.label))];
    this.weights = new Map();
    this.biases = new Map();
    this.featureMeans = new Map();
    this.featureStds = new Map();

    this.computeFeatureStats();
    this.train();
  }

  private computeFeatureStats() {
    for (const key of FEATURE_KEYS) {
      const values = TRAINING_DATA.map((s) => s.features[key] || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const std = Math.sqrt(variance) || 1;
      this.featureMeans.set(key, mean);
      this.featureStds.set(key, std);
    }
  }

  private standardize(features: Record<string, number>): Map<string, number> {
    const standardized = new Map<string, number>();
    for (const key of FEATURE_KEYS) {
      const val = features[key] || 0;
      const mean = this.featureMeans.get(key)!;
      const std = this.featureStds.get(key)!;
      standardized.set(key, (val - mean) / std);
    }
    return standardized;
  }

  private train() {
    const learningRate = 0.01;
    const epochs = 200;

    for (const label of this.vocabulary) {
      const weightMap = new Map<string, number>();
      for (const key of FEATURE_KEYS) {
        weightMap.set(key, 0);
      }
      let bias = 0;

      for (let epoch = 0; epoch < epochs; epoch++) {
        for (const sample of TRAINING_DATA) {
          const features = this.standardize(sample.features);
          const target = sample.label === label ? 1 : 0;

          let z = bias;
          features.forEach((val, key) => {
            z += (weightMap.get(key) || 0) * val;
          });
          const prediction = sigmoid(z);
          const error = prediction - target;

          features.forEach((val, key) => {
            weightMap.set(key, (weightMap.get(key) || 0) - learningRate * error * val);
          });
          bias -= learningRate * error;
        }
      }

      this.weights.set(label, weightMap);
      this.biases.set(label, bias);
    }
  }

  predictProbability(treatmentName: string, context: PatientContext): number | null {
    const normalized = treatmentName.toLowerCase().trim();

    if (!this.vocabulary.includes(normalized)) {
      return null;
    }

    const features = this.standardize(extractFeatures(context));
    const weightMap = this.weights.get(normalized);
    const bias = this.biases.get(normalized);

    if (!weightMap || bias === undefined) return null;

    let z = bias;
    features.forEach((val, key) => {
      z += (weightMap.get(key) || 0) * val;
    });

    return Math.round(sigmoid(z) * 100) / 100;
  }

  getVocabulary(): string[] {
    return [...this.vocabulary];
  }

  getModelInfo() {
    return {
      modelType: 'Logistic Regression (one-vs-rest)',
      featureCount: FEATURE_KEYS.length,
      trainingSamples: TRAINING_DATA.length,
      vocabularySize: this.vocabulary.length,
      limitations:
        'Experimental personalization signal only. Offline model performance does NOT establish clinical validity. Training data is synthetic.',
    };
  }
}

let mlInstance: PatientHistoryML | null = null;

export function getMLModel(): PatientHistoryML {
  if (!mlInstance) {
    mlInstance = new PatientHistoryML();
  }
  return mlInstance;
}
