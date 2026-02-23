import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { AlertTriangle, Activity, Dna, Pill, TrendingUp } from 'lucide-react';

interface StatItem {
    label: string;
    value: number;
    suffix: string;
    prefix?: string;
    description: string;
    category: 'deaths' | 'cases' | 'genes' | 'drugs';
    color: string;
    icon: React.ElementType;
}

const STATS: StatItem[] = [
    // ADR Deaths
    { label: 'US ADR Deaths / Year', value: 100, suffix: 'K+', description: 'Adverse drug reactions cause over 100,000 deaths annually in the US alone', category: 'deaths', color: '#ef4444', icon: AlertTriangle },
    { label: 'Global ADR Deaths / Year', value: 200, suffix: 'K+', description: 'Over 200,000 deaths worldwide per year attributed to ADRs', category: 'deaths', color: '#f97316', icon: AlertTriangle },
    { label: 'ADR Hospital Admissions', value: 10, suffix: '%', description: '5-10% of all hospital admissions are due to adverse drug reactions', category: 'cases', color: '#eab308', icon: Activity },
    { label: 'Preventable ADRs', value: 50, suffix: '%', description: 'Up to 50% of ADRs are preventable through pharmacogenomic testing', category: 'cases', color: '#10b981', icon: TrendingUp },
    // Gene stats
    { label: 'Pharmacogenomic Genes', value: 300, suffix: '+', description: 'Over 300 genes with known drug interactions identified', category: 'genes', color: '#6366f1', icon: Dna },
    { label: 'Drug-Gene Pairs', value: 500, suffix: '+', description: 'Clinically actionable drug-gene interaction pairs in CPIC database', category: 'genes', color: '#8b5cf6', icon: Dna },
    // Drug stats
    { label: 'Warfarin ER Visits / Year', value: 40, suffix: 'K+', description: 'Emergency visits in the US yearly due to warfarin adverse events', category: 'drugs', color: '#ec4899', icon: Pill },
    { label: 'Clopidogrel Failures', value: 30, suffix: '%', description: 'Of patients show reduced clopidogrel efficacy due to CYP2C19 variants', category: 'drugs', color: '#0066FF', icon: Pill },
];

// Counter hook
function useCounter(target: number, duration = 2000, started: boolean) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!started) return;
        let start = 0;
        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
            else setCount(target);
        };
        requestAnimationFrame(step);
    }, [started, target, duration]);
    return count;
}

const StatCard: React.FC<{ stat: StatItem; index: number }> = ({ stat, index }) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    const count = useCounter(stat.value, 1800, inView);
    const Icon = stat.icon;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
            className="relative group bg-[rgba(30,41,59,0.65)] backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all hover:shadow-2xl"
            style={{ '--stat-color': stat.color } as React.CSSProperties}
        >
            {/* Top glow */}
            <div
                className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: stat.color }}
            />
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${stat.color}20` }}
            >
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div className="flex items-baseline gap-0.5 mb-1">
                {stat.prefix && <span className="text-2xl font-black" style={{ color: stat.color }}>{stat.prefix}</span>}
                <span className="text-4xl font-black text-white tabular-nums">{count}</span>
                <span className="text-2xl font-black" style={{ color: stat.color }}>{stat.suffix}</span>
            </div>
            <p className="text-white font-semibold text-sm mb-2">{stat.label}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{stat.description}</p>
        </motion.div>
    );
};

const GENES = [
    { name: 'CYP2D6', desc: 'Metabolizes 25% of commonly prescribed drugs including antidepressants and pain meds', color: '#0066FF' },
    { name: 'CYP2C19', desc: 'Critical for clopidogrel activation and antidepressant metabolism', color: '#8b5cf6' },
    { name: 'CYP2C9', desc: 'Warfarin and NSAID metabolism; variants cause bleeding risk', color: '#ef4444' },
    { name: 'SLCO1B1', desc: 'Statin transporter; variants cause myopathy and muscle toxicity', color: '#10b981' },
    { name: 'TPMT', desc: 'Thiopurine metabolism; critical for azathioprine dosing in cancer', color: '#f59e0b' },
    { name: 'DPYD', desc: 'Fluorouracil toxicity prediction in oncology patients', color: '#ec4899' },
];

const StatisticsDashboard: React.FC = () => {
    const headerRef = useRef<HTMLDivElement>(null);
    const headerInView = useInView(headerRef, { once: true });

    return (
        <section id="statistics" className="relative z-10 py-24 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    ref={headerRef}
                    initial={{ opacity: 0, y: 25 }}
                    animate={headerInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-bold rounded-full mb-4 uppercase tracking-wider">
                        ⚠ Global ADR Crisis
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
                        The Numbers That{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                            Demand Action
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Adverse drug reactions represent one of the largest preventable causes of death worldwide — and genomic testing is the key.
                    </p>
                </motion.div>

                {/* Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
                    {STATS.map((stat, i) => (
                        <StatCard key={stat.label} stat={stat} index={i} />
                    ))}
                </div>

                {/* Genes Table */}
                <div className="bg-[rgba(30,41,59,0.65)] backdrop-blur-md border border-white/10 rounded-3xl p-8">
                    <h3 className="text-white font-black text-2xl mb-2 text-center">6 Core Pharmacogenomic Genes</h3>
                    <p className="text-slate-400 text-sm text-center mb-8">Tested and analyzed by Your Genes</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GENES.map(g => (
                            <div
                                key={g.name}
                                className="flex items-start gap-3 p-4 rounded-xl bg-white/4 border border-white/8 hover:border-white/15 transition-all"
                            >
                                <span
                                    className="mt-0.5 px-2.5 py-0.5 rounded-lg text-xs font-black font-mono flex-shrink-0"
                                    style={{ background: `${g.color}20`, color: g.color }}
                                >
                                    {g.name}
                                </span>
                                <p className="text-slate-300 text-sm leading-relaxed">{g.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Data sources */}
                <p className="text-slate-600 text-xs text-center mt-6">
                    Sources: FDA Adverse Event Reporting System · CDC National Vital Statistics · CPIC Guidelines · WHO Pharmacovigilance Database
                </p>
            </div>
        </section>
    );
};

export default StatisticsDashboard;
