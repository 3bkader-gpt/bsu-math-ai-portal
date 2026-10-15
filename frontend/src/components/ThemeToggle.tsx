'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export type PersonaType = 'boys' | 'girls';
export type ModeType = 'light' | 'dark';

export const THEME_PALETTES = {
  'boys-light': {
    '--bg-page': '#F6F2E9',
    '--bg-surface': '#FFFFFF',
    '--bg-surface-elevated': '#EDE8DC',
    '--bg-surface-translucent': 'rgba(255, 255, 255, 0.95)',
    '--text-primary': '#0D1919',
    '--text-secondary': '#1B3333',
    '--text-muted': '#365353',
    '--border-subtle': '#D6C7AF',
    '--border-prominent': '#C0AE92',
    '--border-interactive': '#115E59',
    '--accent-primary': '#115E59',
    '--accent-primary-hover': '#0F4C47',
    '--accent-cyan': '#0D9488',
    '--accent-emerald': '#059669',
    '--accent-amber': '#C8963E',
    '--accent-rose': '#BE123C',
    '--math-formula-color': '#0D1919',
    '--math-block-bg': '#EDE8DC',
    '--math-block-border': '#C0AE92',
    '--card-shadow': '0 4px 20px -2px rgba(17, 94, 89, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    '--card-shadow-hover': '0 12px 28px -4px rgba(17, 94, 89, 0.16), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  'boys-dark': {
    '--bg-page': '#0B0F14',
    '--bg-surface': '#131922',
    '--bg-surface-elevated': '#1C2533',
    '--bg-surface-translucent': 'rgba(19, 25, 34, 0.95)',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#F1F5F9',
    '--text-muted': '#CBD5E1',
    '--border-subtle': '#223244',
    '--border-prominent': '#33475E',
    '--border-interactive': '#2DD4BF',
    '--accent-primary': '#2DD4BF',
    '--accent-primary-hover': '#5EEAD4',
    '--accent-cyan': '#38BDF8',
    '--accent-emerald': '#10B981',
    '--accent-amber': '#F59E0B',
    '--accent-rose': '#F43F5E',
    '--math-formula-color': '#5EEAD4',
    '--math-block-bg': '#0E1724',
    '--math-block-border': '#1E3A5F',
    '--card-shadow': '0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.06)',
    '--card-shadow-hover': '0 20px 48px -10px rgba(45, 212, 191, 0.18), inset 0 1px 2px 0 rgba(255, 255, 255, 0.12)',
  },
  'girls-light': {
    '--bg-page': '#FAF5F0',
    '--bg-surface': '#FFFFFF',
    '--bg-surface-elevated': '#FFF4F7',
    '--bg-surface-translucent': 'rgba(255, 255, 255, 0.95)',
    '--text-primary': '#240B15',
    '--text-secondary': '#441C2B',
    '--text-muted': '#6B384A',
    '--border-subtle': '#ECC8D2',
    '--border-prominent': '#E0B2C0',
    '--border-interactive': '#C46D82',
    '--accent-primary': '#C46D82',
    '--accent-primary-hover': '#A85266',
    '--accent-cyan': '#E07A9E',
    '--accent-emerald': '#059669',
    '--accent-amber': '#E08A5E',
    '--accent-rose': '#BE123C',
    '--math-formula-color': '#240B15',
    '--math-block-bg': '#FFF4F7',
    '--math-block-border': '#E0B2C0',
    '--card-shadow': '0 4px 20px -2px rgba(196, 109, 130, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.03)',
    '--card-shadow-hover': '0 12px 28px -4px rgba(196, 109, 130, 0.18), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  'girls-dark': {
    '--bg-page': '#0D0811',
    '--bg-surface': '#1A0F1E',
    '--bg-surface-elevated': '#28162F',
    '--bg-surface-translucent': 'rgba(26, 15, 30, 0.95)',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#FCE7F0',
    '--text-muted': '#E0BACD',
    '--border-subtle': 'rgba(244, 114, 182, 0.22)',
    '--border-prominent': 'rgba(244, 114, 182, 0.44)',
    '--border-interactive': '#FF6584',
    '--accent-primary': '#FF6584',
    '--accent-primary-hover': '#FF87A2',
    '--accent-cyan': '#38BDF8',
    '--accent-emerald': '#34D399',
    '--accent-amber': '#FBBF24',
    '--accent-rose': '#FB7185',
    '--math-formula-color': '#FFE4EC',
    '--math-block-bg': '#221227',
    '--math-block-border': '#4E234B',
    '--card-shadow': '0 16px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
    '--card-shadow-hover': '0 20px 48px -10px rgba(255, 101, 132, 0.3), 0 0 25px rgba(255, 101, 132, 0.18)',
  },
};

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [persona, setPersona] = useState<PersonaType>('boys');
  const [mode, setMode] = useState<ModeType>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = (p: PersonaType, m: ModeType) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const safePersona = p === ('academic' as any) ? 'boys' : p;

    root.setAttribute('data-persona', safePersona);
    root.setAttribute('data-mode', m);

    if (m === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    const themeKey = `${safePersona}-${m}` as keyof typeof THEME_PALETTES;
    const palette = THEME_PALETTES[themeKey];
    if (palette) {
      Object.entries(palette).forEach(([k, v]) => {
        root.style.setProperty(k, v);
      });
    }

    try {
      localStorage.setItem('bsu_portal_persona', safePersona);
      localStorage.setItem('bsu_portal_mode', m);
      localStorage.setItem('bsu_math_theme', m);
      window.dispatchEvent(new CustomEvent('bsu_theme_changed', { detail: { persona: safePersona, mode: m } }));
    } catch {
      // Ignore private browsing errors
    }
  };

  useEffect(() => {
    try {
      let savedPersona = (localStorage.getItem('bsu_portal_persona') as PersonaType) || 'boys';
      if (savedPersona === ('academic' as any)) {
        savedPersona = 'boys';
        localStorage.setItem('bsu_portal_persona', 'boys');
      }

      let savedMode = localStorage.getItem('bsu_portal_mode') as ModeType | null;

      if (!savedMode) {
        const oldTheme = localStorage.getItem('bsu_math_theme') as ModeType | null;
        savedMode = oldTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }

      setPersona(savedPersona);
      setMode(savedMode);
      applyTheme(savedPersona, savedMode);
    } catch {
      // fallback
    }
    setMounted(true);
  }, []);

  const handlePersonaChange = (newPersona: PersonaType) => {
    setPersona(newPersona);
    applyTheme(newPersona, mode);
  };

  const handleModeToggle = () => {
    const newMode: ModeType = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    applyTheme(persona, newMode);
  };

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 p-1 rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/50 opacity-60 ${className}`}>
        <div className="w-18 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="w-14 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const isDark = mode === 'dark';
  const isGirls = persona === 'girls';

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl border transition-all duration-300 shadow-sm ${className}`}
      style={{
        backgroundColor: 'var(--bg-surface-elevated)',
        borderColor: 'var(--border-subtle)',
      }}
      role="region"
      aria-label="إعدادات المظهر والنسخة"
    >
      {/* 1. Persona Selector (Boys vs Girls) */}
      <div
        className="flex items-center p-0.5 rounded-xl border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={() => handlePersonaChange('boys')}
          title="النسخة الشبابية: طابع تيل كلاسيكي وستيلث تكنو"
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            !isGirls
              ? 'shadow-sm text-white scale-[1.02]'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 opacity-75'
          }`}
          style={{
            backgroundColor: !isGirls ? (isDark ? '#2DD4BF' : '#115E59') : 'transparent',
            color: !isGirls ? (isDark ? '#0B0F14' : '#FFFFFF') : undefined,
          }}
        >
          <span>⚡</span>
          <span>شبابي</span>
        </button>

        <button
          type="button"
          onClick={() => handlePersonaChange('girls')}
          title="نسخة البنات: درجات كوزي روز بودري وميدنايت بيري"
          className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            isGirls
              ? 'shadow-sm text-white scale-[1.02]'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 opacity-75'
          }`}
          style={{
            backgroundColor: isGirls ? (isDark ? '#FF6584' : '#C46D82') : 'transparent',
            color: isGirls ? (isDark ? '#0D0811' : '#FFFFFF') : undefined,
          }}
        >
          <span>🎀</span>
          <span>بناتي</span>
        </button>
      </div>

      {/* Vertical Divider */}
      <div
        className="h-4 w-px mx-0.5 opacity-40"
        style={{ backgroundColor: 'var(--border-prominent)' }}
      />

      {/* 2. Light / Dark Mode Toggle */}
      <button
        type="button"
        onClick={handleModeToggle}
        title={isDark ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
        className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">نهاري</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span className="hidden sm:inline">ليلي</span>
          </>
        )}
      </button>
    </div>
  );
}

export default ThemeToggle;
