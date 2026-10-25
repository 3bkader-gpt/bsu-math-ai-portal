'use client';

import React from 'react';

interface PaperClip3DProps {
  className?: string;
  isGirls?: boolean;
  width?: number;
  height?: number;
}

export default function PaperClip3D({
  className = '',
  isGirls = false,
  width = 32,
  height = 62,
}: PaperClip3DProps) {
  const gradientId = isGirls ? 'clip-metal-rosegold' : 'clip-metal-chrome';

  return (
    <div
      className={`pointer-events-none select-none z-30 transition-transform duration-300 ${className}`}
      style={{
        width,
        height,
        filter: 'drop-shadow(2px 5px 6px rgba(0, 0, 0, 0.24))',
      }}
      aria-hidden="true"
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 34 66"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Chrome Steel Metallic Gradient (Boys / Default) */}
          <linearGradient id="clip-metal-chrome" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(25)">
            <stop offset="0%" stopColor="#6C7A89" />
            <stop offset="20%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Rose Gold Metallic Gradient (Girls Edition) */}
          <linearGradient id="clip-metal-rosegold" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(25)">
            <stop offset="0%" stopColor="#B34B68" />
            <stop offset="22%" stopColor="#FFF0F5" />
            <stop offset="48%" stopColor="#F9CBD6" />
            <stop offset="72%" stopColor="#8C2B47" />
            <stop offset="100%" stopColor="#E292A6" />
          </linearGradient>
        </defs>

        {/* 1. Ambient Contact Shadow where paper meets the clip */}
        <path
          d="M 12 42 L 12 18 A 5 5 0 0 1 22 18 L 22 48"
          stroke={isGirls ? 'rgba(179, 75, 104, 0.22)' : 'rgba(0, 0, 0, 0.20)'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Full Seamless 3D Curved Wire Loop */}
        <path
          d="M 12 40 L 12 18 A 5 5 0 0 1 22 18 L 22 48 A 7.5 7.5 0 0 1 7 48 L 7 12 A 10 10 0 0 1 27 12 L 27 52"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Razor-sharp Specular Glisten Streak on the cylindrical wire */}
        <path
          d="M 11.5 39 L 11.5 18 A 5 5 0 0 1 21.5 18 L 21.5 48 A 7.5 7.5 0 0 1 7.5 48 L 7.5 12 A 10 10 0 0 1 26.5 12 L 26.5 52"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={isGirls ? 0.90 : 0.82}
        />
      </svg>
    </div>
  );
}
