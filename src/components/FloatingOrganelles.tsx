import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// ── SVG shapes for each organelle type ──────────────────────────────────────

const Mitochondria: React.FC<{ color: string; size: number }> = ({ color, size }) => (
    <svg width={size * 2} height={size} viewBox="0 0 80 40" fill="none">
        <ellipse cx="40" cy="20" rx="38" ry="18" stroke={color} strokeWidth="2" fill={`${color}22`} />
        {/* cristae folds */}
        {[15, 25, 35, 45, 55, 65].map(x => (
            <path key={x} d={`M${x} 6 Q${x + 3} 20 ${x} 34`} stroke={color} strokeWidth="1.2" strokeOpacity="0.7" fill="none" />
        ))}
    </svg>
);

const Nucleus: React.FC<{ color: string; size: number }> = ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="28" stroke={color} strokeWidth="2.5" fill={`${color}18`} />
        {/* nuclear envelope pores */}
        {[0, 60, 120, 180, 240, 300].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const cx = 30 + 28 * Math.cos(rad);
            const cy = 30 + 28 * Math.sin(rad);
            return <circle key={deg} cx={cx} cy={cy} r={2.5} fill={color} fillOpacity="0.6" />;
        })}
        {/* nucleolus */}
        <circle cx="30" cy="30" r="10" fill={color} fillOpacity="0.3" />
        <circle cx="30" cy="30" r="5" fill={color} fillOpacity="0.5" />
    </svg>
);

const Ribosome: React.FC<{ color: string }> = ({ color }) => (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
        <ellipse cx="7" cy="7" rx="6.5" ry="5" fill={color} fillOpacity="0.75" />
        <ellipse cx="12" cy="4.5" rx="5" ry="4" fill={color} fillOpacity="0.6" />
    </svg>
);

const EndoplasmicReticulum: React.FC<{ color: string; size: number }> = ({ color, size }) => (
    <svg width={size * 1.8} height={size} viewBox="0 0 90 50" fill="none">
        {[0, 12, 24, 36].map((offset, i) => (
            <path
                key={i}
                d={`M0 ${12 + offset} Q22 ${offset} 45 ${12 + offset} Q68 ${24 + offset} 90 ${12 + offset}`}
                stroke={color} strokeWidth="2" fill="none" strokeOpacity="0.8"
            />
        ))}
    </svg>
);

const GolgiApparatus: React.FC<{ color: string; size: number }> = ({ color, size }) => (
    <svg width={size * 1.4} height={size} viewBox="0 0 70 60" fill="none">
        {[0, 1, 2, 3].map(i => {
            const y = 10 + i * 13;
            const r = 30 - i * 4;
            return (
                <path
                    key={i}
                    d={`M${35 - r} ${y} Q35 ${y - 7} ${35 + r} ${y}`}
                    stroke={color} strokeWidth="2.5" fill="none"
                    strokeOpacity={1 - i * 0.15}
                    strokeLinecap="round"
                />
            );
        })}
        {/* vesicles */}
        {[[10, 50], [60, 48], [40, 55]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={4} fill={color} fillOpacity="0.55" />
        ))}
    </svg>
);

const Lysosome: React.FC<{ color: string; size: number }> = ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" stroke={color} strokeWidth="2" fill={`${color}25`} />
        <circle cx="18" cy="18" r="8" fill={color} fillOpacity="0.35" />
        {/* enzyme dots */}
        {[[12, 12], [24, 12], [12, 24], [24, 24], [18, 18]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.8} fill={color} fillOpacity="0.7" />
        ))}
    </svg>
);

// ── Organelle Config ───────────────────────────────────────────────────────────

interface OrganelleConfig {
    type: 'mito' | 'nucleus' | 'ribosome' | 'er' | 'golgi' | 'lysosome';
    color: string;
    size: number;
    x: number;    // % of viewport width
    y: number;    // % of viewport height
    delay: number;
    duration: number;
    driftX: number;
    driftY: number;
    opacity: number;
}

function seededRand(seed: number) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateOrganelles(): OrganelleConfig[] {
    const rand = seededRand(42);
    const items: OrganelleConfig[] = [];

    const types: OrganelleConfig['type'][] = ['mito', 'nucleus', 'ribosome', 'er', 'golgi', 'lysosome'];
    const counts = [6, 2, 12, 3, 2, 9]; // as per spec
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'];

    types.forEach((type, ti) => {
        for (let i = 0; i < counts[ti]; i++) {
            items.push({
                type,
                color: colors[ti],
                size: type === 'ribosome' ? 1 : (25 + rand() * 55),
                x: rand() * 95,
                y: rand() * 85,
                delay: rand() * 8,
                duration: 15 + rand() * 12,
                driftX: (rand() - 0.5) * 60,
                driftY: (rand() - 0.5) * 60,
                opacity: 0.18 + rand() * 0.22,
            });
        }
    });

    return items;
}

const organelles = generateOrganelles();

const FloatingOrganelles: React.FC = () => {
    return (
        <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden="true">
            {organelles.map((o, i) => {
                const Component = {
                    mito: Mitochondria,
                    nucleus: Nucleus,
                    ribosome: (_: { color: string; size: number }) => <Ribosome color={_.color} />,
                    er: EndoplasmicReticulum,
                    golgi: GolgiApparatus,
                    lysosome: Lysosome,
                }[o.type];

                return (
                    <motion.div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: `${o.x}%`,
                            top: `${o.y}%`,
                            opacity: o.opacity,
                        }}
                        animate={{
                            x: [0, o.driftX, o.driftX * 0.4, -o.driftX * 0.6, 0],
                            y: [0, o.driftY * 0.5, -o.driftY, o.driftY * 0.3, 0],
                            rotate: [0, 15, -10, 20, 0],
                        }}
                        transition={{
                            duration: o.duration,
                            delay: o.delay,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <Component color={o.color} size={o.size} />
                    </motion.div>
                );
            })}
        </div>
    );
};

export default FloatingOrganelles;
