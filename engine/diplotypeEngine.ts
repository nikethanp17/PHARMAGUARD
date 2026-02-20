
import { VcfVariant } from '../types';

/**
 * Builds "*X/*Y" diplotype from variants
 * Logic:
 * 1. Filter variants for specific gene
 * 2. Group variants
 * 3. Handle cases with fewer than 2 alleles (assume *1 for other if one found?)
 *    Strict Rule for this CDSS: If only 1 allele found, we assume *1/X or X/*1.
 *    If 0 found, assume *1/*1 (Normal).
 */
export const buildDiplotype = (gene: string, variants: VcfVariant[]): string => {
  const geneAlleles = variants
    .filter(v => v.gene === gene)
    .map(v => v.star);

  if (geneAlleles.length === 0) return '*1/*1';
  if (geneAlleles.length === 1) {
    const alleles = ['*1', geneAlleles[0]].sort();
    return alleles.join('/');
  }
  
  // Take first two and normalize order
  const alleles = geneAlleles.slice(0, 2).sort();
  return alleles.join('/');
};
