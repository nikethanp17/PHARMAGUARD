import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Upload, Pill, Cpu, ClipboardList, MoveRight } from 'lucide-react';

const STEPS = [
    {
        step: '01',
        icon: Upload,
        title: 'Upload Your VCF File',
        desc: 'Upload your Variant Call Format (VCF) file from any standard genetic sequencing provider. Supports GRCh37/GRCh38.',
        color: '#0066FF',
    },
    {
        step: '02',
        icon: Pill,
        title: 'Select Medications',
        desc: 'Choose from 500+ clinically annotated drugs to check interactions with your genetic profile across all major drug categories.',
        color: '#8b5cf6',
    },
    {
        step: '03',
        icon: Cpu,
        title: 'AI Analysis',
        desc: 'Our CPIC-aligned engine analyzes your genotype, builds diplotypes, infers metabolizer phenotypes, and runs drug-gene matching.',
        color: '#ec4899',
    },
    {
        step: '04',
        icon: ClipboardList,
        title: 'Get Personalized Results',
        desc: 'Receive a comprehensive, clinical-grade report with risk levels, dose recommendations, drug alternatives, and Gemini AI explanations.',
        color: '#10b981',
    },
];

const HowItWorks: React.FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section id="how-it-works" className="relative z-10 py-24 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 25 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 bg-purple-500/10 border border-purple-500/25 text-purple-400 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">
                        Simple Process
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
                        How It Works
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        From raw genetic data to clinical-grade drug safety recommendations in seconds.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="relative">
                    {/* Connector line (desktop) */}
                    <div className="hidden lg:block absolute top-[52px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#0066FF] via-purple-500 via-pink-500 to-[#10b981] opacity-30" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.step}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={inView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
                                    className="relative flex flex-col items-center text-center"
                                >
                                    {/* Step circle */}
                                    <div
                                        className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                                        style={{
                                            background: `linear-gradient(135deg, ${step.color}30, ${step.color}10)`,
                                            border: `2px solid ${step.color}40`,
                                            boxShadow: `0 8px 24px ${step.color}20`,
                                        }}
                                    >
                                        <Icon className="w-8 h-8" style={{ color: step.color }} />
                                        <span
                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center"
                                            style={{ background: step.color, color: '#fff' }}
                                        >
                                            {i + 1}
                                        </span>
                                    </div>

                                    {/* Arrow between steps (mobile) */}
                                    {i < STEPS.length - 1 && (
                                        <div className="lg:hidden flex items-center justify-center my-2 text-slate-600">
                                            <MoveRight className="w-5 h-5 rotate-90 sm:rotate-0" />
                                        </div>
                                    )}

                                    <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
