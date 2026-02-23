import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, FlaskConical } from 'lucide-react';
import { DNAIcon } from './icons/DNAIcon';
import { useAuth } from '../auth/AuthContext';

const HeroSection: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const statsRef = useRef<HTMLDivElement>(null);

    const scrollToStats = () => {
        document.querySelector('#statistics')?.scrollIntoView({ behavior: 'smooth' });
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' },
        }),
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
            {/* Radial glow behind hero */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl" />
                <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-blue-500/8 blur-2xl" />
                <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full bg-purple-500/8 blur-2xl" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
                {/* Badge */}
                <motion.div
                    custom={0} initial="hidden" animate="visible" variants={fadeUp}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/25 mb-8"
                >
                    <DNAIcon size={16} className="text-blue-400" />
                    <span className="text-blue-300 text-sm font-semibold tracking-wide">CPIC-Aligned · Clinical Grade · HIPAA Compliant</span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    custom={1} initial="hidden" animate="visible" variants={fadeUp}
                    className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6"
                >
                    Your Genes — <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        Pharmacogenomic
                    </span>{' '}
                    <br className="hidden sm:block" />
                    Risk Prediction
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    custom={2} initial="hidden" animate="visible" variants={fadeUp}
                    className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-6"
                >
                    Analyze Genetic Risk. Save Lives.
                </motion.p>

                {/* Description */}
                <motion.p
                    custom={3} initial="hidden" animate="visible" variants={fadeUp}
                    className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto mb-10"
                >
                    Discover how inherited genetic variations affect your response to medications, enabling personalized drug selection and dosing.
                    By analyzing DNA from blood or saliva, this testing helps optimize efficacy, reduce adverse drug reactions (ADRs), and guide therapy —
                    particularly for antidepressants, cardiovascular drugs, and pain medications.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    custom={4} initial="hidden" animate="visible" variants={fadeUp}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
                >
                    <Link
                        to={isAuthenticated ? '/dashboard' : '/register'}
                        className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:from-blue-500 hover:to-purple-500 transition-all"
                    >
                        <FlaskConical className="w-5 h-5" />
                        Get Started Free
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <button
                        onClick={scrollToStats}
                        className="inline-flex items-center gap-2.5 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-lg rounded-2xl border border-white/15 hover:border-white/30 transition-all"
                    >
                        Learn More
                        <ChevronDown className="w-5 h-5" />
                    </button>
                    {isAuthenticated && (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-6 py-4 text-slate-300 hover:text-white font-semibold text-base transition-colors"
                        >
                            Open Dashboard →
                        </Link>
                    )}
                </motion.div>

                {/* Trust chips */}
                <motion.div
                    custom={5} initial="hidden" animate="visible" variants={fadeUp}
                    className="flex flex-wrap justify-center gap-3"
                >
                    {[
                        { icon: '🔬', text: '300+ Genes' },
                        { icon: '💊', text: '500+ Drug Interactions' },
                        { icon: '🏥', text: 'Clinical Grade' },
                        { icon: '🔒', text: 'HIPAA Secure' },
                    ].map(chip => (
                        <span
                            key={chip.text}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-sm font-medium"
                        >
                            {chip.icon} {chip.text}
                        </span>
                    ))}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-sm font-medium">
                        <DNAIcon size={14} className="text-blue-400" /> CPIC Aligned
                    </span>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-slate-500"
            >
                <ChevronDown className="w-6 h-6" />
            </motion.div>
        </section>
    );
};

export default HeroSection;
