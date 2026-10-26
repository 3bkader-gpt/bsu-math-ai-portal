'use client';

import React from 'react';
import { Code2, Heart, Sparkles } from 'lucide-react';

interface DeveloperCreditsPillProps {
  onClick: () => void;
  isGirls?: boolean;
  className?: string;
  variant?: 'footer' | 'drawer' | 'compact';
}

export function DeveloperCreditsPill({
  onClick,
  isGirls = false,
  className = '',
  variant = 'footer',
}: DeveloperCreditsPillProps) {
  if (variant === 'drawer') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full p-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-2.5 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] shadow-xs ${className}`}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        title="فتح بطاقة مطور المنصة"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border shadow-2xs"
            style={{
              borderColor: isGirls ? 'rgba(255, 101, 132, 0.3)' : 'var(--accent-primary)',
            }}
          >
            <img
              src="/abdelkader.webp"
              alt="عبقادر"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/abdelkader.jpg';
              }}
            />
          </div>
          <div className="text-right min-w-0">
            <span className="block text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              كود وإعداد: عبقادر
            </span>
            <span className="block text-[10px] font-medium opacity-75" style={{ color: 'var(--text-muted)' }}>
              تانية رياضيات • تواصل مع المطور
            </span>
          </div>
        </div>

        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition-transform group-hover:-translate-x-0.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
          }}
        >
          بطاقة الصانع ↗
        </span>
      </button>
    );
  }

  // Footer Pill Variant
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95 shadow-xs select-none ${className}`}
      style={{
        backgroundColor: 'var(--bg-surface-elevated)',
        borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)',
        color: 'var(--text-secondary)',
      }}
      title="بطاقة صانع ومطور المنصة"
    >
      <span className="flex items-center gap-1.5 text-xs font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>كود وإعداد: <strong className="font-extrabold" style={{ color: isGirls ? '#F43F5E' : 'var(--accent-primary)' }}>عبقادر</strong> ☕</span>
      </span>

      <span
        className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border shadow-2xs transition-transform group-hover:-translate-x-0.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-interactive)',
          color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
        }}
      >
        بطاقة المطور ↗
      </span>
    </button>
  );
}

export default DeveloperCreditsPill;
