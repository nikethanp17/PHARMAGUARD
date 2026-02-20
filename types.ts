
export enum RiskLabel {
  SAFE = 'Safe',
  ADJUST_DOSAGE = 'Adjust Dosage',
  TOXIC = 'Toxic',
  INEFFECTIVE = 'Ineffective',
  UNKNOWN = 'Unknown'
}

export enum Phenotype {
  PM = 'PM',
  IM = 'IM',
  NM = 'NM',
  RM = 'RM',
  UM = 'UM',
  UNKNOWN = 'Unknown'
}

export enum Severity {
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface CPICRecommendation {
  drug: string;
  phenotype: Phenotype;
  risk_label: RiskLabel;
  severity: Severity;
  action: string;
  evidence_level: string;
  dosing_recommendation?: string;
  mechanism?: string;
}

export interface GeneProfile {
  gene: string;
  diplotype: string;
  phenotype: Phenotype;
}

export interface DetectedVariant {
  rsid: string;
  gene: string;
  star_allele: string;
  zygosity: string;
  clinical_significance: string;
}

// RIFT 2026 Hackathon — exact JSON schema
export interface AnalysisResponse {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: {
    risk_label: string;
    confidence_score: number;
    severity: string;
  };
  pharmacogenomic_profile: {
    primary_gene: string;
    diplotype: string;
    phenotype: string;
    detected_variants: DetectedVariant[];
  };
  clinical_recommendation: {
    action: string;
    dosing_recommendation: string;
    evidence_level: string;
    cpic_guideline: string;
    monitoring: string;
  };
  llm_generated_explanation: {
    summary: string;
    mechanism: string;
    clinical_impact: string;
    alternative_drugs: string;
  };
  quality_metrics: {
    vcf_parsing_success: boolean;
    variant_match_found: boolean;
    phenotype_determined: boolean;
    drug_rule_applied: boolean;
    confidence_rationale: string;
  };
  // Internal use — full gene profiles for display
  _all_gene_profiles?: GeneProfile[];
}

export interface VcfVariant {
  gene: string;
  star: string;
  rs: string;
}

export const TARGET_GENES = ['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD'];
