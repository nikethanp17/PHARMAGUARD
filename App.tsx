
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  AnalysisResponse, RiskLabel, Severity,
  TARGET_GENES, GeneProfile, Phenotype, DetectedVariant
} from './types';
import { SUPPORTED_DRUGS, DRUG_GENE_MAP, LLM_EXPLANATIONS } from './data/cpicData';
import { parseVcf } from './engine/vcfParser';
import { buildDiplotype } from './engine/diplotypeEngine';
import { getPhenotype } from './engine/phenotypeEngine';
import { getRecommendation } from './engine/drugEngine';
import ChatInterface from './ChatInterface';
import { useAuth } from './src/auth/AuthContext';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './src/pages/AuthPages';
import LandingPage from './src/pages/LandingPage';

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

// ── Protected Route ──────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: React.ReactNode;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 25px rgba(59,130,246,0.35)' }}>
            <i className="fas fa-dna" style={{ fontSize: '24px', color: '#fff' }} />
          </div>
          <i className="fas fa-circle-notch fa-spin" style={{ color: '#3b82f6', fontSize: '24px' }} />
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ── Session Expired Screen ───────────────────────────────────────────────────

interface SessionExpiredProps {
  onDismiss: () => void;
}
const SessionExpiredScreen: React.FC<SessionExpiredProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', padding: '24px' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '380px' }}>
        <i className="fas fa-clock" style={{ fontSize: '40px', color: '#f59e0b', marginBottom: '16px', display: 'block' }} />
        <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>Session Expired</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>You were signed out after 30 minutes of inactivity.</p>
        <button onClick={() => { onDismiss(); navigate('/login'); }}
          style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif" }}>
          <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }} />Sign In Again
        </button>
      </div>
    </div>
  );
};

// ── Dashboard (existing analysis app) ────────────────────────────────────────

interface AppProps {
  sessionExpired?: boolean;
  onSessionExpiredDismiss?: () => void;
}

const AppInner: React.FC<AppProps> = ({ sessionExpired = false, onSessionExpiredDismiss }) => {
  if (sessionExpired) {
    return <SessionExpiredScreen onDismiss={() => onSessionExpiredDismiss?.()} />;
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatRoute /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ── ChatRoute wrapper ─────────────────────────────────────────────────────────

const ChatRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ChatInterface
      analysisResults={[]}
      onBack={() => navigate('/dashboard')}
    />
  );
};

// ── Dashboard Component (the existing VCF analysis UI) ────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [subPage, setSubPage] = useState<'input' | 'results' | 'chat'>('input');
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  // User avatar widget shown in header
  const UserMenu = () => (
    <div ref={userMenuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setUserMenuOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px', padding: '7px 14px', cursor: 'pointer', color: '#e2e8f0',
          fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif",
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.fullName || 'Patient'}
        </span>
        <i className={`fas fa-chevron-${userMenuOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', color: '#64748b' }} />
      </button>
      {userMenuOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 200,
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', padding: '8px', minWidth: '200px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{user?.fullName}</p>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{user?.email}</p>
          </div>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
            padding: '9px 14px', background: 'transparent', border: 'none', borderRadius: '8px',
            color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', system-ui, sans-serif", transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="fas fa-home" style={{ width: '14px', color: '#475569' }} />
            Home Page
          </button>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '6px', paddingTop: '6px' }}>
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left',
              padding: '9px 14px', background: 'transparent', border: 'none', borderRadius: '8px',
              color: '#ef4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif", transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="fas fa-sign-out-alt" style={{ width: '14px' }} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setVcfContent(ev.target?.result as string);
      setVcfFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  };

  const loadSample = () => {
    setVcfContent(SAMPLE_VCF);
    setVcfFileName('sample_patient.vcf');
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setVcfContent(ev.target?.result as string); setVcfFileName(file.name); setError(null); };
    reader.readAsText(file);
  };

  const runAnalysis = useCallback(async () => {
    if (!vcfContent) { setError('Please upload a VCF file or load the sample.'); return; }
    const drugs = drugInput.split(',').map(d => d.trim().toUpperCase()).filter(Boolean);
    if (drugs.length === 0) { setError('Please enter at least one drug name.'); return; }

    setIsAnalyzing(true);
    setError(null);

    try {
      await new Promise(r => setTimeout(r, 800));
      const variants = parseVcf(vcfContent);
      const results: AnalysisResponse[] = [];

      for (const drug of drugs) {
        const genesForDrug = DRUG_GENE_MAP[drug] || TARGET_GENES;
        const profiles: GeneProfile[] = [];

        for (const gene of genesForDrug) {
          const geneVariants = variants.filter(v => v.gene === gene);
          const diplotype = buildDiplotype(gene, geneVariants);
          const phenotype = getPhenotype(gene, diplotype);
          const detectedVariants: DetectedVariant[] = geneVariants.map(v => ({
            gene: v.gene,
            rsid: v.rs || '',
            star_allele: v.star || '',
            zygosity: 'heterozygous',
            clinical_significance: 'Variant detected',
          }));
          profiles.push({
            gene,
            diplotype,
            phenotype,
          });
        }

        const primaryGene = profiles[0];
        const recommendation = getRecommendation(drug, profiles);
        const defaultRec: import('./types').CPICRecommendation = {
          drug,
          phenotype: primaryGene?.phenotype || Phenotype.NM,
          risk_label: RiskLabel.SAFE,
          severity: Severity.NONE,
          action: 'Standard therapeutic dosing recommended.',
          evidence_level: 'A',
          dosing_recommendation: 'Use standard dose.',
        };
        const rec = recommendation ?? defaultRec;
        const llmKey = `${drug}_${primaryGene?.phenotype}`;
        const llmExp = LLM_EXPLANATIONS[llmKey];
        const llmExplanation = typeof llmExp === 'string' ? llmExp : `Standard ${drug} dosing considerations apply based on metabolizer status.`;
        const primaryProfile = profiles[0] || { gene: TARGET_GENES[0], diplotype: '*1/*1', phenotype: Phenotype.NM };
        const allDetectedVariants = variants.filter(v => (DRUG_GENE_MAP[drug] || TARGET_GENES).includes(v.gene)).map(v => ({
          gene: v.gene,
          rsid: v.rs || '',
          star_allele: v.star || '',
          zygosity: 'heterozygous',
          clinical_significance: 'Variant detected',
        }));

        results.push({
          patient_id: `PG-${Date.now()}`,
          drug,
          timestamp: new Date().toISOString(),
          risk_assessment: {
            risk_label: rec.risk_label,
            confidence_score: 0.88,
            severity: rec.severity,
          },
          pharmacogenomic_profile: {
            primary_gene: primaryProfile.gene,
            diplotype: primaryProfile.diplotype,
            phenotype: primaryProfile.phenotype,
            detected_variants: allDetectedVariants,
          },
          clinical_recommendation: {
            action: rec.action,
            dosing_recommendation: rec.dosing_recommendation || 'Use standard dose unless otherwise indicated',
            evidence_level: rec.evidence_level,
            cpic_guideline: `CPIC Guideline for ${drug}`,
            monitoring: 'Monitor as per standard clinical practice',
          },
          llm_generated_explanation: {
            summary: llmExplanation,
            mechanism: rec.mechanism || '',
            clinical_impact: '',
            alternative_drugs: '',
          },
          quality_metrics: {
            vcf_parsing_success: true,
            variant_match_found: allDetectedVariants.length > 0,
            phenotype_determined: primaryProfile.phenotype !== Phenotype.UNKNOWN,
            drug_rule_applied: true,
            confidence_rationale: 'CPIC star-allele matching',
          },
          _all_gene_profiles: profiles,
        });
      }

      setAnalysisResults(results);
      setSubPage('results');
    } catch (err: any) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [vcfContent, drugInput]);

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(analysisResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pharmaguard_analysis_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(analysisResults, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getRiskStyle = (riskLabel: string) => {
    const styles: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      [RiskLabel.SAFE]: { bg: 'rgba(16,185,129,0.1)', text: '#34d399', border: 'rgba(16,185,129,0.3)', badge: '✓ Safe' },
      [RiskLabel.ADJUST_DOSAGE]: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)', badge: '⚠ Adjust Dosage' },
      [RiskLabel.TOXIC]: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', border: 'rgba(239,68,68,0.3)', badge: '⛔ Toxic' },
      [RiskLabel.INEFFECTIVE]: { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)', badge: '⚡ Ineffective' },
      [RiskLabel.UNKNOWN]: { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', border: 'rgba(100,116,139,0.3)', badge: '? Unknown' },
    };
    return styles[riskLabel] || styles[RiskLabel.UNKNOWN];
  };

  const getSeverityStyle = (severity: string) => {
    const colors: Record<string, string> = {
      [Severity.NONE]: '#94a3b8',
      [Severity.LOW]: '#10b981',
      [Severity.MODERATE]: '#f59e0b',
      [Severity.HIGH]: '#ef4444',
      [Severity.CRITICAL]: '#dc2626',
    };
    return colors[severity] || '#94a3b8';
  };

  const S = {
    app: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', fontFamily: "'Inter', system-ui, sans-serif" } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', position: 'sticky' as const, top: 0, zIndex: 100 },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: { width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' },
    main: { maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' },
    card: { background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', backdropFilter: 'blur(20px)', marginBottom: '24px' },
    primaryBtn: { padding: '14px 28px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', system-ui, sans-serif", width: '100%', marginTop: '8px' } as React.CSSProperties,
    input: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif", outline: 'none', boxSizing: 'border-box' as const },
  };

  // ── CHAT ────────────────────────────────────────────────────────────────────
  if (subPage === 'chat') {
    return (
      <div style={S.app}>
        <ChatInterface analysisResults={analysisResults} onBack={() => setSubPage('results')} />
      </div>
    );
  }

  // ── INPUT ───────────────────────────────────────────────────────────────────
  if (subPage === 'input') {
    return (
      <div style={S.app}>
        <header style={S.header}>
          <div style={S.logo}>
            <div style={S.logoIcon}><i className="fas fa-dna" style={{ fontSize: '20px', color: '#fff' }} /></div>
            <div>
              <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0 }}>Your Genes</h1>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Pharmacogenomic Risk Prediction</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)' }}>
              <i className="fas fa-shield-alt" style={{ marginRight: '6px' }}></i>CPIC Aligned
            </span>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>v2.0.0</span>
            <UserMenu />
          </div>
        </header>

        <main style={S.main}>
          {/* Drug Input */}
          <div style={S.card}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>
              <i className="fas fa-pills" style={{ color: '#3b82f6', marginRight: '10px' }}></i>Enter Drug Names
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Comma-separated list of drugs to analyze against your genetic profile</p>
            <input
              type="text"
              value={drugInput}
              onChange={e => setDrugInput(e.target.value)}
              placeholder="e.g. CLOPIDOGREL, WARFARIN, CODEINE"
              style={S.input}
            />
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              {SUPPORTED_DRUGS.slice(0, 8).map(drug => (
                <button key={drug} onClick={() => setDrugInput(prev => prev ? `${prev}, ${drug}` : drug)}
                  style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '8px', color: '#93c5fd', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  + {drug}
                </button>
              ))}
            </div>
          </div>

          {/* VCF upload */}
          <div style={S.card}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>
              <i className="fas fa-dna" style={{ color: '#8b5cf6', marginRight: '10px' }}></i>Upload VCF File
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Supported: VCFv4.1+, GRCh37/GRCh38</p>
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '14px', padding: '40px', textAlign: 'center', cursor: 'pointer',
                background: isDragOver ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s',
              }}>
              <input ref={fileInputRef} type="file" accept=".vcf,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
              {vcfFileName ? (
                <div>
                  <i className="fas fa-file-medical" style={{ fontSize: '32px', color: '#10b981', marginBottom: '12px', display: 'block' }} />
                  <p style={{ color: '#10b981', fontWeight: 700, fontSize: '15px' }}>{vcfFileName}</p>
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{vcfContent.split('\n').length} lines</p>
                </div>
              ) : (
                <div>
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '36px', color: '#475569', marginBottom: '12px', display: 'block' }} />
                  <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: 600 }}>Drop VCF file here, or click to browse</p>
                </div>
              )}
            </div>
            <button onClick={loadSample}
              style={{ marginTop: '14px', padding: '10px 20px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '10px', color: '#a78bfa', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' }}>
              <i className="fas fa-flask" style={{ marginRight: '8px' }}></i>Load Sample Patient VCF
            </button>
          </div>

          {error && (
            <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontSize: '14px', marginBottom: '20px' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }} />{error}
            </div>
          )}

          <button onClick={runAnalysis} disabled={isAnalyzing} style={{ ...S.primaryBtn, opacity: isAnalyzing ? 0.7 : 1 }}>
            {isAnalyzing ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />Analyzing Genome…</> : <><i className="fas fa-dna" style={{ marginRight: '8px' }} />Run Pharmacogenomic Analysis</>}
          </button>
        </main>
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <header style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}><i className="fas fa-dna" style={{ fontSize: '20px', color: '#fff' }} /></div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0 }}>Your Genes</h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '2px' }}>Analysis Results</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setSubPage('input')} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#e2e8f0', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i>New Analysis
          </button>
          <button onClick={() => setSubPage('chat')} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', color: '#e9d5ff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <i className="fas fa-robot" style={{ marginRight: '6px' }}></i>AI Chat
          </button>
          <button onClick={downloadJSON} style={{ padding: '8px 18px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#60a5fa', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            <i className="fas fa-download" style={{ marginRight: '6px' }}></i>JSON
          </button>
          <button onClick={copyToClipboard} style={{ padding: '8px 18px', background: copySuccess ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)', border: `1px solid ${copySuccess ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`, borderRadius: '10px', color: copySuccess ? '#34d399' : '#a78bfa', fontWeight: 700, fontSize: '12px', cursor: 'pointer', transition: 'all 0.3s' }}>
            <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '6px' }}></i>{copySuccess ? 'Copied!' : 'Copy'}
          </button>
          <UserMenu />
        </div>
      </header>

      <main style={S.main}>
        {/* Summary banner */}
        <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' as const }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '20px', margin: 0 }}>
              <i className="fas fa-chart-bar" style={{ color: '#3b82f6', marginRight: '10px' }}></i>
              Analysis Complete — {analysisResults.length} Drug{analysisResults.length !== 1 ? 's' : ''} Analyzed
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>VCF: {vcfFileName}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
            {(['safe', 'caution', 'high'] as const).map((level, i) => {
              const counts = [
                analysisResults.filter(r => r.risk_assessment.risk_label === RiskLabel.SAFE).length,
                analysisResults.filter(r => r.risk_assessment.risk_label === RiskLabel.ADJUST_DOSAGE).length,
                analysisResults.filter(r => [RiskLabel.TOXIC, RiskLabel.INEFFECTIVE].includes(r.risk_assessment.risk_label as RiskLabel)).length,
              ];
              const cols = ['#10b981', '#f59e0b', '#ef4444'];
              const labels = ['Safe', 'Caution', 'High Risk'];
              return (
                <div key={level} style={{ textAlign: 'center', padding: '10px 16px', background: `${cols[i]}10`, border: `1px solid ${cols[i]}30`, borderRadius: '12px' }}>
                  <div style={{ color: cols[i], fontWeight: 900, fontSize: '22px' }}>{counts[i]}</div>
                  <div style={{ color: cols[i], fontSize: '11px', fontWeight: 700 }}>{labels[i]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Result cards */}
        {analysisResults.map((result, i) => {
          const rs = getRiskStyle(result.risk_assessment.risk_label);
          const expanded = expandedCards[i] ?? false;
          return (
            <div key={i} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: '12px', marginBottom: expanded ? '20px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <div style={{ width: '48px', height: '48px', background: rs.bg, border: `2px solid ${rs.border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-pills" style={{ color: rs.text, fontSize: '20px' }} />
                  </div>
                  <div>
                    <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '20px', margin: 0 }}>{result.drug}</h3>
                    <span style={{ padding: '3px 10px', background: rs.bg, border: `1px solid ${rs.border}`, borderRadius: '20px', color: rs.text, fontSize: '12px', fontWeight: 700 }}>{rs.badge}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '20px' }}>{Math.round(result.risk_assessment.confidence_score * 100)}%</div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>Confidence</div>
                  </div>
                  <button onClick={() => setExpandedCards(p => ({ ...p, [i]: !expanded }))}
                    style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {expanded ? 'Less ▲' : 'Details ▼'}
                  </button>
                </div>
              </div>

              {expanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                  <div style={{ padding: '14px 16px', background: rs.bg, border: `1px solid ${rs.border}`, borderRadius: '12px', marginBottom: '16px' }}>
                    <p style={{ color: rs.text, fontWeight: 700, fontSize: '13px', margin: 0 }}>{result.clinical_recommendation.action}</p>
                  </div>
                  {result.llm_generated_explanation?.summary && (
                    <div style={{ padding: '14px 16px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', marginBottom: '16px' }}>
                      <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>
                        <i className="fas fa-robot" style={{ marginRight: '6px', color: '#a78bfa' }}></i>AI Explanation
                      </p>
                      <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{result.llm_generated_explanation.summary}</p>
                    </div>
                  )}
                  {(result._all_gene_profiles || []).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                      {(result._all_gene_profiles || []).map(gp => (
                        <div key={gp.gene} style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                          <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: '15px', fontFamily: "'JetBrains Mono', monospace" }}>{gp.gene}</div>
                          <div style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '2px' }}>{gp.diplotype}</div>
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>{gp.phenotype}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.llm_generated_explanation?.alternative_drugs && (
                    <div>
                      <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Alternatives</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                        {result.llm_generated_explanation.alternative_drugs.split(',').filter(Boolean).map(alt => (
                          <span key={alt} style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', color: '#34d399', fontSize: '12px', fontWeight: 600 }}>{alt.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default AppInner;
