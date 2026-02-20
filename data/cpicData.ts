
import { Phenotype, RiskLabel, Severity, CPICRecommendation } from '../types';

/**
 * Mapping: Gene -> Diplotype -> Phenotype
 */
export const PHENOTYPE_MAP: Record<string, Record<string, Phenotype>> = {
  'CYP2C19': {
    '*1/*1': Phenotype.NM,
    '*1/*17': Phenotype.RM,
    '*17/*17': Phenotype.UM,
    '*1/*2': Phenotype.IM,
    '*1/*3': Phenotype.IM,
    '*2/*2': Phenotype.PM,
    '*2/*3': Phenotype.PM,
    '*2/*17': Phenotype.IM,
    '*3/*3': Phenotype.PM,
    '*2/*4': Phenotype.PM,
    '*1/*4': Phenotype.IM
  },
  'CYP2D6': {
    '*1/*1': Phenotype.NM,
    '*1/*2': Phenotype.NM,
    '*2/*2': Phenotype.NM,
    '*1/*4': Phenotype.IM,
    '*1/*5': Phenotype.IM,
    '*1/*6': Phenotype.IM,
    '*1/*9': Phenotype.IM,
    '*1/*41': Phenotype.IM,
    '*41/*41': Phenotype.IM,
    '*4/*4': Phenotype.PM,
    '*4/*5': Phenotype.PM,
    '*5/*5': Phenotype.PM,
    '*3/*4': Phenotype.PM,
    '*6/*6': Phenotype.PM,
    '*1/*1x2': Phenotype.UM,
    '*1/*2x2': Phenotype.UM,
    '*2x2/*2x2': Phenotype.UM
  },
  'SLCO1B1': {
    '*1/*1': Phenotype.NM,
    '*1/*5': Phenotype.IM,
    '*1/*15': Phenotype.IM,
    '*5/*5': Phenotype.PM,
    '*5/*15': Phenotype.PM,
    '*15/*15': Phenotype.PM
  },
  'CYP2C9': {
    '*1/*1': Phenotype.NM,
    '*1/*2': Phenotype.IM,
    '*1/*3': Phenotype.IM,
    '*2/*2': Phenotype.IM,
    '*2/*3': Phenotype.PM,
    '*3/*3': Phenotype.PM,
    '*1/*5': Phenotype.IM,
    '*1/*6': Phenotype.IM,
    '*1/*8': Phenotype.IM,
    '*1/*11': Phenotype.IM
  },
  'TPMT': {
    '*1/*1': Phenotype.NM,
    '*1/*2': Phenotype.IM,
    '*1/*3A': Phenotype.IM,
    '*1/*3B': Phenotype.IM,
    '*1/*3C': Phenotype.IM,
    '*1/*4': Phenotype.IM,
    '*2/*2': Phenotype.PM,
    '*3A/*3A': Phenotype.PM,
    '*3C/*3C': Phenotype.PM,
    '*2/*3A': Phenotype.PM,
    '*2/*3C': Phenotype.PM
  },
  'DPYD': {
    '*1/*1': Phenotype.NM,
    '*1/*2A': Phenotype.IM,
    '*1/*13': Phenotype.IM,
    '*2A/*2A': Phenotype.PM,
    '*1/*5': Phenotype.IM,
    '*13/*13': Phenotype.PM
  }
};

/**
 * Drug -> Gene relationship for 6 core drugs
 */
export const DRUG_GENE_MAP: Record<string, string> = {
  'CODEINE': 'CYP2D6',
  'WARFARIN': 'CYP2C9',
  'CLOPIDOGREL': 'CYP2C19',
  'SIMVASTATIN': 'SLCO1B1',
  'AZATHIOPRINE': 'TPMT',
  'FLUOROURACIL': 'DPYD'
};

/**
 * CPIC recommendation data
 */
export const RECOMMENDATION_DATA: CPICRecommendation[] = [
  // CLOPIDOGREL
  {
    drug: 'CLOPIDOGREL', phenotype: Phenotype.PM,
    risk_label: RiskLabel.INEFFECTIVE, severity: Severity.CRITICAL,
    action: 'Avoid clopidogrel; use alternative antiplatelet therapy (e.g., prasugrel, ticagrelor).',
    evidence_level: 'A',
    dosing_recommendation: 'Do NOT prescribe clopidogrel. Switch to prasugrel 10mg daily or ticagrelor 90mg twice daily.',
    mechanism: 'CYP2C19 Poor Metabolizers cannot convert clopidogrel prodrug to its active metabolite, resulting in inadequate platelet inhibition and significantly increased risk of cardiovascular events including stent thrombosis.'
  },
  {
    drug: 'CLOPIDOGREL', phenotype: Phenotype.IM,
    risk_label: RiskLabel.INEFFECTIVE, severity: Severity.HIGH,
    action: 'Avoid clopidogrel; use alternative therapy if no contraindications.',
    evidence_level: 'A',
    dosing_recommendation: 'Consider switching to prasugrel or ticagrelor. If clopidogrel is continued, higher loading dose may be insufficient.',
    mechanism: 'CYP2C19 Intermediate Metabolizers have reduced capacity to convert clopidogrel to its active form, leading to diminished antiplatelet effect and increased risk of adverse cardiovascular outcomes.'
  },
  {
    drug: 'CLOPIDOGREL', phenotype: Phenotype.NM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard clopidogrel dosing.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dose: 75mg daily after appropriate loading dose (300-600mg).',
    mechanism: 'Normal CYP2C19 activity enables adequate conversion of clopidogrel to its active metabolite for expected antiplatelet efficacy.'
  },
  {
    drug: 'CLOPIDOGREL', phenotype: Phenotype.RM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard clopidogrel dosing. Enhanced metabolism may improve efficacy.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dose: 75mg daily. No adjustment needed.',
    mechanism: 'Rapid metabolizers have increased CYP2C19 activity, leading to enhanced conversion of clopidogrel prodrug to active metabolite.'
  },
  {
    drug: 'CLOPIDOGREL', phenotype: Phenotype.UM,
    risk_label: RiskLabel.SAFE, severity: Severity.LOW,
    action: 'Standard clopidogrel dosing. Monitor for increased bleeding risk.',
    evidence_level: 'B',
    dosing_recommendation: 'Standard dose: 75mg daily. Monitor for bleeding signs.',
    mechanism: 'Ultrarapid CYP2C19 metabolism produces higher levels of active metabolite, potentially increasing bleeding risk while ensuring drug efficacy.'
  },
  // CODEINE
  {
    drug: 'CODEINE', phenotype: Phenotype.UM,
    risk_label: RiskLabel.TOXIC, severity: Severity.CRITICAL,
    action: 'Avoid codeine; use non-opioid analgesic or alternative opioid not metabolized by CYP2D6.',
    evidence_level: 'A',
    dosing_recommendation: 'CONTRAINDICATED. Use non-opioid analgesic (ibuprofen, acetaminophen) or non-CYP2D6 opioid (morphine).',
    mechanism: 'Ultrarapid CYP2D6 metabolism converts codeine to morphine at an extremely accelerated rate, causing life-threatening respiratory depression and toxicity, particularly dangerous in pediatric patients.'
  },
  {
    drug: 'CODEINE', phenotype: Phenotype.PM,
    risk_label: RiskLabel.INEFFECTIVE, severity: Severity.HIGH,
    action: 'Avoid codeine; use alternative analgesic.',
    evidence_level: 'A',
    dosing_recommendation: 'Codeine will be ineffective. Use alternative analgesic (e.g., acetaminophen, NSAIDs, or morphine).',
    mechanism: 'CYP2D6 Poor Metabolizers cannot convert codeine to its active metabolite morphine, resulting in no analgesic effect regardless of dose.'
  },
  {
    drug: 'CODEINE', phenotype: Phenotype.IM,
    risk_label: RiskLabel.ADJUST_DOSAGE, severity: Severity.MODERATE,
    action: 'Reduced efficacy expected. Consider alternative analgesic.',
    evidence_level: 'B',
    dosing_recommendation: 'If used, standard dosing may provide reduced analgesia. Prefer non-CYP2D6-dependent analgesic.',
    mechanism: 'Reduced CYP2D6 activity leads to diminished conversion of codeine to morphine, resulting in sub-therapeutic analgesic effects.'
  },
  {
    drug: 'CODEINE', phenotype: Phenotype.NM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard codeine dosing appropriate.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dose: 15-60mg every 4-6 hours as needed.',
    mechanism: 'Normal CYP2D6 metabolism provides expected conversion of codeine to morphine for adequate pain relief.'
  },
  // SIMVASTATIN
  {
    drug: 'SIMVASTATIN', phenotype: Phenotype.PM,
    risk_label: RiskLabel.TOXIC, severity: Severity.HIGH,
    action: 'Prescribe lower dose or consider alternative statin (e.g., Rosuvastatin, Pravastatin).',
    evidence_level: 'A',
    dosing_recommendation: 'Avoid simvastatin >20mg. Consider rosuvastatin or pravastatin which are not SLCO1B1-dependent.',
    mechanism: 'SLCO1B1 Poor Function leads to severely impaired hepatic uptake of simvastatin acid, causing dramatically elevated systemic exposure and high risk of myopathy and rhabdomyolysis.'
  },
  {
    drug: 'SIMVASTATIN', phenotype: Phenotype.IM,
    risk_label: RiskLabel.ADJUST_DOSAGE, severity: Severity.MODERATE,
    action: 'Use lower simvastatin dose. Avoid >20mg daily.',
    evidence_level: 'A',
    dosing_recommendation: 'Limit simvastatin to ≤20mg/day. Monitor for muscle symptoms (myalgia, CK elevation).',
    mechanism: 'Reduced SLCO1B1 transporter function leads to increased systemic exposure of simvastatin acid, elevating myopathy risk.'
  },
  {
    drug: 'SIMVASTATIN', phenotype: Phenotype.NM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard simvastatin dosing appropriate.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dose: 20-40mg daily in the evening.',
    mechanism: 'Normal SLCO1B1 transporter function ensures adequate hepatic uptake and expected pharmacokinetics.'
  },
  // WARFARIN
  {
    drug: 'WARFARIN', phenotype: Phenotype.PM,
    risk_label: RiskLabel.ADJUST_DOSAGE, severity: Severity.MODERATE,
    action: 'Reduce starting dose by 30-50% based on CYP2C9 genotype. Frequent INR monitoring required.',
    evidence_level: 'A',
    dosing_recommendation: 'Reduce initial dose by 30-50%. Start with ~2-3mg/day instead of standard 5mg. Monitor INR closely.',
    mechanism: 'CYP2C9 Poor Metabolizers have severely reduced clearance of S-warfarin (the more potent enantiomer), leading to prolonged anticoagulation, elevated INR, and high bleeding risk.'
  },
  {
    drug: 'WARFARIN', phenotype: Phenotype.IM,
    risk_label: RiskLabel.ADJUST_DOSAGE, severity: Severity.LOW,
    action: 'Reduce starting dose by 15-30%. Monitor INR closely.',
    evidence_level: 'A',
    dosing_recommendation: 'Reduce initial dose by 15-30%. Start with ~3-4mg/day. Frequent INR monitoring.',
    mechanism: 'CYP2C9 Intermediate Metabolizers have moderately reduced warfarin clearance, requiring lower doses to achieve therapeutic INR range.'
  },
  {
    drug: 'WARFARIN', phenotype: Phenotype.NM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard warfarin dosing per clinical protocol.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard starting dose: 5mg daily, titrate based on INR (target 2.0-3.0).',
    mechanism: 'Normal CYP2C9 activity provides expected warfarin metabolism for standard dose-response relationship.'
  },
  // AZATHIOPRINE
  {
    drug: 'AZATHIOPRINE', phenotype: Phenotype.PM,
    risk_label: RiskLabel.TOXIC, severity: Severity.CRITICAL,
    action: 'Reduce dose by 10-fold and monitor, or consider alternative immunosuppressant.',
    evidence_level: 'A',
    dosing_recommendation: 'Reduce to 10% of standard dose (0.5-1.5 mg/kg/week in 3 divided doses) or avoid entirely.',
    mechanism: 'TPMT Poor Metabolizers accumulate extremely high levels of cytotoxic thioguanine nucleotides (TGN), causing severe and potentially fatal myelosuppression including pancytopenia.'
  },
  {
    drug: 'AZATHIOPRINE', phenotype: Phenotype.IM,
    risk_label: RiskLabel.ADJUST_DOSAGE, severity: Severity.MODERATE,
    action: 'Reduce dose by 30-70% of standard starting dose.',
    evidence_level: 'A',
    dosing_recommendation: 'Start at 30-70% of standard dose. Monitor CBC weekly for first month, then monthly.',
    mechanism: 'TPMT Intermediate Metabolizers have reduced thiopurine methylation capacity, leading to higher TGN levels and increased myelosuppression risk.'
  },
  {
    drug: 'AZATHIOPRINE', phenotype: Phenotype.NM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard azathioprine dosing. Routine monitoring.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dose: 2-3 mg/kg/day. Monitor CBC periodically.',
    mechanism: 'Normal TPMT activity provides expected thiopurine metabolism with standard risk of adverse effects.'
  },
  // FLUOROURACIL
  {
    drug: 'FLUOROURACIL', phenotype: Phenotype.PM,
    risk_label: RiskLabel.TOXIC, severity: Severity.CRITICAL,
    action: 'Contraindicated; avoid usage or use extremely reduced dose with strict monitoring.',
    evidence_level: 'A',
    dosing_recommendation: 'CONTRAINDICATED in DPYD PM. If absolutely necessary, reduce to <25% of standard dose with intensive monitoring.',
    mechanism: 'DPYD Poor Metabolizers cannot adequately catabolize fluoropyrimidines, causing accumulation of cytotoxic drug levels leading to life-threatening mucositis, myelosuppression, neurotoxicity, and potentially death.'
  },
  {
    drug: 'FLUOROURACIL', phenotype: Phenotype.IM,
    risk_label: RiskLabel.ADJUST_DOSAGE, severity: Severity.HIGH,
    action: 'Reduce dose by 25-50% and monitor for toxicity.',
    evidence_level: 'A',
    dosing_recommendation: 'Reduce initial dose by 25-50%. Monitor for severe toxicity (mucositis, diarrhea, neutropenia).',
    mechanism: 'DPYD Intermediate Metabolizers have reduced fluoropyrimidine catabolism, increasing exposure to cytotoxic metabolites and risk of severe toxicity.'
  },
  {
    drug: 'FLUOROURACIL', phenotype: Phenotype.NM,
    risk_label: RiskLabel.SAFE, severity: Severity.NONE,
    action: 'Standard fluorouracil dosing per oncology protocol.',
    evidence_level: 'A',
    dosing_recommendation: 'Standard dosing per oncology protocol. Routine toxicity monitoring.',
    mechanism: 'Normal DPYD activity provides expected fluoropyrimidine catabolism with standard toxicity risk.'
  }
];

export const SUPPORTED_DRUGS = ['CODEINE', 'WARFARIN', 'CLOPIDOGREL', 'SIMVASTATIN', 'AZATHIOPRINE', 'FLUOROURACIL'];

/**
 * LLM-style explanations per drug-phenotype pair
 */
export const LLM_EXPLANATIONS: Record<string, Record<string, { summary: string; mechanism: string; clinical_impact: string; alternative_drugs: string }>> = {
  'CLOPIDOGREL': {
    'PM': {
      summary: 'Your CYP2C19 genotype indicates you are a Poor Metabolizer, meaning clopidogrel will NOT provide adequate blood-thinning protection. This is a critical finding requiring immediate medication change.',
      mechanism: 'Clopidogrel is a prodrug requiring CYP2C19-mediated bioactivation. The *2 and *3 alleles encode non-functional CYP2C19 enzyme, preventing conversion to the active thiol metabolite needed for irreversible P2Y12 receptor blockade on platelets.',
      clinical_impact: 'Without adequate platelet inhibition, you face a 3-4× increased risk of major adverse cardiovascular events (MACE) including stent thrombosis, myocardial infarction, and stroke.',
      alternative_drugs: 'Prasugrel (Effient®) 10mg daily or Ticagrelor (Brilinta®) 90mg twice daily — both bypass CYP2C19 metabolism.'
    },
    'IM': {
      summary: 'Your CYP2C19 genotype indicates Intermediate Metabolizer status, meaning clopidogrel activation is reduced. Alternative antiplatelet therapy is recommended.',
      mechanism: 'One functional and one reduced/non-functional CYP2C19 allele results in approximately 30-40% reduced formation of the active metabolite.',
      clinical_impact: 'Intermediate metabolizers show roughly 2× increased risk of cardiovascular events on clopidogrel compared to normal metabolizers.',
      alternative_drugs: 'Prasugrel or ticagrelor preferred. If clopidogrel must be used, consider higher maintenance dose (150mg/day) though evidence is limited.'
    },
    'NM': {
      summary: 'Your CYP2C19 genotype indicates Normal Metabolizer status. Clopidogrel is expected to work as intended at standard doses.',
      mechanism: 'Normal CYP2C19 enzyme activity provides adequate conversion of clopidogrel prodrug to its active thiol metabolite for effective platelet inhibition.',
      clinical_impact: 'Standard antiplatelet efficacy expected. Continue standard dosing protocol.',
      alternative_drugs: 'No pharmacogenomic-based switch needed. Continue standard therapy.'
    },
    'RM': {
      summary: 'Your CYP2C19 genotype indicates Rapid Metabolizer status. Clopidogrel metabolism is enhanced and the drug is expected to be effective.',
      mechanism: 'The *17 gain-of-function allele increases CYP2C19 transcription, enhancing prodrug activation.',
      clinical_impact: 'Enhanced antiplatelet effect expected. Slight increase in bleeding risk but generally favorable outcome.',
      alternative_drugs: 'No change needed. Standard clopidogrel therapy is appropriate.'
    }
  },
  'CODEINE': {
    'UM': {
      summary: 'CRITICAL SAFETY ALERT: Your CYP2D6 genotype shows Ultrarapid Metabolizer status. Codeine is DANGEROUS for you as it converts too quickly to morphine, risking respiratory depression and death.',
      mechanism: 'CYP2D6 gene duplication (*1x2, *2x2) causes ultra-rapid O-demethylation of codeine to morphine, producing supratherapeutic and potentially lethal morphine concentrations.',
      clinical_impact: 'Life-threatening risk of respiratory depression, particularly dangerous in children and breastfeeding mothers. FDA Black Box Warning applies.',
      alternative_drugs: 'Non-opioid analgesics (NSAIDs, acetaminophen), or opioids not dependent on CYP2D6 (morphine direct, oxycodone with caution).'
    },
    'PM': {
      summary: 'Your CYP2D6 genotype indicates Poor Metabolizer status. Codeine will NOT provide pain relief because your body cannot convert it to its active form (morphine).',
      mechanism: 'Non-functional CYP2D6 alleles (*4, *5, *6) eliminate the O-demethylation pathway required to convert codeine to morphine.',
      clinical_impact: 'No analgesic effect from codeine. Patient may be mistakenly labeled as "drug-seeking" when the drug simply cannot work.',
      alternative_drugs: 'Acetaminophen, NSAIDs, or direct-acting opioids (morphine, hydromorphone) that do not require CYP2D6 activation.'
    },
    'NM': {
      summary: 'Your CYP2D6 genotype supports normal codeine metabolism. Standard dosing is appropriate for pain management.',
      mechanism: 'Normal CYP2D6 activity converts approximately 10% of codeine to morphine, providing expected analgesic effect.',
      clinical_impact: 'Standard pain relief expected at therapeutic doses.',
      alternative_drugs: 'No pharmacogenomic-based change needed.'
    }
  },
  'WARFARIN': {
    'PM': {
      summary: 'Your CYP2C9 genotype indicates Poor Metabolizer status. You require a significantly LOWER warfarin dose to avoid dangerous bleeding complications.',
      mechanism: 'CYP2C9 *2 and *3 alleles reduce metabolism of S-warfarin (the more potent enantiomer) by 50-90%, causing drug accumulation and excessive anticoagulation.',
      clinical_impact: 'Without dose adjustment, high risk of supratherapeutic INR, leading to major bleeding events including intracranial hemorrhage.',
      alternative_drugs: 'Direct oral anticoagulants (DOACs) like rivaroxaban or apixaban may be considered as they are less affected by CYP2C9 variants.'
    },
    'IM': {
      summary: 'Your CYP2C9 genotype shows Intermediate Metabolizer status. A moderate dose reduction of warfarin is recommended.',
      mechanism: 'One reduced-function CYP2C9 allele partially impairs S-warfarin clearance.',
      clinical_impact: 'Moderately increased sensitivity to warfarin. Closer INR monitoring needed during dose titration.',
      alternative_drugs: 'Consider DOACs if INR management is challenging.'
    },
    'NM': {
      summary: 'Your CYP2C9 genotype supports normal warfarin metabolism. Standard dosing protocol applies.',
      mechanism: 'Normal CYP2C9 activity provides expected S-warfarin clearance.',
      clinical_impact: 'Standard dose-response relationship expected.',
      alternative_drugs: 'No pharmacogenomic-based change needed.'
    }
  },
  'SIMVASTATIN': {
    'PM': {
      summary: 'Your SLCO1B1 genotype indicates Poor Function. Simvastatin levels will be dangerously elevated, causing high risk of muscle damage (rhabdomyolysis).',
      mechanism: 'SLCO1B1 *5 allele impairs hepatic uptake transporter OATP1B1, reducing simvastatin acid clearance from blood by ~220%, causing systemic myotoxic exposure.',
      clinical_impact: 'Up to 17× increased risk of simvastatin-related myopathy. Rhabdomyolysis can cause acute kidney failure.',
      alternative_drugs: 'Rosuvastatin or pravastatin (minimal SLCO1B1 dependence). Avoid simvastatin >20mg and lovastatin.'
    },
    'IM': {
      summary: 'Your SLCO1B1 genotype shows Intermediate Function. Lower simvastatin doses are recommended to reduce muscle toxicity risk.',
      mechanism: 'Heterozygous SLCO1B1 *1/*5 partially impairs hepatic uptake, moderately increasing systemic statin exposure.',
      clinical_impact: 'Approximately 4× increased myopathy risk at standard doses.',
      alternative_drugs: 'Consider rosuvastatin as alternative, or limit simvastatin to ≤20mg/day.'
    },
    'NM': {
      summary: 'Your SLCO1B1 genotype supports normal statin transport. Standard simvastatin dosing is appropriate.',
      mechanism: 'Normal OATP1B1 transporter function enables efficient hepatic uptake of simvastatin acid.',
      clinical_impact: 'Standard myopathy risk at therapeutic doses.',
      alternative_drugs: 'No pharmacogenomic-based change needed.'
    }
  },
  'AZATHIOPRINE': {
    'PM': {
      summary: 'CRITICAL: Your TPMT genotype shows Poor Metabolizer status. Standard azathioprine doses can be FATAL. Immediate 10-fold dose reduction or drug avoidance required.',
      mechanism: 'Non-functional TPMT alleles (*2, *3A, *3C) eliminate thiopurine s-methylation, shunting metabolism toward cytotoxic 6-thioguanine nucleotides (6-TGN) accumulation.',
      clinical_impact: 'Near-certain severe myelosuppression (pancytopenia) at standard doses, potentially fatal within weeks of treatment initiation.',
      alternative_drugs: 'Mycophenolate mofetil (CellCept®) as alternative immunosuppressant. If azathioprine used, reduce to 10% dose with weekly CBC monitoring.'
    },
    'IM': {
      summary: 'Your TPMT genotype shows Intermediate Metabolizer status. Dose reduction required to prevent bone marrow suppression.',
      mechanism: 'One functional and one non-functional TPMT allele results in approximately 50% reduced methylation capacity.',
      clinical_impact: 'Significantly increased risk of myelosuppression at standard doses.',
      alternative_drugs: 'Reduce dose by 30-70%. Monitor CBC weekly initially, then monthly.'
    },
    'NM': {
      summary: 'Your TPMT genotype supports normal thiopurine metabolism. Standard dosing with routine monitoring.',
      mechanism: 'Normal TPMT activity provides expected thiopurine methylation.',
      clinical_impact: 'Standard toxicity risk with routine monitoring.',
      alternative_drugs: 'No pharmacogenomic-based change needed.'
    }
  },
  'FLUOROURACIL': {
    'PM': {
      summary: 'LIFE-THREATENING: Your DPYD genotype shows Poor Metabolizer status. Fluorouracil/capecitabine is CONTRAINDICATED. Use will likely cause severe, potentially fatal toxicity.',
      mechanism: 'DPYD *2A and *13 alleles eliminate dihydropyrimidine dehydrogenase (DPD) activity, the rate-limiting enzyme for fluoropyrimidine catabolism, causing massive drug accumulation.',
      clinical_impact: 'Expected severe to fatal mucositis, neutropenic sepsis, neurotoxicity (cerebellar syndrome), and cardiotoxicity.',
      alternative_drugs: 'Discuss alternative chemotherapy regimens with oncology. If fluoropyrimidine essential, use ≤25% dose with intensive monitoring and uridine triacetate rescue available.'
    },
    'IM': {
      summary: 'Your DPYD genotype shows Intermediate Metabolizer status. Fluorouracil dose MUST be reduced by 25-50% to prevent life-threatening toxicity.',
      mechanism: 'Heterozygous DPYD variant reduces DPD enzyme activity by approximately 50%, impairing fluoropyrimidine catabolism.',
      clinical_impact: 'High risk of grade 3-4 toxicity (severe mucositis, diarrhea, myelosuppression) without dose reduction.',
      alternative_drugs: 'Reduce 5-FU/capecitabine dose by 25-50%. Ensure uridine triacetate is available for emergency rescue.'
    },
    'NM': {
      summary: 'Your DPYD genotype supports normal fluoropyrimidine metabolism. Standard oncology protocol dosing.',
      mechanism: 'Normal DPD activity provides expected fluoropyrimidine catabolism.',
      clinical_impact: 'Standard chemotherapy toxicity risk.',
      alternative_drugs: 'No pharmacogenomic-based change needed.'
    }
  }
};
