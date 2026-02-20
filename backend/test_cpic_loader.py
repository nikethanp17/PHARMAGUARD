"""
test_cpic_loader.py — PharmaGuard Phase 1A
============================================
Unit tests for the CPIC data loader and pipeline.

Test categories:
  A. Normalisation helpers
  B. Phenotype lookup (hits + fallbacks)
  C. Drug→Gene lookup (hits + fallbacks)
  D. Startup & column validation (fail-fast)
  E. Pipeline integration (end-to-end smoke)

Run with:
    python -m unittest test_cpic_loader -v
    python -m pytest     test_cpic_loader.py -v  # if pytest is installed
"""

import csv
import os
import sys
import tempfile
import unittest
from pathlib import Path
from typing import ClassVar

# Ensure the backend directory is on the path so imports work from anywhere
sys.path.insert(0, str(Path(__file__).parent))

import cpic_loader as loader
from cpic_loader import (
    CPICData,
    CPICDataError,
    _normalize_diplotype,
    _normalize_drug,
    _normalize_gene,
    load_cpic_data,
    reset_cpic_data,
)


# ---------------------------------------------------------------------------
# Helpers to build minimal in-memory CSV files for isolated tests
# ---------------------------------------------------------------------------

def _write_phenotype_csv(path: Path, rows: list[dict]) -> None:
    """Write a phenotype_mapping.csv to *path* with the given rows."""
    fieldnames = ["gene", "diplotype", "activity_score", "phenotype_summary"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _write_drug_gene_csv(path: Path, rows: list[dict]) -> None:
    """Write a drug_gene_relationship.csv to *path* with the given rows."""
    fieldnames = ["gene", "drug_name", "evidence", "association_type", "PK_PD", "PMIDs"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _make_cpic_data(phenotype_rows: list[dict], drug_rows: list[dict]) -> CPICData:
    """Create a CPICData instance directly from in-memory row lists.

    The new cpic_loader builds CPICData from parsed dicts, so we can
    construct it directly without writing temporary CSV files.
    """
    reset_cpic_data()
    pmap: dict = {}
    for row in phenotype_rows:
        gene    = row["gene"].strip().upper()
        diplo   = row["diplotype"].strip()
        # Normalise diplotype the same way the loader does
        from cpic_loader import _normalize_diplotype
        diplo   = _normalize_diplotype(diplo)
        pheno   = row["phenotype_summary"].strip().upper()
        pmap.setdefault(gene, {})[diplo] = pheno

    dgmap: dict = {}
    for row in drug_rows:
        drug = row["drug_name"].strip().upper()
        gene = row["gene"].strip().upper()
        if drug not in dgmap:
            dgmap[drug] = gene

    # Bypass load_cpic_data() and construct the frozen dataclass directly
    return CPICData(_phenotype_map=pmap, _drug_gene_map=dgmap)


# ---------------------------------------------------------------------------
# A. Normalisation
# ---------------------------------------------------------------------------

class TestNormalisation(unittest.TestCase):

    def test_gene_uppercase(self):
        self.assertEqual(_normalize_gene("cyp2d6"), "CYP2D6")

    def test_gene_strips_whitespace(self):
        self.assertEqual(_normalize_gene("  CYP2C9  "), "CYP2C9")

    def test_drug_uppercase(self):
        self.assertEqual(_normalize_drug("warfarin"), "WARFARIN")

    def test_drug_strips_whitespace(self):
        self.assertEqual(_normalize_drug("  clopidogrel  "), "CLOPIDOGREL")

    def test_diplotype_canonical_order(self):
        """*4/*1 should sort to *1/*4 (lower star first)."""
        self.assertEqual(_normalize_diplotype("*4/*1"), "*1/*4")

    def test_diplotype_already_sorted(self):
        self.assertEqual(_normalize_diplotype("*1/*4"), "*1/*4")

    def test_diplotype_strips_whitespace(self):
        self.assertEqual(_normalize_diplotype("  *1/*17  "), "*1/*17")

    def test_diplotype_uppercase_alleles(self):
        """Alleles with letters (* 2a → *2A) should be uppercased."""
        self.assertEqual(_normalize_diplotype("*1/*2a"), "*1/*2A")

    def test_diplotype_single_allele_becomes_homozygous(self):
        """A single allele '*1' should become '*1/*1'."""
        self.assertEqual(_normalize_diplotype("*1"), "*1/*1")

    def test_diplotype_homozygous_reference(self):
        self.assertEqual(_normalize_diplotype("*1/*1"), "*1/*1")


# ---------------------------------------------------------------------------
# B. Phenotype lookup
# ---------------------------------------------------------------------------

class TestPhenotypeLookup(unittest.TestCase):
    cpic: ClassVar[CPICData]  # set in setUpClass; ClassVar so Pyre2 sees it at class scope

    @classmethod
    def setUpClass(cls):
        """Build a CPICData with a small known dataset once for all tests."""
        reset_cpic_data()
        cls.cpic = _make_cpic_data(
            phenotype_rows=[
                {"gene": "CYP2C9",  "diplotype": "*1/*1",  "activity_score": "2.0", "phenotype_summary": "NM"},
                {"gene": "CYP2C9",  "diplotype": "*2/*3",  "activity_score": "0.5", "phenotype_summary": "PM"},
                {"gene": "CYP2C9",  "diplotype": "*1/*2",  "activity_score": "1.5", "phenotype_summary": "IM"},
                {"gene": "CYP2C19", "diplotype": "*1/*17", "activity_score": "2.5", "phenotype_summary": "RM"},
                {"gene": "CYP2D6",  "diplotype": "*1/*4",  "activity_score": "1.0", "phenotype_summary": "IM"},
                {"gene": "CYP2D6",  "diplotype": "*1/*1",  "activity_score": "2.0", "phenotype_summary": "NM"},
            ],
            drug_rows=[
                {"gene": "CYP2C9",  "drug_name": "WARFARIN",    "evidence": "A", "association_type": "Pharmacokinetic", "PK_PD": "PK", "PMIDs": ""},
                {"gene": "CYP2C19", "drug_name": "CLOPIDOGREL", "evidence": "A", "association_type": "Pharmacokinetic", "PK_PD": "PK", "PMIDs": ""},
                {"gene": "CYP2D6",  "drug_name": "CODEINE",     "evidence": "A", "association_type": "Pharmacokinetic", "PK_PD": "PK", "PMIDs": ""},
            ],
        )

    @classmethod
    def tearDownClass(cls):
        reset_cpic_data()

    # --- Known diplotypes ---

    def test_nm_lookup(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C9", "*1/*1"), "NM")

    def test_pm_lookup(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C9", "*2/*3"), "PM")

    def test_im_lookup(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C9", "*1/*2"), "IM")

    def test_rm_lookup(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C19", "*1/*17"), "RM")

    def test_im_lookup_cyp2d6(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2D6", "*1/*4"), "IM")

    # --- Normalisation in lookup ---

    def test_diplo_reverse_order_still_resolves(self):
        """'*3/*2' should resolve the same as '*2/*3' after normalisation."""
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C9", "*3/*2"), "PM")

    def test_diplo_lowercase_gene_resolves(self):
        self.assertEqual(self.cpic.phenotype_lookup("cyp2c9", "*1/*1"), "NM")

    def test_diplo_lowercase_alleles_resolve(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C9", "*1/*1"), "NM")

    # --- Fallbacks ---

    def test_unknown_diplotype_returns_unknown(self):
        self.assertEqual(self.cpic.phenotype_lookup("CYP2C9", "*99/*99"), "Unknown")

    def test_unknown_gene_returns_unknown(self):
        self.assertEqual(self.cpic.phenotype_lookup("FAKEGENE", "*1/*1"), "Unknown")


# ---------------------------------------------------------------------------
# C. Drug → Gene lookup
# ---------------------------------------------------------------------------

class TestDrugGeneLookup(unittest.TestCase):
    cpic: ClassVar[CPICData]  # set in setUpClass; ClassVar so Pyre2 sees it at class scope

    @classmethod
    def setUpClass(cls):
        reset_cpic_data()
        cls.cpic = _make_cpic_data(
            phenotype_rows=[
                {"gene": "CYP2D6", "diplotype": "*1/*1", "activity_score": "2.0", "phenotype_summary": "NM"},
            ],
            drug_rows=[
                {"gene": "CYP2D6",  "drug_name": "CODEINE",     "evidence": "A", "association_type": "PK", "PK_PD": "PK", "PMIDs": ""},
                {"gene": "CYP2C9",  "drug_name": "WARFARIN",    "evidence": "A", "association_type": "PK", "PK_PD": "PK", "PMIDs": ""},
                {"gene": "CYP2C19", "drug_name": "CLOPIDOGREL", "evidence": "A", "association_type": "PK", "PK_PD": "PK", "PMIDs": ""},
                {"gene": "SLCO1B1", "drug_name": "SIMVASTATIN", "evidence": "A", "association_type": "PK", "PK_PD": "PK", "PMIDs": ""},
            ],
        )

    @classmethod
    def tearDownClass(cls):
        reset_cpic_data()

    def test_codeine_maps_to_cyp2d6(self):
        self.assertEqual(self.cpic.drug_gene_lookup("CODEINE"), "CYP2D6")

    def test_warfarin_maps_to_cyp2c9(self):
        self.assertEqual(self.cpic.drug_gene_lookup("WARFARIN"), "CYP2C9")

    def test_clopidogrel_maps_to_cyp2c19(self):
        self.assertEqual(self.cpic.drug_gene_lookup("CLOPIDOGREL"), "CYP2C19")

    def test_simvastatin_maps_to_slco1b1(self):
        self.assertEqual(self.cpic.drug_gene_lookup("SIMVASTATIN"), "SLCO1B1")

    def test_lowercase_drug_resolves(self):
        self.assertEqual(self.cpic.drug_gene_lookup("codeine"), "CYP2D6")

    def test_mixed_case_drug_resolves(self):
        self.assertEqual(self.cpic.drug_gene_lookup("Warfarin"), "CYP2C9")

    def test_unknown_drug_returns_unknown(self):
        self.assertEqual(self.cpic.drug_gene_lookup("ASPIRIN"), "Unknown")

    def test_empty_drug_returns_unknown(self):
        self.assertEqual(self.cpic.drug_gene_lookup(""), "Unknown")


# ---------------------------------------------------------------------------
# D. Startup & column validation (fail-fast)
# ---------------------------------------------------------------------------

class TestStartupValidation(unittest.TestCase):

    def setUp(self):
        reset_cpic_data()

    def tearDown(self):
        reset_cpic_data()

    # ── Helpers: write minimal valid/invalid CSVs in the new schema ────────

    @staticmethod
    def _write_dpyd_csv(path: Path, bad_columns: bool = False) -> None:
        """Write a minimal DPYD_Diplotype_Phenotype_Table.csv."""
        if bad_columns:
            with open(path, "w", newline="") as fh:
                writer = csv.DictWriter(fh, fieldnames=["DPYD Diplotype", "Activity Score"])
                writer.writeheader()
                writer.writerow({"DPYD Diplotype": "Reference/Reference", "Activity Score": "2.0"})
        else:
            with open(path, "w", newline="") as fh:
                cols = ["DPYD Diplotype", "Activity Score",
                        "Coded Diplotype/Phenotype Summary", "EHR Priority Notation"]
                writer = csv.DictWriter(fh, fieldnames=cols)
                writer.writeheader()
                writer.writerow({
                    "DPYD Diplotype": "Reference/Reference",
                    "Activity Score": "2.0",
                    "Coded Diplotype/Phenotype Summary": "DPYD Normal Metabolizer",
                    "EHR Priority Notation": "Normal/Routine/Low Risk",
                })

    @staticmethod
    def _write_rel_csv(path: Path) -> None:
        """Write a minimal valid relationships.csv."""
        with open(path, "w", newline="") as fh:
            cols = ["Entity1_id","Entity1_name","Entity1_type",
                    "Entity2_id","Entity2_name","Entity2_type",
                    "Evidence","Association","PK","PD","PMIDs"]
            writer = csv.DictWriter(fh, fieldnames=cols)
            writer.writeheader()
            writer.writerow({
                "Entity1_id": "PA128", "Entity1_name": "CYP2D6", "Entity1_type": "Gene",
                "Entity2_id": "PA100", "Entity2_name": "codeine", "Entity2_type": "Chemical",
                "Evidence": "ClinicalAnnotation", "Association": "associated",
                "PK": "PK", "PD": "", "PMIDs": "123456",
            })

    def test_missing_dpyd_csv_raises(self):
        """If DPYD_Diplotype_Phenotype_Table.csv is absent, CPICDataError must be raised."""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._write_rel_csv(d / "relationships.csv")  # only relationships, DPYD missing
            with self.assertRaises(CPICDataError):
                load_cpic_data(data_dir=d)

    def test_missing_relationships_csv_raises(self):
        """If relationships.csv is absent, CPICDataError must be raised."""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._write_dpyd_csv(d / "DPYD_Diplotype_Phenotype_Table.csv")  # only DPYD
            with self.assertRaises(CPICDataError):
                load_cpic_data(data_dir=d)

    def test_dpyd_csv_missing_required_column_raises(self):
        """DPYD CSV missing 'Coded Diplotype/Phenotype Summary' must raise CPICDataError."""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._write_dpyd_csv(d / "DPYD_Diplotype_Phenotype_Table.csv", bad_columns=True)
            self._write_rel_csv(d / "relationships.csv")
            with self.assertRaises(CPICDataError) as ctx:
                load_cpic_data(data_dir=d)
            self.assertIn("coded diplotype/phenotype summary", str(ctx.exception).lower())

    def test_empty_dpyd_csv_raises(self):
        """A completely empty DPYD CSV must raise CPICDataError."""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            (d / "DPYD_Diplotype_Phenotype_Table.csv").write_text("")
            self._write_rel_csv(d / "relationships.csv")
            with self.assertRaises(CPICDataError):
                load_cpic_data(data_dir=d)

    def test_singleton_not_reloaded(self):
        """Calling load_cpic_data twice should return the same object."""
        real_data_dir = Path(__file__).parent.parent / "data"
        if not real_data_dir.exists():
            self.skipTest("data/ folder not found.")
        first  = load_cpic_data(data_dir=real_data_dir)
        second = load_cpic_data(data_dir=real_data_dir)
        self.assertIs(first, second, "Singleton violated: different objects returned")


# ---------------------------------------------------------------------------
# E. Pipeline integration (end-to-end)
# ---------------------------------------------------------------------------

class TestPipelineIntegration(unittest.TestCase):
    cpic: ClassVar[CPICData]  # set in setUpClass; ClassVar so Pyre2 sees it at class scope

    @classmethod
    def setUpClass(cls):
        """Load real CPIC data from data/ folder (default loader path)."""
        reset_cpic_data()
        # Default path: project_root/data/ — loader auto-discovers it
        real_data_dir = Path(__file__).parent.parent / "data"
        if not real_data_dir.exists():
            raise unittest.SkipTest(
                f"data/ dir not found at {real_data_dir}. "
                "Skipping integration tests."
            )
        cls.cpic = load_cpic_data(data_dir=real_data_dir)

    @classmethod
    def tearDownClass(cls):
        reset_cpic_data()

    def _run(self, vcf, drugs):
        from pipeline import run_pipeline
        return run_pipeline(
            patient_id="TEST-INT-001",
            vcf_diplotypes=vcf,
            drugs=drugs,
            cpic=self.cpic,
        )

    def test_warfarin_pm_resolution(self):
        """CYP2C9 *2/*3 → PM; WARFARIN → CYP2C9; phenotype = PM."""
        result = self._run({"CYP2C9": "*2/*3"}, ["WARFARIN"])
        drug = {d.drug: d for d in result.drug_results}["WARFARIN"]
        self.assertEqual(drug.primary_gene, "CYP2C9")
        self.assertEqual(drug.phenotype, "PM")

    def test_clopidogrel_rm_resolution(self):
        """CYP2C19 *1/*17 → RM; CLOPIDOGREL → CYP2C19; phenotype = RM."""
        result = self._run({"CYP2C19": "*1/*17"}, ["CLOPIDOGREL"])
        drug = {d.drug: d for d in result.drug_results}["CLOPIDOGREL"]
        self.assertEqual(drug.primary_gene, "CYP2C19")
        self.assertEqual(drug.phenotype, "RM")

    def test_codeine_im_resolution(self):
        """CYP2D6 *1/*4 → IM; CODEINE → CYP2D6; phenotype = IM."""
        result = self._run({"CYP2D6": "*1/*4"}, ["CODEINE"])
        drug = {d.drug: d for d in result.drug_results}["CODEINE"]
        self.assertEqual(drug.primary_gene, "CYP2D6")
        self.assertEqual(drug.phenotype, "IM")

    def test_unknown_drug_graceful(self):
        """An unrecognised drug should resolve to Unknown without crashing."""
        result = self._run({}, ["UNKNOWNDRUG"])
        drug = {d.drug: d for d in result.drug_results}["UNKNOWNDRUG"]
        self.assertEqual(drug.primary_gene, "Unknown")
        self.assertEqual(drug.phenotype, "Unknown")

    def test_no_vcf_defaults_to_nm(self):
        """With no VCF data, all genes default to *1/*1 → NM."""
        result = self._run({}, ["WARFARIN"])
        gene_map = {g.gene: g for g in result.gene_profiles}
        self.assertEqual(gene_map["CYP2C9"].diplotype, "*1/*1")
        self.assertEqual(gene_map["CYP2C9"].phenotype, "NM")

    def test_quality_metrics_structure(self):
        result = self._run({"CYP2C9": "*2/*3"}, ["WARFARIN", "UNKNOWNDRUG"])
        qm = result.quality_metrics
        self.assertIn("genes_resolved", qm)
        self.assertIn("drugs_resolved", qm)
        self.assertIn("drugs_unknown", qm)
        self.assertEqual(qm["drugs_resolved"], 1)
        self.assertEqual(qm["drugs_unknown"],  1)

    def test_to_dict_is_json_serialisable(self):
        import json
        result = self._run({"CYP2C9": "*2/*3"}, ["WARFARIN"])
        try:
            json.dumps(result.to_dict())
        except (TypeError, ValueError) as exc:
            self.fail(f"to_dict() is not JSON-serialisable: {exc}")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
