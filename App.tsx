
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  AnalysisResponse,
  RiskLabel,
  Severity,
  TARGET_GENES,
  GeneProfile,
  Phenotype,
  DetectedVariant
} from './types';
import { SUPPORTED_DRUGS, DRUG_GENE_MAP, LLM_EXPLANATIONS } from './data/cpicData';
import { parseVcf } from './engine/vcfParser';
import { buildDiplotype } from './engine/diplotypeEngine';
import { getPhenotype } from './engine/phenotypeEngine';
import { getRecommendation } from './engine/drugEngine';
import ChatInterface from './ChatInterface';

// Sample VCF
const SAMPLE_VCF = `##fileformat=VCFv4.2
##FILTER=<ID=PASS,Description="All filters passed">
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene Name">
##INFO=<ID=STAR,Number=1,Type=String,Description="Star Allele">
##INFO=<ID=RS,Number=1,Type=String,Description="RS Identifier">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr10\t94938658\trs1057910\tC\tT\t100\tPASS\tGENE=CYP2C9;STAR=*2;RS=rs1057910
chr10\t94942212\trs1057911\tA\tC\t100\tPASS\tGENE=CYP2C9;STAR=*3;RS=rs1057911
chr19\t41511947\trs12248560\tC\tT\t100\tPASS\tGENE=CYP2C19;STAR=*17;RS=rs12248560
chr22\t42523612\trs1065852\tG\tA\t100\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs1065852
`;

type Page = 'input' | 'results' | 'chat';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('input');
  const [drugInput, setDrugInput] = useState<string>('CLOPIDOGREL, WARFARIN');
  const [vcfContent, setVcfContent] = useState<string>('');
  const [vcfFileName, setVcfFileName] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.vcf')) {
      setError('Invalid file format. Please upload a .vcf file (Variant Call Format v4.2).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please upload a smaller VCF file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content.includes('#CHROM') && !content.includes('##fileformat=VCF')) {
        setError('Invalid VCF file: Missing required VCF headers (#CHROM or ##fileformat).');
        return;
      }
      setVcfContent(content);
      setVcfFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const loadSampleData = () => {
    setVcfContent(SAMPLE_VCF);
    setVcfFileName('sample_pharmacogenomics.vcf');
    setError(null);
  };

  const addDrugToInput = (drug: string) => {
    const currentDrugs = drugInput.split(',').map(d => d.trim()).filter(Boolean);
    if (!currentDrugs.includes(drug.toUpperCase())) {
      const newList = [...currentDrugs, drug.toUpperCase()].join(', ');
      setDrugInput(newList);
    }
    setIsMenuOpen(false);
  };

  const getConfidence = (phenotype: Phenotype, matched: boolean): number => {
    if (!matched) return 0.4;
    if (phenotype === Phenotype.UNKNOWN) return 0.5;
    return 0.92;
  };

  const runAnalysis = useCallback(() => {
    if (!vcfContent) {
      setError('Please upload a VCF file first.');
      return;
    }
    if (!drugInput.trim()) {
      setError('Please enter at least one drug name.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);

    setTimeout(() => {
      try {
        const variants = parseVcf(vcfContent);
        const profiles: GeneProfile[] = TARGET_GENES.map(gene => {
          const diplotype = buildDiplotype(gene, variants);
          const phenotype = getPhenotype(gene, diplotype);
          return { gene, diplotype, phenotype };
        });

        const drugsToAnalyze = drugInput.split(',').map(d => d.trim()).filter(Boolean);
        const patientId = `PATIENT_${Math.floor(Math.random() * 90000) + 10000}`;
        const timestamp = new Date().toISOString();

        const results: AnalysisResponse[] = drugsToAnalyze.map(drugName => {
          const normalizedDrug = drugName.toUpperCase();
          const rec = getRecommendation(normalizedDrug, profiles);
          const primaryGene = DRUG_GENE_MAP[normalizedDrug] || 'Unknown';
          const profile = profiles.find(p => p.gene === primaryGene);
          const phenotype = profile?.phenotype || Phenotype.UNKNOWN;
          const diplotype = profile?.diplotype || '*1/*1';

          // Build detected variants for this drug's gene
          const parsedVariants = parseVcf(vcfContent);
          const geneVariants: DetectedVariant[] = parsedVariants
            .filter(v => v.gene === primaryGene)
            .map(v => ({
              rsid: v.rs,
              gene: v.gene,
              star_allele: v.star,
              zygosity: 'heterozygous',
              clinical_significance: 'pharmacogenomic_variant'
            }));

          // LLM explanations
          const drugExplanations = LLM_EXPLANATIONS[normalizedDrug];
          const phenoKey = phenotype === Phenotype.UNKNOWN ? 'NM' : phenotype;
          const llmData = drugExplanations?.[phenoKey] || {
            summary: `Analysis for ${normalizedDrug} with ${phenotype} metabolizer status. Standard clinical assessment applies.`,
            mechanism: rec?.mechanism || 'Standard drug metabolism through expected enzymatic pathways.',
            clinical_impact: rec?.action || 'No specific pharmacogenomic impact identified.',
            alternative_drugs: 'Consult prescribing physician for alternatives if needed.'
          };

          const confidence = getConfidence(phenotype, !!rec);

          return {
            patient_id: patientId,
            drug: normalizedDrug,
            timestamp,
            risk_assessment: {
              risk_label: rec?.risk_label || RiskLabel.UNKNOWN,
              confidence_score: confidence,
              severity: rec?.severity || Severity.NONE
            },
            pharmacogenomic_profile: {
              primary_gene: primaryGene,
              diplotype: diplotype,
              phenotype: phenotype,
              detected_variants: geneVariants
            },
            clinical_recommendation: {
              action: rec?.action || 'No CPIC guideline available for this drug-gene combination.',
              dosing_recommendation: rec?.dosing_recommendation || 'Standard dosing per clinical protocol.',
              evidence_level: rec?.evidence_level || 'N/A',
              cpic_guideline: `CPIC Guideline for ${normalizedDrug} and ${primaryGene}`,
              monitoring: rec?.severity === Severity.CRITICAL || rec?.severity === Severity.HIGH
                ? 'Intensive monitoring required. Weekly CBC, LFTs, and clinical assessment.'
                : 'Routine clinical monitoring per standard of care.'
            },
            llm_generated_explanation: llmData,
            quality_metrics: {
              vcf_parsing_success: true,
              variant_match_found: geneVariants.length > 0,
              phenotype_determined: phenotype !== Phenotype.UNKNOWN,
              drug_rule_applied: !!rec,
              confidence_rationale: confidence > 0.8
                ? 'High confidence: variant detected, phenotype mapped, CPIC guideline applied.'
                : confidence > 0.5
                  ? 'Moderate confidence: limited variant data or partial phenotype mapping.'
                  : 'Low confidence: no matching variants found for primary gene. Using default genotype.'
            },
            _all_gene_profiles: profiles
          };
        });

        setAnalysisResults(results);
        setPage('results');
        setExpandedCards({});
      } catch (err: any) {
        setError(err.message || 'Analysis failed. Please check your VCF file format.');
      } finally {
        setIsAnalyzing(false);
      }
    }, 1200);
  }, [vcfContent, drugInput]);

  const toggleCard = (idx: number) => {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getRiskColor = (label: string) => {
    switch (label) {
      case RiskLabel.SAFE: return { bg: '#059669', text: '#ffffff', glow: 'rgba(5,150,105,0.3)' };
      case RiskLabel.ADJUST_DOSAGE: return { bg: '#d97706', text: '#ffffff', glow: 'rgba(217,119,6,0.3)' };
      case RiskLabel.TOXIC: return { bg: '#dc2626', text: '#ffffff', glow: 'rgba(220,38,38,0.3)' };
      case RiskLabel.INEFFECTIVE: return { bg: '#dc2626', text: '#ffffff', glow: 'rgba(220,38,38,0.3)' };
      default: return { bg: '#6b7280', text: '#ffffff', glow: 'rgba(107,114,128,0.3)' };
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'critical': '#dc2626', 'high': '#ea580c', 'moderate': '#d97706',
      'low': '#2563eb', 'none': '#059669'
    };
    return colors[severity] || '#6b7280';
  };

  const copyToClipboard = () => {
    const exportData = analysisResults.map(({ _all_gene_profiles, ...rest }) => rest);
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadJSON = () => {
    const exportData = analysisResults.map(({ _all_gene_profiles, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmaguard_analysis_${analysisResults[0]?.patient_id || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==================================================================
  // INPUT PAGE
  // ==================================================================
  if (page === 'input') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        {/* Header */}
        <header style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 25px rgba(59,130,246,0.3)' }}>
              <i className="fas fa-dna" style={{ fontSize: '20px', color: '#fff' }}></i>
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>🧬 Your Genes</h1>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px' }}>Pharmacogenomic Risk Prediction System</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="fas fa-shield-alt" style={{ marginRight: '6px' }}></i>CPIC Aligned
            </span>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>v2.0.0</span>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: '900px' }}>
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.15)', padding: '8px 20px', borderRadius: '100px', marginBottom: '20px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <i className="fas fa-flask" style={{ color: '#a78bfa', fontSize: '12px' }}></i>
                <span style={{ color: '#c4b5fd', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>RIFT 2026 • Precision Medicine</span>
              </div>
              <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '16px', letterSpacing: '-1px' }}>
                Analyze Genetic Risk.<br />
                <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Save Lives.</span>
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
                Upload a VCF file and enter drug names to get AI-powered pharmacogenomic risk predictions with CPIC-aligned clinical recommendations.
              </p>
            </div>

            {/* Input Card */}
            <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '40px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* Left: Drug Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <i className="fas fa-pills" style={{ marginRight: '8px', color: '#3b82f6' }}></i>
                    Target Medication(s)
                  </label>
                  <div style={{ position: 'relative' }} ref={menuRef}>
                    <div style={{ display: 'flex', gap: '0' }}>
                      <input
                        type="text" value={drugInput}
                        onChange={(e) => setDrugInput(e.target.value)}
                        placeholder="e.g. CLOPIDOGREL, WARFARIN"
                        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRight: 'none', borderRadius: '12px 0 0 12px', padding: '14px 16px', color: '#fff', fontSize: '14px', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}
                      />
                      <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0 12px 12px 0', padding: '0 16px', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s' }}>
                        <i className={`fas fa-chevron-down`} style={{ transition: 'transform 0.2s', transform: isMenuOpen ? 'rotate(180deg)' : 'none' }}></i>
                      </button>
                    </div>
                    {isMenuOpen && (
                      <div style={{ position: 'absolute', zIndex: 50, marginTop: '6px', width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                        {SUPPORTED_DRUGS.map(drug => (
                          <button key={drug} onClick={() => addDrugToInput(drug)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(59,130,246,0.15)'}
                            onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}>
                            <i className="fas fa-plus-circle" style={{ marginRight: '8px', color: '#3b82f6', fontSize: '11px' }}></i>{drug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '11px', marginTop: '10px', lineHeight: 1.5 }}>
                    Supported: CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL.<br />
                    Enter multiple drugs separated by commas.
                  </p>
                </div>

                {/* Right: VCF Upload */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <i className="fas fa-file-code" style={{ marginRight: '8px', color: '#8b5cf6' }}></i>
                    VCF File Upload (0 – 5 MB)
                  </label>
                  <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${isDragOver ? '#3b82f6' : vcfContent ? '#10b981' : 'rgba(255,255,255,0.15)'}`, borderRadius: '16px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', background: isDragOver ? 'rgba(59,130,246,0.08)' : vcfContent ? 'rgba(16,185,129,0.05)' : 'transparent', position: 'relative' }}>
                    <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept=".vcf" style={{ display: 'none' }} />
                    {vcfContent ? (
                      <>
                        <i className="fas fa-check-circle" style={{ fontSize: '32px', color: '#10b981', marginBottom: '10px', display: 'block' }}></i>
                        <p style={{ color: '#10b981', fontWeight: 700, fontSize: '14px' }}>{vcfFileName || 'VCF Data Loaded'}</p>
                        <p style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>Click or drag to replace</p>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '32px', color: isDragOver ? '#3b82f6' : '#475569', marginBottom: '10px', display: 'block', transition: 'color 0.2s' }}></i>
                        <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '14px' }}>Drop VCF file here or click to browse</p>
                        <p style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>Required: GENE, STAR, RS tags in INFO column</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: '2px' }}></i>
                  <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '28px', alignItems: 'center' }}>
                <button onClick={runAnalysis} disabled={isAnalyzing || !vcfContent}
                  style={{ flex: 1, padding: '16px 32px', background: isAnalyzing || !vcfContent ? '#334155' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', borderRadius: '14px', cursor: isAnalyzing || !vcfContent ? 'not-allowed' : 'pointer', boxShadow: isAnalyzing || !vcfContent ? 'none' : '0 12px 35px rgba(59,130,246,0.35)', transition: 'all 0.3s', letterSpacing: '0.3px' }}>
                  {isAnalyzing ? (
                    <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '10px' }}></i>Analyzing Variants...</>
                  ) : (
                    <><i className="fas fa-bolt" style={{ marginRight: '10px' }}></i>Run Pharmacogenomic Analysis</>
                  )}
                </button>
                <button onClick={loadSampleData}
                  style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', color: '#94a3b8', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  <i className="fas fa-flask" style={{ marginRight: '8px', color: '#a78bfa' }}></i>Load Sample
                </button>
              </div>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '32px' }}>
              {[
                { icon: 'fa-dna', color: '#3b82f6', title: '6 Critical Genes', desc: 'CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD' },
                { icon: 'fa-prescription-bottle-alt', color: '#8b5cf6', title: '6 Core Drugs', desc: 'Codeine, Warfarin, Clopidogrel, Simvastatin, Azathioprine, 5-FU' },
                { icon: 'fa-shield-alt', color: '#10b981', title: 'CPIC Guidelines', desc: 'Evidence-based clinical recommendations with dosing' }
              ].map((card, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                  <i className={`fas ${card.icon}`} style={{ color: card.color, fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                  <h4 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{card.title}</h4>
                  <p style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            <span style={{ color: '#475569', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>Engine Active
            </span>
            <span style={{ color: '#475569', fontSize: '11px', fontWeight: 600 }}>
              <i className="fas fa-database" style={{ marginRight: '4px', color: '#3b82f6' }}></i>CPIC v4.1
            </span>
          </div>
          <span style={{ color: '#334155', fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>RIFT 2026 • Your Genes</span>
        </footer>
      </div>
    );
  }

  // ==================================================================
  // CHAT PAGE
  // ==================================================================
  if (page === 'chat') {
    return <ChatInterface analysisResults={analysisResults} onBack={() => setPage('results')} />;
  }

  // ==================================================================
  // RESULTS PAGE
  // ==================================================================
  const exportData = analysisResults.map(({ _all_gene_profiles, ...rest }) => rest);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: '#0f172a', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-dna" style={{ fontSize: '16px', color: '#fff' }}></i>
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>🧬 Your Genes</h1>
            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Analysis Results</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setPage('input')} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#e2e8f0', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i>New Analysis
          </button>
          <button onClick={() => setPage('chat')} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', color: '#e9d5ff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(139,92,246,0.2)' }}>
            <i className="fas fa-robot" style={{ marginRight: '6px' }}></i>AI Chat
            <span style={{ marginLeft: '6px', fontSize: '9px', background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>Gemini</span>
          </button>
          <button onClick={downloadJSON} style={{ padding: '8px 18px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#60a5fa', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            <i className="fas fa-download" style={{ marginRight: '6px' }}></i>Download JSON
          </button>
          <button onClick={copyToClipboard} style={{ padding: '8px 18px', background: copySuccess ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)', border: `1px solid ${copySuccess ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`, borderRadius: '10px', color: copySuccess ? '#34d399' : '#a78bfa', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.3s' }}>
            <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>{copySuccess ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '32px' }}>
        {/* Patient Summary Bar */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 28px', marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Patient ID</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', fontFamily: "'JetBrains Mono', monospace" }}>{analysisResults[0]?.patient_id}</p>
            </div>
            <div style={{ width: '1px', height: '36px', background: '#e2e8f0' }}></div>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Drugs Analyzed</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{analysisResults.length}</p>
            </div>
            <div style={{ width: '1px', height: '36px', background: '#e2e8f0' }}></div>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Timestamp</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{new Date(analysisResults[0]?.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {analysisResults.map((r, i) => {
              const rc = getRiskColor(r.risk_assessment.risk_label);
              return (
                <span key={i} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, background: rc.bg, color: rc.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {r.drug}: {r.risk_assessment.risk_label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Drug Result Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {analysisResults.map((result, idx) => {
            const rc = getRiskColor(result.risk_assessment.risk_label);
            const isExpanded = expandedCards[idx];
            return (
              <div key={idx} style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: `0 4px 20px ${rc.glow}`, border: '1px solid #e2e8f0', transition: 'box-shadow 0.3s' }}>
                {/* Card Header */}
                <div style={{ background: rc.bg, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleCard(idx)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <i className="fas fa-prescription-bottle-alt" style={{ fontSize: '24px', color: 'rgba(255,255,255,0.9)' }}></i>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{result.drug}</h2>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 600 }}>
                        Primary Gene: {result.pharmacogenomic_profile.primary_gene} • {result.pharmacogenomic_profile.phenotype} Metabolizer
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ padding: '8px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', fontWeight: 800, fontSize: '14px', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {result.risk_assessment.risk_label}
                    </span>
                    <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      Confidence: {(result.risk_assessment.confidence_score * 100).toFixed(0)}%
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}></i>
                  </div>
                </div>

                {/* Card Content — Always visible summary */}
                <div style={{ padding: '24px 28px' }}>
                  {/* Risk & Action Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>Clinical Action
                      </h4>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }}>{result.clinical_recommendation.action}</p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        <i className="fas fa-syringe" style={{ marginRight: '6px' }}></i>Dosing Recommendation
                      </h4>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }}>{result.clinical_recommendation.dosing_recommendation}</p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div style={{ display: 'flex', gap: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      <i className="fas fa-award" style={{ marginRight: '4px', color: '#3b82f6' }}></i>Evidence: CPIC {result.clinical_recommendation.evidence_level}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      <i className="fas fa-user" style={{ marginRight: '4px' }}></i>{result.patient_id}
                    </span>
                    <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: getSeverityBadge(result.risk_assessment.severity) + '15', color: getSeverityBadge(result.risk_assessment.severity), border: `1px solid ${getSeverityBadge(result.risk_assessment.severity)}30` }}>
                      Severity: {result.risk_assessment.severity}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: result.quality_metrics.drug_rule_applied ? '#059669' : '#94a3b8' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                      {result.quality_metrics.drug_rule_applied ? 'CPIC Rule Applied' : 'Default Rule'}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', animation: 'fadeIn 0.3s ease-out' }}>
                    {/* LLM Explanation */}
                    <div style={{ padding: '24px 28px', background: '#fafbff' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-brain" style={{ color: '#8b5cf6' }}></i>
                        AI-Generated Clinical Explanation
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <h5 style={{ fontSize: '10px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Summary</h5>
                          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>{result.llm_generated_explanation.summary}</p>
                        </div>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <h5 style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Biological Mechanism</h5>
                          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>{result.llm_generated_explanation.mechanism}</p>
                        </div>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <h5 style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Clinical Impact</h5>
                          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>{result.llm_generated_explanation.clinical_impact}</p>
                        </div>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <h5 style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Alternative Drugs</h5>
                          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.7 }}>{result.llm_generated_explanation.alternative_drugs}</p>
                        </div>
                      </div>
                    </div>

                    {/* Detected Variants */}
                    {result.pharmacogenomic_profile.detected_variants.length > 0 && (
                      <div style={{ padding: '20px 28px', borderTop: '1px solid #f1f5f9' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>
                          <i className="fas fa-search" style={{ marginRight: '8px', color: '#3b82f6' }}></i>Detected Variants
                        </h4>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {result.pharmacogenomic_profile.detected_variants.map((v, vi) => (
                            <div key={vi} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 16px', fontSize: '12px' }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#3b82f6' }}>{v.rsid}</span>
                              <span style={{ color: '#94a3b8', margin: '0 6px' }}>•</span>
                              <span style={{ fontWeight: 600, color: '#475569' }}>{v.gene} {v.star_allele}</span>
                              <span style={{ color: '#94a3b8', margin: '0 6px' }}>•</span>
                              <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{v.zygosity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monitoring */}
                    <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', background: '#fffbeb' }}>
                      <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                        <i className="fas fa-stethoscope" style={{ marginRight: '6px' }}></i>
                        <strong>Monitoring:</strong> {result.clinical_recommendation.monitoring}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Gene Profiles Table */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', marginTop: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-dna" style={{ color: '#3b82f6' }}></i>
            Complete Pharmacogenomic Profile
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Gene', 'Diplotype', 'Phenotype', 'Drug Association', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysisResults[0]?._all_gene_profiles?.map((profile) => {
                  const associatedDrug = Object.entries(DRUG_GENE_MAP).find(([, gene]) => gene === profile.gene)?.[0];
                  const pColors: Record<string, { bg: string; text: string }> = {
                    'NM': { bg: '#dcfce7', text: '#166534' }, 'PM': { bg: '#fee2e2', text: '#991b1b' },
                    'IM': { bg: '#fef3c7', text: '#92400e' }, 'RM': { bg: '#dbeafe', text: '#1e40af' },
                    'UM': { bg: '#f3e8ff', text: '#6b21a8' }, 'Unknown': { bg: '#f1f5f9', text: '#64748b' }
                  };
                  const pc = pColors[profile.phenotype] || pColors['Unknown'];
                  return (
                    <tr key={profile.gene} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{profile.gene}</td>
                      <td style={{ padding: '14px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#3b82f6', fontWeight: 600 }}>{profile.diplotype}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: pc.bg, color: pc.text }}>{profile.phenotype}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>{associatedDrug || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '14px' }}></i>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* JSON Output */}
        <div style={{ background: '#0f172a', borderRadius: '20px', overflow: 'hidden', marginTop: '28px', border: '1px solid #1e293b', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '14px 24px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <i className="fas fa-code" style={{ marginRight: '8px', color: '#3b82f6' }}></i>Structured JSON Output (RIFT 2026 Schema)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={copyToClipboard} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '4px' }}></i>{copySuccess ? 'Copied' : 'Copy'}
              </button>
              <button onClick={downloadJSON} style={{ padding: '4px 12px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', color: '#60a5fa', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                <i className="fas fa-download" style={{ marginRight: '4px' }}></i>Download
              </button>
            </div>
          </div>
          <pre style={{ padding: '20px 24px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#93c5fd', overflow: 'auto', maxHeight: '500px', lineHeight: 1.6, margin: 0 }}>
            {JSON.stringify(exportData, null, 2)}
          </pre>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>Rule Engine Active
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
            <i className="fas fa-database" style={{ marginRight: '4px', color: '#3b82f6' }}></i>CPIC v4.1
          </span>
        </div>
        <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>RIFT 2026 • Your Genes</span>
      </footer>
    </div>
  );
};

export default App;
