
import { VcfVariant, TARGET_GENES } from '../types';

/**
 * Deterministic VCF Parsing Logic
 * Specifically designed to extract INFO tags: GENE, STAR, RS
 * This simulates the comparison of user variant data against human reference data.
 */
export const parseVcf = (content: string): VcfVariant[] => {
  const lines = content.split('\n');
  const variants: VcfVariant[] = [];

  for (const line of lines) {
    // Skip headers and empty lines
    if (line.startsWith('#') || !line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 8) continue; // Minimal VCF columns

    const info = parts[7]; // INFO column
    const infoPairs = info.split(';');
    
    let gene: string | null = null;
    let star: string | null = null;
    let rs: string | null = null;

    for (const pair of infoPairs) {
      const [key, value] = pair.split('=');
      if (!key || !value) continue;
      
      const cleanKey = key.trim().toUpperCase();
      const cleanValue = value.trim();

      if (cleanKey === 'GENE') gene = cleanValue;
      if (cleanKey === 'STAR') star = cleanValue;
      if (cleanKey === 'RS') rs = cleanValue;
    }

    // Strict filter: only process if GENE and STAR are present and within target list
    if (gene && star && TARGET_GENES.includes(gene.toUpperCase())) {
      variants.push({ 
        gene: gene.toUpperCase(), 
        star: star, // e.g., *2, *3, *17
        rs: rs || parts[2] !== '.' ? parts[2] : 'unknown' // Fallback to ID column if RS tag missing
      });
    }
  }

  return variants;
};
