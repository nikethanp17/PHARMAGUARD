"""
pipeline.py — PharmaGuard Phase 1A
=====================================
Deterministic VCF → Phenotype → Drug-Gene pipeline.

Pipeline steps (no dosing in Phase 1A):
  1.  Accept a list of VCF-derived variants per gene (diplotype strings).
  2.  For each target gene:        phenotype = phenotype_map[gene][diplotype]
  3.  For each requested drug:     primary_gene = drug_gene_map[drug]
                                   resolved_phenotype = phenotype_map[primary_gene][diplotype]
  4.  Return PipelineResult (structured dataclass).

No ML. No AI. No Gemini. Purely deterministic rule lookup.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from cpic_loader import CPICData, load_cpic_data

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

# Target genes that this phase processes
TARGET_GENES: List[str] = [
    "CYP2D6",
    "CYP2C19",
    "CYP2C9",
    "SLCO1B1",
    "TPMT",
    "DPYD",
]

# Default diplotype when no variants are found for a gene (homozygous reference)
_DEFAULT_DIPLOTYPE = "*1/*1"


@dataclass
class GeneResult:
    """Resolved phenotype for a single gene."""

    gene: str
    diplotype: str
    phenotype: str


@dataclass
class DrugResult:
    """Pharmacogenomic resolution for a single drug."""

    drug: str
    primary_gene: str
    diplotype_used: str
    phenotype: str
    gene_found_in_vcf: bool  # True if gene had a variant in the VCF input


@dataclass
class PipelineResult:
    """Full output for one patient analysis run."""

    patient_id: str
    gene_profiles: List[GeneResult] = field(default_factory=list)
    drug_results: List[DrugResult] = field(default_factory=list)

    quality_metrics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serialise to a plain dict (JSON-safe)."""
        return {
            "patient_id": self.patient_id,
            "gene_profiles": [
                {
                    "gene": g.gene,
                    "diplotype": g.diplotype,
                    "phenotype": g.phenotype,
                }
                for g in self.gene_profiles
            ],
            "drug_results": [
                {
                    "drug": d.drug,
                    "primary_gene": d.primary_gene,
                    "diplotype_used": d.diplotype_used,
                    "phenotype": d.phenotype,
                    "gene_found_in_vcf": d.gene_found_in_vcf,
                }
                for d in self.drug_results
            ],
            "quality_metrics": self.quality_metrics,
        }


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def run_pipeline(
    patient_id: str,
    vcf_diplotypes: Dict[str, str],
    drugs: List[str],
    cpic: Optional[CPICData] = None,
) -> PipelineResult:
    """Execute the Phase 1A deterministic pipeline.

    Args:
        patient_id:      Unique patient identifier string.
        vcf_diplotypes:  Mapping of { GENE → diplotype_string } derived from
                         the patient's VCF file (after diplotypeEngine step).
                         Gene keys should be uppercase; diplotype can be any
                         standard format (normalization applied internally).
        drugs:           List of drug names to analyse (any case).
        cpic:            Optional pre-loaded CPICData instance.
                         If None, load_cpic_data() is called automatically.

    Returns:
        PipelineResult with per-gene and per-drug resolution.
    """
    if cpic is None:
        cpic = load_cpic_data()

    # -----------------------------------------------------------------------
    # Step 1: Resolve phenotype for every target gene
    # -----------------------------------------------------------------------
    gene_profiles: List[GeneResult] = []
    gene_phenotype_cache: Dict[str, str] = {}   # GENE → phenotype (fast lookup)

    for gene in TARGET_GENES:
        diplotype = vcf_diplotypes.get(gene, _DEFAULT_DIPLOTYPE)
        phenotype = cpic.phenotype_lookup(gene, diplotype)
        gene_phenotype_cache[gene] = phenotype
        gene_profiles.append(GeneResult(gene=gene, diplotype=diplotype, phenotype=phenotype))
        logger.debug("Gene %s | diplotype %s | phenotype %s", gene, diplotype, phenotype)

    # -----------------------------------------------------------------------
    # Step 2: Resolve drug → gene → phenotype
    # -----------------------------------------------------------------------
    drug_results: List[DrugResult] = []
    genes_from_vcf = {g.upper() for g in vcf_diplotypes.keys()}

    for drug_raw in drugs:
        drug = drug_raw.strip().upper()
        primary_gene = cpic.drug_gene_lookup(drug)

        if primary_gene == "Unknown":
            # Drug not in CPIC dataset — record faithfully with Unknown values
            drug_results.append(
                DrugResult(
                    drug=drug,
                    primary_gene="Unknown",
                    diplotype_used="N/A",
                    phenotype="Unknown",
                    gene_found_in_vcf=False,
                )
            )
            logger.warning("Drug '%s' has no CPIC gene mapping; skipping.", drug)
            continue

        diplotype_used = vcf_diplotypes.get(primary_gene, _DEFAULT_DIPLOTYPE)
        phenotype = gene_phenotype_cache.get(primary_gene, "Unknown")

        drug_results.append(
            DrugResult(
                drug=drug,
                primary_gene=primary_gene,
                diplotype_used=diplotype_used,
                phenotype=phenotype,
                gene_found_in_vcf=primary_gene in genes_from_vcf,
            )
        )
        logger.info(
            "Drug %s → gene %s | diplotype %s | phenotype %s",
            drug, primary_gene, diplotype_used, phenotype,
        )

    # -----------------------------------------------------------------------
    # Quality metrics
    # -----------------------------------------------------------------------
    quality_metrics = {
        "genes_resolved": len(gene_profiles),
        "genes_with_vcf_data": len(genes_from_vcf & set(TARGET_GENES)),
        "drugs_requested": len(drugs),
        "drugs_resolved": sum(1 for d in drug_results if d.primary_gene != "Unknown"),
        "drugs_unknown": sum(1 for d in drug_results if d.primary_gene == "Unknown"),
        "unknown_phenotypes": sum(1 for g in gene_profiles if g.phenotype == "Unknown"),
    }

    return PipelineResult(
        patient_id=patient_id,
        gene_profiles=gene_profiles,
        drug_results=drug_results,
        quality_metrics=quality_metrics,
    )
