import React, { useEffect, useRef } from 'react';

/**
 * BackgroundDNA
 * Renders a seamlessly looping, horizontal DNA double-helix SVG
 * that flows from right → left continuously.
 * Two identical copies are placed side-by-side so the loop is invisible.
 */
const BASES = 40;               // nucleotide pairs per copy
const PAIR_W = 48;              // horizontal px between pairs
const AMPLITUDE = 50;           // vertical wave amplitude (px)
const SVG_H = 160;              // total SVG height (px)
const CY = SVG_H / 2;          // center Y

function buildHelixPoints(count: number, offsetX = 0) {
    const strand1: { x: number; y: number }[] = [];
    const strand2: { x: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
        const x = offsetX + i * PAIR_W;
        const phase = (i / count) * Math.PI * 4; // 2 full sine waves
        strand1.push({ x, y: CY + Math.sin(phase) * AMPLITUDE });
        strand2.push({ x, y: CY - Math.sin(phase) * AMPLITUDE });
    }
    return { strand1, strand2 };
}

function helix(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

const BackgroundDNA: React.FC = () => {
    const totalW = BASES * PAIR_W;       // width of one copy
    const svgW = totalW * 2;             // two copies side by side

    const { strand1: s1a, strand2: s2a } = buildHelixPoints(BASES, 0);
    const { strand1: s1b, strand2: s2b } = buildHelixPoints(BASES, totalW);

    // Red/Blue alternating nucleotide colours
    const nuclColor = (i: number) => (i % 2 === 0 ? '#FF0000' : '#0066FF');

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
            style={{ top: '58%', transform: 'translateY(-50%)' }}
        >
            {/* Inline keyframe for scrolling */}
            <style>{`
        @keyframes dna-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${totalW}px); }
        }
        .dna-track {
          animation: dna-scroll 25s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .dna-track { animation: none; }
        }
      `}</style>

            <div className="dna-track" style={{ width: svgW, position: 'absolute' }}>
                <svg
                    width={svgW}
                    height={SVG_H}
                    style={{ opacity: 0.38 }}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Strand 1 — sine wave */}
                    <path d={helix([...s1a, ...s1b])} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
                    {/* Strand 2 — inverted */}
                    <path d={helix([...s2a, ...s2b])} fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />

                    {/* Rungs + nucleotides */}
                    {[...s1a, ...s1b].map((p1, i) => {
                        const p2 = [...s2a, ...s2b][i];
                        const col = nuclColor(i);
                        const col2 = nuclColor(i + 1);
                        return (
                            <g key={i}>
                                {/* Rung */}
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                {/* Top nucleotide */}
                                <circle cx={p1.x} cy={p1.y} r={4} fill={col} fillOpacity="0.85" />
                                {/* Bottom nucleotide */}
                                <circle cx={p2.x} cy={p2.y} r={4} fill={col2} fillOpacity="0.85" />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

export default BackgroundDNA;
