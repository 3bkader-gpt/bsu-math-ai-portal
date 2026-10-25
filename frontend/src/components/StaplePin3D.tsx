'use client';

import React from 'react';

interface StaplePin3DProps {
  className?: string;
  isGirls?: boolean;
  size?: number;
}

export default function StaplePin3D({ className = '', isGirls = false, size = 42 }: StaplePin3DProps) {
  const gradientId = isGirls ? 'staple-metal-rosegold' : 'staple-metal-silver';

  return (
    <div
      className={`pointer-events-none select-none z-20 transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
      >
        <defs>
          {/* Silver Chrome / Stainless Steel Staple for Boys & Default */}
          <linearGradient id="staple-metal-silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7E8D9C" />
            <stop offset="25%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D5DDE4" />
            <stop offset="75%" stopColor="#637384" />
            <stop offset="100%" stopColor="#43505F" />
          </linearGradient>

          {/* Rose Gold Metallic Staple for Girls Edition */}
          <linearGradient id="staple-metal-rosegold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C46D82" />
            <stop offset="25%" stopColor="#FFF2F6" />
            <stop offset="50%" stopColor="#F7C4D1" />
            <stop offset="75%" stopColor="#9C4459" />
            <stop offset="100%" stopColor="#E292A6" />
          </linearGradient>

          {/* Paper Indentation Crease */}
          <linearGradient id="staple-crease" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.20)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.02)" />
          </linearGradient>
        </defs>

        {/* 1. Paper Compression Crease beneath staple */}
        <line
          x1="8"
          y1="8"
          x2="34"
          y2="34"
          stroke="url(#staple-crease)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* 2. Paper Puncture Slits (Left & Right Entry Points) */}
        <ellipse
          cx="9.5"
          cy="9.5"
          rx="1.8"
          ry="1.1"
          transform="rotate(-45 9.5 9.5)"
          fill="#1E293B"
          opacity="0.75"
        />
        <ellipse
          cx="32.5"
          cy="32.5"
          rx="1.8"
          ry="1.1"
          transform="rotate(-45 32.5 32.5)"
          fill="#1E293B"
          opacity="0.75"
        />

        {/* 3. Darkened Bevel Base / Ambient Contact Shadow */}
        <line
          x1="10"
          y1="10"
          x2="32"
          y2="32"
          stroke={isGirls ? '#7A2E42' : '#2D3748'}
          strokeWidth="4"
          strokeLinecap="square"
        />

        {/* 4. Main Metallic Cylindrical Core */}
        <line
          x1="10"
          y1="9.5"
          x2="32"
          y2="31.5"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.2"
          strokeLinecap="square"
        />

        {/* 5. Razor-sharp Specular Reflection Highlight */}
        <line
          x1="10"
          y1="9"
          x2="32"
          y2="31"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="square"
          opacity="0.95"
        />
      </svg>
    </div>
  );
}
