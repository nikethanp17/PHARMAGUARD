"""
cpic_loader.py — PharmaGuard Phase 1A
======================================
Hospital-grade deterministic CPIC data loader.

Loads directly from the project's `data/` folder:
  • data/DPYD_Diplotype_Phenotype_Table.csv   — official CPIC DPYD table
  • data/relationships.csv                    — PharmGKB full relationship graph

Non-DPYD star-allele phenotype entries (CYP2D6, CYP2C19, CYP2C9, SLCO1B1,
TPMT) are embedded inline as CPIC reference constants — no separate CSV needed.

Public API:
  load_cpic_data()                      → CPICData singleton
  cpic.phenotype_lookup(gene, diplo)    → "NM" | "PM" | … | "Unknown"
  cpic.drug_gene_lookup(drug)           → "CYP2D6" | … | "Unknown"

No ML. No AI. No side-effects beyond reading the two CSV files at startup.
"""

from __future__ import annotations

import csv
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional, Tuple, cast

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_UNKNOWN = "Unknown"
_VALID_PHENOTYPES = {"PM", "IM", "NM", "RM", "UM", "INDETERMINATE", "UNKNOWN"}

# ── CPIC-authoritative Drug → primary gene (overrides PharmGKB extraction) ─
# Defined by CPIC Level A/B guidelines; not derived from relationships.csv.
_CPIC_DRUG_GENE: Dict[str, Tuple[str, str]] = {
    "CODEINE":       ("CYP2D6",  "A"),
    "WARFARIN":      ("CYP2C9",  "A"),
    "CLOPIDOGREL":   ("CYP2C19", "A"),
    "SIMVASTATIN":   ("SLCO1B1", "A"),
    "AZATHIOPRINE":  ("TPMT",    "A"),
    "FLUOROURACIL":  ("DPYD",    "A"),
    "MERCAPTOPURINE":("TPMT",    "A"),
    "THIOGUANINE":   ("TPMT",    "A"),
    "CAPECITABINE":  ("DPYD",    "A"),
    "TEGAFUR":       ("DPYD",    "A"),
    "TAMOXIFEN":     ("CYP2D6",  "A"),
    "TRAMADOL":      ("CYP2D6",  "A"),
    "NORTRIPTYLINE": ("CYP2D6",  "A"),
    "AMITRIPTYLINE": ("CYP2D6",  "A"),
    "ONDANSETRON":   ("CYP2D6",  "A"),
    "PAROXETINE":    ("CYP2D6",  "B"),
    "ESCITALOPRAM":  ("CYP2C19", "A"),
    "CITALOPRAM":    ("CYP2C19", "A"),
    "SERTRALINE":    ("CYP2C19", "B"),
    "VORICONAZOLE":  ("CYP2C19", "A"),
    "OMEPRAZOLE":    ("CYP2C19", "B"),
    "PANTOPRAZOLE":  ("CYP2C19", "B"),
    "PHENYTOIN":     ("CYP2C9",  "A"),
    "CELECOXIB":     ("CYP2C9",  "B"),
    "ATORVASTATIN":  ("SLCO1B1", "B"),
    "PRAVASTATIN":   ("SLCO1B1", "B"),
    "ROSUVASTATIN":  ("SLCO1B1", "B"),
    "FLUVASTATIN":   ("CYP2C9",  "B"),
}

# ── Embedded CPIC star-allele phenotype reference (non-DPYD genes) ─────────
# Source: CPIC guidelines (cpicpgx.org).  DPYD is loaded live from data/ CSV.
_STAR_ALLELE_PHENOTYPES: List[Tuple[str, str, str]] = [
    # (gene,   diplotype,      phenotype)
    # CYP2D6
    ("CYP2D6", "*1/*1",       "NM"),
    ("CYP2D6", "*1/*2",       "NM"),
    ("CYP2D6", "*2/*2",       "NM"),
    ("CYP2D6", "*1/*4",       "IM"),
    ("CYP2D6", "*1/*5",       "IM"),
    ("CYP2D6", "*1/*6",       "IM"),
    ("CYP2D6", "*1/*9",       "IM"),
    ("CYP2D6", "*1/*41",      "IM"),
    ("CYP2D6", "*4/*4",       "PM"),
    ("CYP2D6", "*4/*5",       "PM"),
    ("CYP2D6", "*5/*5",       "PM"),
    ("CYP2D6", "*3/*4",       "PM"),
    ("CYP2D6", "*6/*6",       "PM"),
    ("CYP2D6", "*1/*1X2",     "UM"),
    ("CYP2D6", "*1/*2X2",     "UM"),
    ("CYP2D6", "*2X2/*2X2",   "UM"),
    # CYP2C19
    ("CYP2C19","*1/*1",       "NM"),
    ("CYP2C19","*1/*17",      "RM"),
    ("CYP2C19","*17/*17",     "UM"),
    ("CYP2C19","*1/*2",       "IM"),
    ("CYP2C19","*1/*3",       "IM"),
    ("CYP2C19","*2/*17",      "IM"),
    ("CYP2C19","*2/*2",       "PM"),
    ("CYP2C19","*2/*3",       "PM"),
    ("CYP2C19","*3/*3",       "PM"),
    # CYP2C9
    ("CYP2C9", "*1/*1",       "NM"),
    ("CYP2C9", "*1/*2",       "IM"),
    ("CYP2C9", "*1/*3",       "IM"),
    ("CYP2C9", "*2/*2",       "IM"),
    ("CYP2C9", "*2/*3",       "PM"),
    ("CYP2C9", "*3/*3",       "PM"),
    ("CYP2C9", "*1/*5",       "IM"),
    ("CYP2C9", "*1/*6",       "IM"),
    ("CYP2C9", "*1/*8",       "IM"),
    ("CYP2C9", "*1/*11",      "IM"),
    # SLCO1B1
    ("SLCO1B1","*1/*1",       "NM"),
    ("SLCO1B1","*1/*5",       "IM"),
    ("SLCO1B1","*1/*15",      "IM"),
    ("SLCO1B1","*5/*5",       "PM"),
    ("SLCO1B1","*5/*15",      "PM"),
    ("SLCO1B1","*15/*15",     "PM"),
    # TPMT
    ("TPMT",   "*1/*1",       "NM"),
    ("TPMT",   "*1/*2",       "IM"),
    ("TPMT",   "*1/*3A",      "IM"),
    ("TPMT",   "*1/*3B",      "IM"),
    ("TPMT",   "*1/*3C",      "IM"),
    ("TPMT",   "*1/*4",       "IM"),
    ("TPMT",   "*2/*2",       "PM"),
    ("TPMT",   "*3A/*3A",     "PM"),
    ("TPMT",   "*3C/*3C",     "PM"),
    ("TPMT",   "*2/*3A",      "PM"),
    ("TPMT",   "*2/*3C",      "PM"),
]

# PharmGKB drug-name variants we want to capture → normalised name
_DRUG_NAME_ALIASES: Dict[str, str] = {
    "codeine":          "CODEINE",
    "warfarin":         "WARFARIN",
    "clopidogrel":      "CLOPIDOGREL",
    "simvastatin":      "SIMVASTATIN",
    "azathioprine":     "AZATHIOPRINE",
    "fluorouracil":     "FLUOROURACIL",
    "mercaptopurine":   "MERCAPTOPURINE",
    "thioguanine":      "THIOGUANINE",
    "capecitabine":     "CAPECITABINE",
    "tegafur":          "TEGAFUR",
    "tamoxifen":        "TAMOXIFEN",
    "tramadol":         "TRAMADOL",
    "amitriptyline":    "AMITRIPTYLINE",
    "nortriptyline":    "NORTRIPTYLINE",
    "paroxetine":       "PAROXETINE",
    "ondansetron":      "ONDANSETRON",
    "escitalopram":     "ESCITALOPRAM",
    "citalopram":       "CITALOPRAM",
    "sertraline":       "SERTRALINE",
    "voriconazole":     "VORICONAZOLE",
    "omeprazole":       "OMEPRAZOLE",
    "pantoprazole":     "PANTOPRAZOLE",
    "phenytoin":        "PHENYTOIN",
    "celecoxib":        "CELECOXIB",
    "atorvastatin":     "ATORVASTATIN",
    "pravastatin":      "PRAVASTATIN",
    "rosuvastatin":     "ROSUVASTATIN",
    "fluvastatin":      "FLUVASTATIN",
}

_TARGET_GENES = {"CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"}

# DPYD phenotype keyword → short code
_DPYD_PHENOTYPE_MAP = {
    "poor metabolizer":         "PM",
    "intermediate metabolizer": "IM",
    "normal metabolizer":       "NM",
    "rapid metabolizer":        "RM",
    "ultrarapid metabolizer":   "UM",
}


# ---------------------------------------------------------------------------
# Custom exception — fail fast on bad data at startup
# ---------------------------------------------------------------------------


class CPICDataError(Exception):
    """Raised when CPIC data files are malformed, missing, or unreadable.

    This exception is intentionally not caught inside this module.
    The application entry point should catch it and halt startup.
    """


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------


def _normalize_gene(gene: str) -> str:
    return gene.strip().upper()


def _normalize_drug(drug: str) -> str:
    return drug.strip().upper()


def _normalize_diplotype(diplotype: str) -> str:
    """Canonicalize diplotype to '*X/*Y' (sorted, uppercased alleles).

    Examples:
      '*4/*1'    → '*1/*4'
      '  *17/*1' → '*1/*17'
      '*2A/*1'   → '*1/*2A'
      '*1'       → '*1/*1'
    """
    diplotype = diplotype.strip()
    if "/" not in diplotype:
        allele = diplotype.strip().upper()
        return f"{allele}/{allele}"
    parts = [p.strip().upper() for p in diplotype.split("/", 1)]
    parts.sort()
    return "/".join(parts)


def _get_headers_lower(row: dict) -> FrozenSet[str]:
    return frozenset(k.strip().lower() for k in row.keys())


# ---------------------------------------------------------------------------
# Data parsers — read directly from data/ folder
# ---------------------------------------------------------------------------


def _build_star_allele_phenotype_map() -> Dict[str, Dict[str, str]]:
    """Populate phenotype map from embedded CPIC star-allele constants."""
    pmap: Dict[str, Dict[str, str]] = {}
    for gene, diplotype, phenotype in _STAR_ALLELE_PHENOTYPES:
        norm_gene  = _normalize_gene(gene)
        norm_diplo = _normalize_diplotype(diplotype)
        pmap.setdefault(norm_gene, {})[norm_diplo] = phenotype
    logger.debug("Loaded %d embedded star-allele entries.", len(_STAR_ALLELE_PHENOTYPES))
    return pmap


def _parse_dpyd_csv(dpyd_csv: Path) -> Dict[str, Dict[str, str]]:
    """Parse data/DPYD_Diplotype_Phenotype_Table.csv.

    Columns used:
      'DPYD Diplotype' | 'Coded Diplotype/Phenotype Summary'

    Returns:
        { 'DPYD': { diplotype_key: phenotype_code } }

    Raises:
        CPICDataError on missing file or required columns.
    """
    if not dpyd_csv.exists():
        raise CPICDataError(
            f"DPYD diplotype table not found: {dpyd_csv}\n"
            "Expected: data/DPYD_Diplotype_Phenotype_Table.csv"
        )

    dpyd_entries: Dict[str, str] = {}
    try:
        with open(dpyd_csv, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            first_row = next(reader, None)
            if first_row is None:
                raise CPICDataError(f"DPYD CSV is empty: {dpyd_csv}")

            headers_lower = _get_headers_lower(first_row)
            required = {"dpyd diplotype", "coded diplotype/phenotype summary"}
            missing = required - headers_lower
            if missing:
                raise CPICDataError(
                    f"DPYD CSV missing required columns: {missing}. "
                    f"Found: {headers_lower}. File: {dpyd_csv}"
                )

            fh.seek(0)
            reader = csv.DictReader(fh)
            for _row in reader:
                row: Dict[str, str] = cast(Dict[str, str], _row)
                diplotype_raw: str  = row.get("DPYD Diplotype", "").strip()
                phenotype_text: str = row.get("Coded Diplotype/Phenotype Summary", "").strip().lower()

                if not diplotype_raw or not phenotype_text:
                    continue

                # Map free-text → short code
                phenotype_code: str = _UNKNOWN
                for keyword, code in _DPYD_PHENOTYPE_MAP.items():
                    kw: str = str(keyword)
                    if kw in phenotype_text:
                        phenotype_code = code
                        break

                # Use raw diplotype as key (HGVS notation; not star-allele)
                if diplotype_raw not in dpyd_entries:
                    dpyd_entries[diplotype_raw] = phenotype_code


    except OSError as exc:
        raise CPICDataError(f"Cannot read DPYD CSV '{dpyd_csv}': {exc}") from exc

    logger.info("Loaded %d DPYD diplotype entries from %s.", len(dpyd_entries), dpyd_csv.name)
    return {"DPYD": dpyd_entries}


def _parse_relationships_csv(rel_csv: Path) -> Dict[str, str]:
    """Extract Drug → Gene map from data/relationships.csv (PharmGKB).

    We use the CPIC-authoritative override table (_CPIC_DRUG_GENE) as the
    definitive source; PharmGKB is used only to discover any additional
    drugs that might be relevant (currently unused — overrides cover all 28).

    Returns:
        { DRUG_NAME: GENE }

    Raises:
        CPICDataError on missing file.
    """
    if not rel_csv.exists():
        raise CPICDataError(
            f"PharmGKB relationships file not found: {rel_csv}\n"
            "Expected: data/relationships.csv"
        )

    # Start with CPIC authoritative mappings (these always win)
    drug_gene_map: Dict[str, str] = {
        drug: gene for drug, (gene, _) in _CPIC_DRUG_GENE.items()
    }

    # Scan relationships.csv for any additional Gene↔Chemical associations
    # for our target genes that aren't already in the override table
    try:
        with open(rel_csv, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                e1_name = row.get("Entity1_name", "").strip()
                e1_type = row.get("Entity1_type", "").strip()
                e2_name = row.get("Entity2_name", "").strip()
                e2_type = row.get("Entity2_type", "").strip()
                association = row.get("Association", "").strip().lower()

                if association != "associated":
                    continue

                gene = drug_raw = None
                if e1_type == "Gene" and e2_type == "Chemical":
                    gene, drug_raw = e1_name.upper(), e2_name.lower()
                elif e2_type == "Gene" and e1_type == "Chemical":
                    gene, drug_raw = e2_name.upper(), e1_name.lower()
                else:
                    continue

                if gene not in _TARGET_GENES:
                    continue

                drug = _DRUG_NAME_ALIASES.get(drug_raw)
                if drug and drug not in drug_gene_map:
                    drug_gene_map[drug] = gene

    except OSError as exc:
        raise CPICDataError(f"Cannot read relationships CSV '{rel_csv}': {exc}") from exc

    logger.info(
        "Drug-gene map built: %d entries (%d from CPIC guidelines, scanned %s).",
        len(drug_gene_map), len(_CPIC_DRUG_GENE), rel_csv.name,
    )
    return drug_gene_map


# ---------------------------------------------------------------------------
# Public data container
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CPICData:
    """Immutable container for loaded CPIC lookup data.

    Attributes:
        _phenotype_map:  { GENE: { DIPLOTYPE: phenotype_string } }
        _drug_gene_map:  { DRUG: gene_string }
    """

    _phenotype_map: Dict[str, Dict[str, str]] = field(repr=False)
    _drug_gene_map: Dict[str, str]            = field(repr=False)

    def phenotype_lookup(self, gene: str, diplotype: str) -> str:
        """Return phenotype for (gene, diplotype) pair → "NM"|"PM"|…|"Unknown"."""
        norm_gene  = _normalize_gene(gene)
        norm_diplo = _normalize_diplotype(diplotype)
        result = self._phenotype_map.get(norm_gene, {}).get(norm_diplo, _UNKNOWN)
        logger.debug("phenotype_lookup(%s, %s) → %s", norm_gene, norm_diplo, result)
        return result

    def drug_gene_lookup(self, drug: str) -> str:
        """Return primary pharmacogene for drug → "CYP2D6"|…|"Unknown"."""
        norm_drug = _normalize_drug(drug)
        result = self._drug_gene_map.get(norm_drug, _UNKNOWN)
        logger.debug("drug_gene_lookup(%s) → %s", norm_drug, result)
        return result

    def all_genes(self) -> list:
        return sorted(self._phenotype_map.keys())

    def all_drugs(self) -> list:
        return sorted(self._drug_gene_map.keys())

    def summary(self) -> dict:
        return {
            "genes_loaded":      len(self._phenotype_map),
            "diplotype_entries": sum(len(v) for v in self._phenotype_map.values()),
            "drugs_loaded":      len(self._drug_gene_map),
        }


# ---------------------------------------------------------------------------
# Public factory — call ONCE at application startup
# ---------------------------------------------------------------------------

_cpic_singleton: Optional[CPICData] = None


def load_cpic_data(data_dir: Optional[object] = None) -> CPICData:
    """Load CPIC data directly from the project data/ folder; return singleton.

    This function is idempotent: subsequent calls return the cached instance.

    Args:
        data_dir: Override path for the folder containing the two CSV files.
                  Defaults to  <project_root>/data/

    Returns:
        A fully populated, immutable CPICData instance.

    Raises:
        CPICDataError: If any required CSV is missing or malformed.
    """
    global _cpic_singleton

    if _cpic_singleton is not None:
        logger.debug("CPIC data already loaded; returning cached singleton.")
        return _cpic_singleton

    # Resolve data directory — default to project-root/data/
    if data_dir is None:
        # backend/cpic_loader.py → backend/ → project_root/
        data_dir = Path(__file__).parent.parent / "data"
    data_dir = Path(data_dir)  # type: ignore[arg-type]

    dpyd_csv = data_dir / "DPYD_Diplotype_Phenotype_Table.csv"
    rel_csv  = data_dir / "relationships.csv"

    logger.info("Loading CPIC data from: %s", data_dir)

    # 1. Non-DPYD phenotypes from embedded constants
    phenotype_map = _build_star_allele_phenotype_map()

    # 2. DPYD phenotypes from real CPIC CSV
    dpyd_map = _parse_dpyd_csv(dpyd_csv)
    phenotype_map.update(dpyd_map)

    # 3. Drug → Gene from PharmGKB relationships + CPIC overrides
    drug_gene_map = _parse_relationships_csv(rel_csv)

    _cpic_singleton = CPICData(
        _phenotype_map=phenotype_map,
        _drug_gene_map=drug_gene_map,
    )

    logger.info("CPIC data ready. Summary: %s", _cpic_singleton.summary())
    return _cpic_singleton


def reset_cpic_data() -> None:
    """Clear the singleton — for unit testing only."""
    global _cpic_singleton
    _cpic_singleton = None
