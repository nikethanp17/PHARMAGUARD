import React from 'react';

interface DNAIconProps {
    size?: number;
    className?: string;
}

export const DNAIcon: React.FC<DNAIconProps> = ({ size = 24, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M2 15C2 15 3.5 16 6 16C8.5 16 10 15 12 15C14 15 15.5 16 18 16C20.5 16 22 15 22 15" />
        <path d="M2 9C2 9 3.5 8 6 8C8.5 8 10 9 12 9C14 9 15.5 8 18 8C20.5 8 22 9 22 9" />
        <path d="M7 16V8" />
        <path d="M12 15V9" />
        <path d="M17 16V8" />
    </svg>
);

export default DNAIcon;
