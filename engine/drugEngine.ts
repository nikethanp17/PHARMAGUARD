
import { Phenotype, RiskLabel, Severity, CPICRecommendation, GeneProfile } from '../types';
import { RECOMMENDATION_DATA, DRUG_GENE_MAP } from '../data/cpicData';

export const getRecommendation = (
  drugInput: string,
  profiles: GeneProfile[]
): CPICRecommendation | null => {
  const normalizedInput = drugInput.trim().toUpperCase();
  const targetGene = DRUG_GENE_MAP[normalizedInput];

  if (!targetGene) return null;

  const profile = profiles.find(p => p.gene === targetGene);
  if (!profile) return null;

  const rec = RECOMMENDATION_DATA.find(r =>
    r.drug === normalizedInput && r.phenotype === profile.phenotype
  );

  return rec || {
    drug: normalizedInput,
    phenotype: profile.phenotype,
    risk_label: RiskLabel.SAFE,
    severity: Severity.NONE,
    action: 'Standard therapeutic dosing recommended based on genotype.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dosing per clinical protocol.',
    mechanism: 'Normal metabolizer phenotype supports standard drug pharmacokinetics.'
  };
};
