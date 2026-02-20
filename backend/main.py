"""
main.py — PharmaGuard Phase 1A
=================================
Application entry point.

Responsibilities:
  1. Configure logging.
  2. Load CPIC data ONCE at startup via load_cpic_data().
     → Application halts with a clear error if data is invalid.
  3. Expose run_analysis() as the integration hook for Phase 2 API.
  4. Run a built-in smoke test when executed directly.

Usage:
    python main.py
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Logging — configure before any local imports so sub-modules inherit settings
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)-20s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("pharmaguard.main")

# ---------------------------------------------------------------------------
# Local imports (after logging is configured)
# ---------------------------------------------------------------------------
from cpic_loader import CPICData, CPICDataError, load_cpic_data
from pipeline import PipelineResult, run_pipeline

# ---------------------------------------------------------------------------
# Module-level CPIC singleton — loaded once, referenced everywhere
# ---------------------------------------------------------------------------
_CPIC: Optional[CPICData] = None


def startup(data_dir: Optional[str] = None) -> None:
    """Initialise the application.  Call ONCE before serving any requests.

    Args:
        data_dir: Override path to the cpic_data/ directory.
                  Defaults to  <this_file>/../cpic_data/

    Raises:
        SystemExit: If CPIC data fails to load (hospital-grade fail-fast).
    """
    global _CPIC

    logger.info("=" * 60)
    logger.info("PharmaGuard CDSS — Phase 1A  |  Deterministic Rule Engine")
    logger.info("=" * 60)

    try:
        _CPIC = load_cpic_data(data_dir)
    except CPICDataError as exc:
        logger.critical("STARTUP FAILED — CPIC data could not be loaded.")
        logger.critical("  Reason: %s", exc)
        logger.critical("  System will NOT serve requests without valid CPIC data.")
        sys.exit(1)

    summary = _CPIC.summary()
    logger.info(
        "CPIC data loaded successfully.  Genes: %d | Diplotypes: %d | Drugs: %d",
        summary["genes_loaded"],
        summary["diplotype_entries"],
        summary["drugs_loaded"],
    )
    logger.info("Supported genes  : %s", ", ".join(_CPIC.all_genes()))
    logger.info("Supported drugs  : %s", ", ".join(_CPIC.all_drugs()))
    logger.info("Rule engine READY.")
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# Public API hook — called by Phase 2 REST layer
# ---------------------------------------------------------------------------

def run_analysis(
    patient_id: str,
    vcf_diplotypes: Dict[str, str],
    drugs: List[str],
) -> PipelineResult:
    """Run a full pharmacogenomic analysis for one patient.

    This is the stable integration hook.  Phase 2 (FastAPI / Flask) will
    import and call this function directly.  No HTTP concerns here.

    Args:
        patient_id:      Unique patient identifier.
        vcf_diplotypes:  { GENE → "*X/*Y" } dict built by the VCF parser.
        drugs:           List of drug names to evaluate.

    Returns:
        PipelineResult (see pipeline.py).

    Raises:
        RuntimeError: If startup() was not called before run_analysis().
    """
    if _CPIC is None:
        raise RuntimeError(
            "CPIC data is not loaded.  Call startup() before run_analysis()."
        )

    logger.info(
        "run_analysis | patient=%s | drugs=%s | vcf_genes=%s",
        patient_id,
        drugs,
        list(vcf_diplotypes.keys()),
    )

    result = run_pipeline(
        patient_id=patient_id,
        vcf_diplotypes=vcf_diplotypes,
        drugs=drugs,
        cpic=_CPIC,
    )

    logger.info(
        "Analysis complete | patient=%s | quality=%s",
        patient_id,
        result.quality_metrics,
    )
    return result


# ---------------------------------------------------------------------------
# Built-in smoke test — run when executed directly
# ---------------------------------------------------------------------------

def _smoke_test() -> None:
    """Simulate the sample VCF from the Phase 1 frontend test case.

    Sample VCF variants (from App.tsx SAMPLE_VCF):
        CYP2C9  *2/*3   → PM   (affects WARFARIN)
        CYP2C19 *1/*17  → RM   (affects CLOPIDOGREL)
        CYP2D6  *1/*4   → IM   (affects CODEINE)
    """
    logger.info("-" * 60)
    logger.info("SMOKE TEST — Sample VCF (from Phase 1 frontend)")
    logger.info("-" * 60)

    # Diplotypes as the diplotypeEngine would produce them
    sample_vcf_diplotypes: Dict[str, str] = {
        "CYP2C9":  "*2/*3",   # PM
        "CYP2C19": "*1/*17",  # RM
        "CYP2D6":  "*1/*4",   # IM
    }

    sample_drugs = ["WARFARIN", "CLOPIDOGREL", "CODEINE", "SIMVASTATIN", "UNKNOWNDRUG"]

    result = run_analysis(
        patient_id="SMOKE-TEST-001",
        vcf_diplotypes=sample_vcf_diplotypes,
        drugs=sample_drugs,
    )

    print("\n" + "=" * 60)
    print("  PHARMAGUARD  |  Phase 1A Smoke Test Output")
    print("=" * 60)
    print(json.dumps(result.to_dict(), indent=2))
    print("=" * 60)

    # Assertions — verifies pipeline correctness
    gene_map = {g.gene: g for g in result.gene_profiles}
    assert gene_map["CYP2C9"].phenotype  == "PM",  f"Expected PM, got {gene_map['CYP2C9'].phenotype}"
    assert gene_map["CYP2C19"].phenotype == "RM",  f"Expected RM, got {gene_map['CYP2C19'].phenotype}"
    assert gene_map["CYP2D6"].phenotype  == "IM",  f"Expected IM, got {gene_map['CYP2D6'].phenotype}"

    drug_map = {d.drug: d for d in result.drug_results}
    assert drug_map["WARFARIN"].primary_gene    == "CYP2C9",   f"Expected CYP2C9, got {drug_map['WARFARIN'].primary_gene}"
    assert drug_map["WARFARIN"].phenotype       == "PM",        f"Expected PM, got {drug_map['WARFARIN'].phenotype}"
    assert drug_map["CLOPIDOGREL"].primary_gene == "CYP2C19",  f"Expected CYP2C19, got {drug_map['CLOPIDOGREL'].primary_gene}"
    assert drug_map["CLOPIDOGREL"].phenotype    == "RM",        f"Expected RM, got {drug_map['CLOPIDOGREL'].phenotype}"
    assert drug_map["UNKNOWNDRUG"].primary_gene == "Unknown",   f"Expected Unknown, got {drug_map['UNKNOWNDRUG'].primary_gene}"

    print("\n✅  All smoke test assertions passed.\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    startup()
    _smoke_test()
