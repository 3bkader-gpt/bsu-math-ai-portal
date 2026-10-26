'use client';

import React from 'react';
import {
  ConfidenceLevel,
  CONFIDENCE_OPTIONS,
} from '@/modules/gamification/core/confidence';

interface ConfidenceSelectorProps {
  selected: ConfidenceLevel;
  onChange: (level: ConfidenceLevel) => void;
  disabled?: boolean;
  isGirls?: boolean;
}

export default function ConfidenceSelector({
  selected,
  onChange,
  disabled = false,
  isGirls = false,
}: ConfidenceSelectorProps) {
  const accent = isGirls ? '#F43F5E' : '#0D9488';
  const levels: ConfidenceLevel[] = ['high', 'medium', 'low'];

  return (
    <div className="w-full my-3 p-2.5 sm:p-3 rounded-2xl border transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <span>درجة ثقتك في الحل:</span>
        </span>
        <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {selected === 'high' ? '🎯 متأكد (+3 بونص)' : selected === 'low' ? '🎲 تخمين' : '🤔 عادي'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {levels.map((lvl) => {
          const opt = CONFIDENCE_OPTIONS[lvl];
          const isSelected = selected === lvl;

          return (
            <button
              key={lvl}
              type="button"
              disabled={disabled}
              onClick={() => onChange(lvl)}
              className={`py-2 px-2.5 rounded-xl border text-xs sm:text-sm font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                backgroundColor: isSelected
                  ? `${accent}18`
                  : 'var(--bg-surface-elevated)',
                borderColor: isSelected
                  ? accent
                  : 'var(--border-subtle)',
                color: isSelected ? accent : 'var(--text-secondary)',
                boxShadow: isSelected ? `0 2px 8px ${accent}25` : 'none',
              }}
            >
              <span className="text-sm sm:text-base">{opt.badgeEmoji}</span>
              <span className="truncate">{opt.label}</span>
              {lvl === 'high' && (
                <span
                  className="hidden sm:inline-block text-xs px-1 py-0.2 rounded font-black ml-0.5"
                  style={{
                    backgroundColor: isSelected ? accent : 'var(--border-prominent)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  +3
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
