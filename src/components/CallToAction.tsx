import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, FlaskConical, LogIn } from 'lucide-react';
import { DNAIcon } from './icons/DNAIcon';

const CallToAction: React.FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section id="about" className="relative z-10 py-24 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="relative overflow-hidden rounded-3xl"
                >
                    {/* Background gradient card */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/15 rounded-3xl" />

                    {/* Decorative orbs */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

                    {/* DNA icon watermark */}
                    <div className="absolute top-4 right-6 opacity-6">
                        <DNAIcon size={192} className="text-white opacity-5" />
                    </div>

                    <div className="relative z-10 text-center px-8 sm:px-16 py-16">
                        <span className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 text-white text-sm font-bold rounded-full mb-6">
                            <span className="inline-flex items-center gap-1.5">
                                <DNAIcon size={16} className="text-white" /> Ready to get started?
                            </span>
                        </span>

                        <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
                            Ready to Personalize <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300">
                                Your Treatment?
                            </span>
                        </h2>

                        <p className="text-slate-300 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                            Join thousands of clinicians using pharmacogenomic data to optimize drug therapy, reduce ADRs, and deliver truly personalized care.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/register"
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 hover:from-blue-500 hover:to-purple-500 transition-all"
                            >
                                <FlaskConical className="w-5 h-5" />
                                Sign Up Free — No Credit Card
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/login"
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white/8 hover:bg-white/14 text-white font-bold text-lg rounded-2xl border border-white/20 hover:border-white/35 transition-all"
                            >
                                <LogIn className="w-5 h-5" />
                                Login to Existing Account
                            </Link>
                        </div>

                        {/* Trust row */}
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-slate-400 text-sm">
                            {[
                                '🔒 HIPAA Compliant',
                                '🆓 Free to use',
                                '⚡ Instant results',
                                'CPIC Aligned',
                                '🏥 Clinical grade',
                            ].map(item => (
                                <span key={item} className="font-medium">{item}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default CallToAction;
