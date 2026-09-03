import type { SafetyCheckResult, SafetyStatus, PatientContext } from '@/types';

const DRUG_ALIASES: Record<string, string[]> = {
  acetaminophen: ['tylenol', 'paracetamol', 'panadol', 'mapap'],
  ibuprofen: ['advil', 'motrin', 'nurofen'],
  aspirin: ['asa', 'ecotrin', 'bayer'],
  'naproxen': ['aleve', 'naprosyn', 'midol'],
  'loratadine': ['claritin', 'alavert'],
  'cetirizine': ['zyrtec', 'reactine'],
  'diphenhydramine': ['benadryl', 'nytol', 'sominex'],
  'sertraline': ['zoloft'],
  'fluoxetine': ['prozac'],
  'escitalopram': ['lexapro'],
  'venlafaxine': ['effexor'],
  'duloxetine': ['cymbalta'],
  'bupropion': ['wellbutrin', 'zyban'],
  'mirtazapine': ['remeron'],
  'amitriptyline': ['elavil'],
  'diazepam': ['valium'],
  'lorazepam': ['ativan'],
  'alprazolam': ['xanax'],
  'clonazepam': ['klonopin'],
  'metformin': ['glucophage'],
  'atorvastatin': ['lipitor'],
  'lisinopril': ['zestril', 'prinvil'],
  'amlodipine': ['norvasc'],
  'losartan': ['cozaar'],
  'omeprazole': ['prilosec'],
  'pantoprazole': ['protonix'],
  'ranitidine': ['zantac'],
  'melatonin': ['circadin'],
  'diphenhydramine hydrochloride': ['benadryl'],
  'levothyroxine': ['synthroid', 'eltroxin'],
  'amoxicillin': ['amoxil'],
  'penicillin': ['penicillin v', 'penicillin g'],
  'azithromycin': ['zithromax', 'z-pak'],
  'doxycycline': ['vibramycin'],
  'ciprofloxacin': ['cipro'],
  'montelukast': ['singulair'],
  'fluticasone': ['flonase', 'flixotide'],
  'hydrocortisone': ['cortef'],
  'prednisone': ['deltasone'],
  'methylprednisolone': ['medrol'],
  'gabapentin': ['neurontin'],
  'pregabalin': ['lyrica'],
  'topiramate': ['topamax'],
  'valproic acid': ['depakote'],
  'lamotrigine': ['lamictal'],
};

const ALLERGY_CLASS_CROSS_REACTIVITY: Record<string, string[]> = {
  'penicillin': ['amoxicillin', 'ampicillin', 'penicillin'],
  'sulfa': ['sulfamethoxazole', 'sulfasalazine', 'trimethoprim-sulfamethoxazole'],
  'nsaid': ['ibuprofen', 'naproxen', 'aspirin', 'diclofenac', 'ketorolac', 'indomethacin'],
  'statin': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'],
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getAliases(name: string): string[] {
  const normalized = normalizeName(name);
  const aliases = new Set<string>([normalized]);
  if (DRUG_ALIASES[normalized]) {
    DRUG_ALIASES[normalized].forEach((a) => aliases.add(normalizeName(a)));
  }
  for (const [generic, brands] of Object.entries(DRUG_ALIASES)) {
    if (brands.some((b) => normalizeName(b) === normalized)) {
      aliases.add(normalizeName(generic));
      brands.forEach((b) => aliases.add(normalizeName(b)));
    }
  }
  return Array.from(aliases);
}

function getCrossReactiveDrugs(allergy: string): string[] {
  const normalized = normalizeName(allergy);
  const drugs: string[] = [normalized];
  if (ALLERGY_CLASS_CROSS_REACTIVITY[normalized]) {
    drugs.push(...ALLERGY_CLASS_CROSS_REACTIVITY[normalized]);
  }
  for (const [className, drugs_in_class] of Object.entries(ALLERGY_CLASS_CROSS_REACTIVITY)) {
    if (drugs_in_class.some((d) => normalizeName(d) === normalized)) {
      drugs.push(...drugs_in_class);
    }
  }
  return Array.from(new Set(drugs.map(normalizeName)));
}

export function checkSafety(
  treatmentName: string,
  context: PatientContext
): SafetyCheckResult {
  const treatmentAliases = getAliases(treatmentName);
  const reasons: string[] = [];
  const warnings: string[] = [];

  for (const allergy of context.allergies) {
    const allergyDrugs = getCrossReactiveDrugs(allergy);
    const hasMatch = allergyDrugs.some((drug) =>
      treatmentAliases.some((alias) =>
        alias === drug || alias.includes(drug) || drug.includes(alias)
      )
    );

    if (hasMatch) {
      return {
        status: 'excluded',
        reasons: [`Treatment "${treatmentName}" conflicts with patient allergy: ${allergy}`],
        warnings: [],
        source: 'allergy_check',
      };
    }
  }

  if (context.previousTreatments.length > 0) {
    for (const prev of context.previousTreatments) {
      if (prev.adverseReaction && prev.adverseReaction.toLowerCase() !== 'none' && prev.adverseReaction.toLowerCase() !== 'null') {
        const prevAliases = getAliases(prev.treatmentName);
        const hasMatch = prevAliases.some((a) =>
          treatmentAliases.some((t) => a === t || a.includes(t) || t.includes(a))
        );
        if (hasMatch) {
          warnings.push(
            `Patient had adverse reaction "${prev.adverseReaction}" to ${prev.treatmentName} previously`
          );
        }
      }
    }
  }

  const isKnownDrug = treatmentAliases.some((a) =>
    DRUG_ALIASES[a] || Object.values(DRUG_ALIASES).some((brands) => brands.includes(a))
  );

  if (!isKnownDrug && warnings.length === 0) {
    return {
      status: 'review_required',
      reasons: [],
      warnings: ['Treatment not found in known medication database — safety review required'],
      source: 'unknown_drug_database',
    };
  }

  if (warnings.length > 0) {
    return {
      status: 'review_required',
      reasons: [],
      warnings,
      source: 'adverse_reaction_history',
    };
  }

  return {
    status: 'known',
    reasons: [],
    warnings: [],
    source: 'drug_database',
  };
}

export function getSafetyStatusForDisplay(status: SafetyStatus): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'known':
      return { label: 'Known Safety Profile', color: 'green' };
    case 'review_required':
      return { label: 'Review Required', color: 'amber' };
    case 'excluded':
      return { label: 'Excluded — Safety Concern', color: 'red' };
    case 'unknown':
      return { label: 'Unknown', color: 'gray' };
    default:
      return { label: status, color: 'gray' };
  }
}
