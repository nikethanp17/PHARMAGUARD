
import { Phenotype } from '../types';
import { PHENOTYPE_MAP } from '../data/cpicData';

/**
 * Maps gene + diplotype → phenotype
 */
export const getPhenotype = (gene: string, diplotype: string): Phenotype => {
  const geneMap = PHENOTYPE_MAP[gene];
  if (!geneMap) return Phenotype.UNKNOWN;

  return geneMap[diplotype] || Phenotype.NM; // Fallback to NM for *1/*1 variations
};
