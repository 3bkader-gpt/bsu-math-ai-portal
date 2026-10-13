'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check saved preference or system preference
    const saved = localStorage.getItem('bsu_math_theme') as 'light' | 'dark' | null;
    const initial = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    setTheme(initial);
    applyTheme(initial);
    setMounted(false);
    setTimeout(() => setMounted(true), 50);
  }, []);

  const applyTheme = (t: 'light' | 'dark') => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('bsu_math_theme', t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <button
        aria-label="تبديل المظهر"
        className={`p-2.5 rounded-xl border border-white/10 text-slate-400 opacity-60 ${className}`}
      >
        <Moon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
      className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2 text-sm font-semibold cursor-pointer ${
        theme === 'dark'
          ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-amber-300 hover:text-amber-200 shadow-sm'
          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline text-xs text-slate-200">الوضع النهاري</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-sky-600" />
          <span className="hidden sm:inline text-xs text-slate-700">الوضع الليلي</span>
        </>
      )}
    </button>
  );
}

export default ThemeToggle;
