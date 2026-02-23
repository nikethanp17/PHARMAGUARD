import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { BookOpen, Cpu, Stethoscope, ShieldCheck, Zap, TestTube, Database } from 'lucide-react';

const FEATURES = [
    {
        icon: BookOpen,
        title: 'CPIC-Aligned Recommendations',
        desc: 'Every recommendation follows Clinical Pharmacogenomics Implementation Consortium (CPIC) Level A/B evidence guidelines.',
        color: '#0066FF',
        badge: 'FDA Referenced',
    },
    {
        icon: Cpu,
        title: 'Gemini AI Explanations',
        desc: 'Google Gemini Power provides plain-language explanations of complex genetic results, making pharmacogenomics accessible to every clinician.',
        color: '#8b5cf6',
        badge: 'Powered by Gemini',
    },
    {
        icon: Stethoscope,
        title: 'Clinical-Grade Accuracy',
        desc: 'Multi-step VCF parsing, diplotype building, phenotype inference, and drug matching — validated against CPIC reference data.',
        color: '#ec4899',
        badge: 'Clinically Validated',
    },
    {
        icon: ShieldCheck,
        title: 'HIPAA-Compliant Security',
        desc: 'Healthcare-grade security with 256-bit SSL, HTTP-only JWT cookies, bcrypt password hashing, and comprehensive audit logging.',
        color: '#10b981',
        badge: 'HIPAA Compliant',
    },
    {
        icon: Zap,
        title: 'Instant Analysis',
        desc: 'Results in seconds. Our client-side CPIC engine processes VCF files directly in the browser — your genetic data never leaves your device.',
        color: '#f59e0b',
        badge: 'Client-Side',
    },
    {
        icon: Database,
        title: 'Comprehensive Gene Database',
        desc: 'CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD — all 6 CPIC-priority genes with 100+ star alleles each.',
        color: '#6366f1',
        badge: '6 Core Genes',
    },
    {
        icon: TestTube,
        title: 'Multi-Drug Analysis',
        desc: 'Simultaneously analyze interactions between multiple drugs and your unique genetic profile in a single comprehensive report.',
        color: '#14b8a6',
        badge: '500+ Drugs',
    },
    {
        icon: BookOpen,
        title: 'Actionable Dose Guidance',
        desc: 'Beyond risk labels — specific dose adjustments, alternative drug recommendations, and contraindication flagging for each patient.',
        color: '#f43f5e',
        badge: 'Dose Optimized',
    },
];

const FeaturesSection: React.FC = () => {
    const headerRef = useRef<HTMLDivElement>(null);
    const headerInView = useInView(headerRef, { once: true });

    return (
        <section id="features" className="relative z-10 py-24 px-4 sm:px-6">
            {/* Background tint */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent pointer-events-none" />

            <div className="relative max-w-7xl mx-auto">
                <motion.div
                    ref={headerRef}
                    initial={{ opacity: 0, y: 25 }}
                    animate={headerInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/25 text-blue-400 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">
                        Why Your Genes
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
                        Engineered for{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            Clinical Excellence
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Every feature is purpose-built for healthcare — accuracy, security, and usability without compromise.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {FEATURES.map((feat, i) => {
                        const Icon = feat.icon;
                        const ref = useRef<HTMLDivElement>(null);
                        const inView = useInView(ref, { once: true, margin: '-40px' });

                        return (
                            <motion.div
                                ref={ref}
                                key={feat.title}
                                initial={{ opacity: 0, y: 36 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: (i % 4) * 0.1, duration: 0.5, ease: 'easeOut' }}
                                className="group relative bg-[rgba(30,41,59,0.65)] backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl"
                            >
                                {/* Colored top border */}
                                <div
                                    className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ background: `linear-gradient(90deg, ${feat.color}, transparent)` }}
                                />

                                {/* Badge */}
                                <span
                                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-4"
                                    style={{ background: `${feat.color}18`, color: feat.color }}
                                >
                                    {feat.badge}
                                </span>

                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                                    style={{ background: `${feat.color}15` }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: feat.color }} />
                                </div>

                                <h3 className="text-white font-bold text-sm mb-2 leading-snug">{feat.title}</h3>
                                <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
