
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResponse } from './types';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    analysisResults: AnalysisResponse[];
    onBack: () => void;
}

// @ts-ignore — Vite replaces process.env.GEMINI_API_KEY at build time via define config
const GEMINI_API_KEY: string = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemContext(results: AnalysisResponse[]): string {
    const lines: string[] = [
        'You are PharmaGuard AI — a brilliant, engaging, and friendly health & genetics expert.',
        'You are knowledgeable across ALL areas of health, medicine, genetics, genomics, nutrition, disease risk, wellness, and precision medicine.',
        'You are enthusiastic, warm, and genuinely helpful. You LOVE answering questions and helping people understand their health.',
        '',
        'CRITICAL PERSONALITY RULES:',
        '- NEVER refuse to discuss a health topic. If the user asks about cancer, heart disease, diabetes, mental health, nutrition, exercise, sleep, or ANY health topic — engage enthusiastically and provide helpful, well-researched information.',
        '- ALWAYS connect your answers back to the patient\'s genetic data when possible. For example, if asked about cancer risk, discuss how their CYP genes relate to drug metabolism for chemotherapy, or how DPYD status affects fluorouracil treatment.',
        '- Be conversational, warm, and use emojis occasionally to keep things engaging 🧬',
        '- Give thorough, detailed answers. Do NOT give short dismissive responses.',
        '- When discussing disease risk, explain how genetics AND lifestyle factors contribute.',
        '- You can discuss nutrition-gene interactions (nutrigenomics), exercise genomics, disease susceptibility, preventive health, mental health, skin health, aging, sleep, and more.',
        '- Always include actionable takeaways the patient can discuss with their doctor.',
        '- Use analogies and simple language to explain complex concepts, while still being scientifically accurate.',
        '- Format responses nicely with headers (##), bold (**text**), bullet points, and structure.',
        '- Add a "💡 Key Takeaway" or "🔬 From Your Data" section when connecting to the patient\'s genetics.',
        '',
        '=== PATIENT ANALYSIS DATA ===',
        `Patient ID: ${results[0]?.patient_id || 'N/A'}`,
        `Analysis Timestamp: ${results[0]?.timestamp || 'N/A'}`,
        '',
    ];

    const geneProfiles = results[0]?._all_gene_profiles;
    if (geneProfiles && geneProfiles.length > 0) {
        lines.push('--- PHARMACOGENOMIC PROFILE (All 6 Genes) ---');
        for (const g of geneProfiles) {
            lines.push(`  Gene: ${g.gene} | Diplotype: ${g.diplotype} | Phenotype: ${g.phenotype}`);
        }
        lines.push('');
    }

    for (const r of results) {
        lines.push(`--- DRUG ANALYSIS: ${r.drug} ---`);
        lines.push(`  Risk Label: ${r.risk_assessment.risk_label}`);
        lines.push(`  Severity: ${r.risk_assessment.severity}`);
        lines.push(`  Confidence: ${(r.risk_assessment.confidence_score * 100).toFixed(0)}%`);
        lines.push(`  Primary Gene: ${r.pharmacogenomic_profile.primary_gene}`);
        lines.push(`  Diplotype: ${r.pharmacogenomic_profile.diplotype}`);
        lines.push(`  Phenotype: ${r.pharmacogenomic_profile.phenotype}`);
        lines.push(`  Clinical Action: ${r.clinical_recommendation.action}`);
        lines.push(`  Dosing: ${r.clinical_recommendation.dosing_recommendation}`);
        lines.push(`  Monitoring: ${r.clinical_recommendation.monitoring}`);
        lines.push(`  Evidence Level: ${r.clinical_recommendation.evidence_level}`);
        if (r.pharmacogenomic_profile.detected_variants.length > 0) {
            lines.push(`  Detected Variants: ${r.pharmacogenomic_profile.detected_variants.map(v => `${v.rsid} (${v.gene} ${v.star_allele})`).join(', ')}`);
        }
        lines.push(`  LLM Summary: ${r.llm_generated_explanation.summary}`);
        lines.push(`  Mechanism: ${r.llm_generated_explanation.mechanism}`);
        lines.push(`  Clinical Impact: ${r.llm_generated_explanation.clinical_impact}`);
        lines.push(`  Alternative Drugs: ${r.llm_generated_explanation.alternative_drugs}`);
        lines.push('');
    }

    lines.push('=== RESPONSE GUIDELINES ===');
    lines.push('1. Cite specific variants (rsIDs like rs1057910) and alleles (like *2, *3) when discussing genetic findings.');
    lines.push('2. Explain biological mechanisms using enzyme names (CYP2C9, CYP2D6, SLCO1B1, TPMT, DPYD, etc.).');
    lines.push('3. Reference CPIC guidelines with evidence levels (A, B, C) when relevant.');
    lines.push('4. Use color-coded risk language: Safe (green ✅), Adjust Dosage (yellow ⚠️), Toxic (red 🔴), Ineffective (red 🔴).');
    lines.push('5. Always provide practical, actionable health advice.');
    lines.push('6. When discussing topics beyond pharmacogenomics (diet, exercise, disease risk, mental health), be enthusiastic and connect to genetics where possible.');
    lines.push('7. NEVER say "I can only discuss pharmacogenomics" or "that\'s outside my scope". You are a BROAD health and genetics expert.');
    lines.push('8. Include a brief disclaimer like "Always consult with your healthcare provider for personalized medical decisions" at the end when giving specific medical advice, but do NOT refuse to answer or be unhelpful.');

    return lines.join('\n');
}

function formatMarkdown(text: string): string {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/^### (.*$)/gm, '<h4 style="font-size:14px;font-weight:800;color:#1e293b;margin:12px 0 6px;">$1</h4>');
    html = html.replace(/^## (.*$)/gm, '<h3 style="font-size:15px;font-weight:800;color:#1e293b;margin:14px 0 8px;">$1</h3>');
    html = html.replace(/^[•\-] (.*$)/gm, '<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:#3b82f6;font-weight:700;">•</span><span>$1</span></div>');
    html = html.replace(/^(\d+)\. (.*$)/gm, '<div style="display:flex;gap:8px;margin:3px 0;"><span style="color:#3b82f6;font-weight:700;min-width:18px;">$1.</span><span>$2</span></div>');
    html = html.replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:12px;font-family:JetBrains Mono,monospace;color:#7c3aed;">$1</code>');
    html = html.replace(/\n\n/g, '<br/><br/>');
    html = html.replace(/\n/g, '<br/>');
    return html;
}

const SUGGESTED_QUESTIONS = [
    "What does my CYP2C9 Poor Metabolizer status mean for my health?",
    "Am I at higher risk for any diseases based on my genetics?",
    "How does my genotype affect how I process common foods and nutrients?",
    "What specific alleles were detected and what do they mean?",
    "What lifestyle changes can support my genetic profile?",
    "Are there safer drug alternatives for my genotype?",
    "How do my genes affect pain management options?",
    "What should I tell my doctor about these results?",
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ analysisResults, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const systemContext = buildSystemContext(analysisResults);

    useEffect(() => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'PLACEHOLDER_API_KEY' || GEMINI_API_KEY === '') {
            setApiKeyMissing(true);
        }
        // Welcome message
        setMessages([{
            role: 'assistant',
            content: `👋 **Welcome to PharmaGuard AI Chat!**\n\nI'm your personal health & genetics assistant powered by Gemini 2.5 Flash. I have full access to your analysis results for **Patient ${analysisResults[0]?.patient_id}**.\n\nI'm here to help you explore:\n- 🧬 **Your genetic profile** — what your variants mean and how they affect you\n- 💊 **Drug interactions** — risk levels, dosing, alternatives, and CPIC guidelines\n- 🔬 **Biological mechanisms** — how your enzymes process medications\n- 🏥 **Disease risk & health** — how genetics relates to overall health and wellness\n- 🥗 **Nutrition & lifestyle** — how your genes affect how you process food, exercise, and more\n- 🧠 **Anything health-related** — ask me anything about genetics, medicine, or wellness!\n\nI love answering questions, so don't hold back — ask me anything! 🚀`,
            timestamp: new Date()
        }]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Build conversation history for Gemini
        const conversationHistory = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        // Add current user message
        conversationHistory.push({ role: 'user', parts: [{ text: text }] });

        try {
            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemContext }]
                    },
                    contents: conversationHistory,
                    generationConfig: {
                        temperature: 0.8,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 4096,
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I was unable to generate a response. Please try again.';

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: aiText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err: any) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `⚠️ **Error communicating with Gemini AI:**\n\n${err.message}\n\nPlease check your API key in \`.env.local\` and ensure it's a valid Gemini API key.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getRiskSummary = () => {
        return analysisResults.map(r => {
            const colors: Record<string, string> = {
                'Safe': '#059669', 'Adjust Dosage': '#d97706',
                'Toxic': '#dc2626', 'Ineffective': '#dc2626', 'Unknown': '#6b7280'
            };
            return { drug: r.drug, label: r.risk_assessment.risk_label, color: colors[r.risk_assessment.risk_label] || '#6b7280' };
        });
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {/* Header */}
            <header style={{ background: '#0f172a', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-robot" style={{ fontSize: '16px', color: '#fff' }}></i>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            PharmaGuard AI Chat
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.2)' }}>Gemini 2.5 Flash</span>
                        </h1>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Interactive Clinical Pharmacogenomics Assistant</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Context pills */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {getRiskSummary().map((r, i) => (
                            <span key={i} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, background: r.color, color: '#fff', textTransform: 'uppercase' }}>
                                {r.drug}
                            </span>
                        ))}
                    </div>
                    <button onClick={onBack} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#e2e8f0', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                        <i className="fas fa-arrow-left" style={{ marginRight: '6px' }}></i>Back to Results
                    </button>
                </div>
            </header>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', maxWidth: '1400px', width: '100%', margin: '0 auto', gap: '0' }}>
                {/* Sidebar — Analysis Context */}
                <aside style={{ width: '300px', background: '#fff', borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto', flexShrink: 0 }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px' }}>
                        <i className="fas fa-clipboard-list" style={{ marginRight: '6px', color: '#3b82f6' }}></i>Analysis Context
                    </h3>

                    {/* Patient */}
                    <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Patient</p>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', fontFamily: "'JetBrains Mono', monospace" }}>{analysisResults[0]?.patient_id}</p>
                    </div>

                    {/* Drug Results */}
                    {analysisResults.map((r, i) => {
                        const colors: Record<string, { bg: string; text: string }> = {
                            'Safe': { bg: '#dcfce7', text: '#166534' },
                            'Adjust Dosage': { bg: '#fef3c7', text: '#92400e' },
                            'Toxic': { bg: '#fee2e2', text: '#991b1b' },
                            'Ineffective': { bg: '#fee2e2', text: '#991b1b' },
                            'Unknown': { bg: '#f1f5f9', text: '#64748b' }
                        };
                        const c = colors[r.risk_assessment.risk_label] || colors['Unknown'];
                        return (
                            <div key={i} style={{ marginBottom: '10px', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>{r.drug}</span>
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: c.bg, color: c.text, textTransform: 'uppercase' }}>{r.risk_assessment.risk_label}</span>
                                </div>
                                <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                                    {r.pharmacogenomic_profile.primary_gene} • {r.pharmacogenomic_profile.diplotype} • {r.pharmacogenomic_profile.phenotype}
                                </p>
                            </div>
                        );
                    })}

                    {/* Gene Profiles */}
                    <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '20px', marginBottom: '12px' }}>
                        <i className="fas fa-dna" style={{ marginRight: '6px', color: '#8b5cf6' }}></i>Gene Profile
                    </h3>
                    {analysisResults[0]?._all_gene_profiles?.map((g, i) => {
                        const pColors: Record<string, string> = {
                            'NM': '#059669', 'PM': '#dc2626', 'IM': '#d97706', 'RM': '#2563eb', 'UM': '#7c3aed', 'Unknown': '#94a3b8'
                        };
                        return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{g.gene}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#3b82f6' }}>{g.diplotype}</span>
                                    <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '3px', color: '#fff', background: pColors[g.phenotype] || '#94a3b8' }}>{g.phenotype}</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Suggested Questions */}
                    <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '24px', marginBottom: '12px' }}>
                        <i className="fas fa-lightbulb" style={{ marginRight: '6px', color: '#d97706' }}></i>Suggested Questions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {SUGGESTED_QUESTIONS.map((q, i) => (
                            <button key={i} onClick={() => sendMessage(q)}
                                style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#475569', cursor: 'pointer', fontWeight: 500, lineHeight: 1.4, transition: 'all 0.15s', fontFamily: "'Inter', sans-serif" }}
                                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#eff6ff'; (e.target as HTMLElement).style.borderColor = '#bfdbfe'; (e.target as HTMLElement).style.color = '#1e40af'; }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.background = '#f8fafc'; (e.target as HTMLElement).style.borderColor = '#e2e8f0'; (e.target as HTMLElement).style.color = '#475569'; }}>
                                <i className="fas fa-comment-dots" style={{ marginRight: '6px', fontSize: '9px', color: '#94a3b8' }}></i>{q}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Chat Messages */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fafbff' }}>
                    {/* API Key Warning */}
                    {apiKeyMissing && (
                        <div style={{ margin: '16px 24px 0', padding: '14px 18px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', marginTop: '2px' }}></i>
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>Gemini API Key Required</p>
                                <p style={{ fontSize: '12px', color: '#a16207', marginTop: '4px', lineHeight: 1.5 }}>
                                    Add your Gemini API key to <code style={{ background: '#fff7ed', padding: '1px 4px', borderRadius: '3px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>.env.local</code> file:
                                    <br /><code style={{ background: '#fff7ed', padding: '2px 6px', borderRadius: '3px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', display: 'inline-block', marginTop: '4px' }}>GEMINI_API_KEY=your_api_key_here</code>
                                    <br /><span style={{ fontSize: '11px', marginTop: '4px', display: 'inline-block' }}>Then restart the dev server.</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{
                                    maxWidth: msg.role === 'user' ? '70%' : '85%',
                                    padding: '16px 20px',
                                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                                        : '#ffffff',
                                    color: msg.role === 'user' ? '#fff' : '#1e293b',
                                    boxShadow: msg.role === 'user'
                                        ? '0 4px 15px rgba(59,130,246,0.25)'
                                        : '0 2px 10px rgba(0,0,0,0.06)',
                                    border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    lineHeight: 1.7,
                                }}>
                                    {msg.role === 'assistant' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <i className="fas fa-robot" style={{ fontSize: '11px', color: '#fff' }}></i>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6' }}>PharmaGuard AI</span>
                                            <span style={{ fontSize: '9px', color: '#cbd5e1' }}>{msg.timestamp.toLocaleTimeString()}</span>
                                        </div>
                                    )}
                                    {msg.role === 'user' ? (
                                        <div>{msg.content}</div>
                                    ) : (
                                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} style={{ fontSize: '13px' }} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{ padding: '16px 24px', borderRadius: '18px 18px 18px 4px', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {[0, 1, 2].map(i => (
                                            <div key={i} style={{
                                                width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6',
                                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                                                opacity: 0.4
                                            }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Analyzing with Gemini 2.5 Flash...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about your pharmacogenomic results..."
                                    rows={1}
                                    style={{
                                        width: '100%', padding: '14px 18px', paddingRight: '50px',
                                        border: '2px solid #e2e8f0', borderRadius: '14px',
                                        fontSize: '14px', outline: 'none', resize: 'none',
                                        fontFamily: "'Inter', sans-serif",
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        background: '#f8fafc',
                                        minHeight: '52px', maxHeight: '120px',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                                />
                            </div>
                            <button
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                                style={{
                                    width: '52px', height: '52px',
                                    background: isLoading || !input.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                    border: 'none', borderRadius: '14px',
                                    color: '#fff', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 15px rgba(139,92,246,0.35)',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}
                            >
                                <i className={`fas ${isLoading ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} style={{ fontSize: '16px' }}></i>
                            </button>
                        </div>
                        <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
                            <i className="fas fa-shield-alt" style={{ marginRight: '4px' }}></i>
                            Powered by Gemini 2.5 Flash • Clinical context from your analysis • Press Enter to send
                        </p>
                    </div>
                </div>
            </div>

            {/* Inline animation style */}
            <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default ChatInterface;
