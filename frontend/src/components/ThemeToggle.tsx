'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';

export type PersonaType = 'boys' | 'girls';
export type ModeType = 'light' | 'dark';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [persona, setPersona] = useState<PersonaType>('boys');
  const [mode, setMode] = useState<ModeType>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedPersona = (localStorage.getItem('bsu_portal_persona') as PersonaType) || 'boys';
      let savedMode = localStorage.getItem('bsu_portal_mode') as ModeType | null;

      if (!savedMode) {
        const oldTheme = localStorage.getItem('bsu_math_theme') as ModeType | null;
        savedMode = oldTheme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      }

      setPersona(savedPersona);
      setMode(savedMode);
      applyTheme(savedPersona, savedMode);
    } catch {
      // fallback
    }
    setMounted(true);
  }, []);

  const applyTheme = (p: PersonaType, m: ModeType) => {
    const root = document.documentElement;
    root.setAttribute('data-persona', p);
    root.setAttribute('data-mode', m);

    if (m === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    try {
      localStorage.setItem('bsu_portal_persona', p);
      localStorage.setItem('bsu_portal_mode', m);
      localStorage.setItem('bsu_math_theme', m);
      window.dispatchEvent(new CustomEvent('bsu_theme_changed', { detail: { persona: p, mode: m } }));
    } catch {
      // Ignore storage errors in private browsing
    }
  };

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
      <div className={`inline-flex items-center gap-1.5 p-1 rounded-2xl border border-white/10 bg-slate-900/50 opacity-60 ${className}`}>
        <div className="w-16 h-7 rounded-xl bg-slate-800 animate-pulse" />
        <div className="w-16 h-7 rounded-xl bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const isGirls = persona === 'girls';
  const isDark = mode === 'dark';

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
            backgroundColor: !isGirls ? (isDark ? '#2DD4BF' : '#184E4E') : 'transparent',
            color: !isGirls ? (isDark ? '#0B0F14' : '#FFFFFF') : undefined,
          }}
        >
          <span>👨‍🎓</span>
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
            backgroundColor: isGirls ? (isDark ? '#E5839C' : '#C46D82') : 'transparent',
            color: isGirls ? (isDark ? '#150F16' : '#FFFFFF') : undefined,
          }}
        >
          <span>👩‍🎓</span>
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
