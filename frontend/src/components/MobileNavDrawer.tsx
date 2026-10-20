'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  Sun, 
  Moon, 
  Brain, 
  Clock, 
  Coffee, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  GraduationCap,
  ChevronLeft
} from 'lucide-react';
import { isAudioMuted, toggleAudioMute } from '@/lib/audio/soundEngine';
import { THEME_PALETTES, PersonaType, ModeType } from './ThemeToggle';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isGirls: boolean;
  isDark: boolean;
  onOpenMistakeNotebook?: () => void;
  onOpenMicroSession?: () => void;
  onOpenWrapUp?: () => void;
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  isGirls,
  isDark,
  onOpenMistakeNotebook,
  onOpenMicroSession,
  onOpenWrapUp,
}: MobileNavDrawerProps) {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(isAudioMuted());
  }, [isOpen]);

  // Bulletproof Body Scroll Lock when Drawer is open
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (scrollY) {
        const topVal = parseInt(scrollY || '0', 10);
        window.scrollTo(0, isNaN(topVal) ? 0 : topVal * -1);
      }
    }

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (scrollY) {
        const topVal = parseInt(scrollY || '0', 10);
        window.scrollTo(0, isNaN(topVal) ? 0 : topVal * -1);
      }
    };
  }, [isOpen]);

  // Handle Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      window.dispatchEvent(
        new CustomEvent('bsu_theme_changed', {
          detail: { persona: safePersona, mode: m },
        })
      );
    } catch {
      // Ignore storage errors
    }
  };

  const handlePersonaSelect = (targetPersona: 'boys' | 'girls') => {
    const currentMode = isDark ? 'dark' : 'light';
    applyTheme(targetPersona, currentMode);
  };

  const handleModeToggle = () => {
    const currentPersona = isGirls ? 'girls' : 'boys';
    const nextMode = isDark ? 'light' : 'dark';
    applyTheme(currentPersona, nextMode);
  };

  const handleSoundToggle = () => {
    const nextMuted = toggleAudioMute();
    setIsMuted(nextMuted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl" role="dialog" aria-modal="true">
      {/* Backdrop with Blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div 
        className="relative w-full max-w-xs sm:max-w-sm h-full shadow-2xl border-r flex flex-col z-10 transition-transform animate-in slide-in-from-right duration-250 ease-out"
        style={{
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {isGirls ? '🎀' : <GraduationCap className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">إعدادات المنصة</h2>
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                تربية بني سويف • رياضيات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="إغلاق القائمة"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body (Scrollable inside drawer without affecting background) */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          
          {/* Quick Study Tools */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
              أدوات المذاكرة السريعة
            </h3>
            
            <div className="space-y-1.5">
              {onOpenMistakeNotebook && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onOpenMistakeNotebook, 150);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🧠</span>
                    <span>كراسة الأخطاء الذكية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-50" />
                </button>
              )}

              {onOpenMicroSession && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onOpenMicroSession, 150);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">⏱️</span>
                    <span>جلسة الـ 5 دقائق</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-50" />
                </button>
              )}

              {onOpenWrapUp && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onOpenWrapUp, 150);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">☕</span>
                    <span>أنهيت مذاكرتي لليوم</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-50" />
                </button>
              )}
            </div>
          </div>

          {/* Theme & Persona Customization */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
              المظهر والشخصية
            </h3>

            {/* Persona Switcher (Boys vs Girls) */}
            <div 
              className="p-1 rounded-2xl border grid grid-cols-2 gap-1"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => handlePersonaSelect('boys')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isGirls ? 'shadow-sm text-white' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: !isGirls ? (isDark ? '#2DD4BF' : '#115E59') : 'transparent',
                  color: !isGirls ? (isDark ? '#0B0F14' : '#FFFFFF') : undefined,
                }}
              >
                <span>⚡</span>
                <span>نسخة الشباب</span>
              </button>

              <button
                type="button"
                onClick={() => handlePersonaSelect('girls')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isGirls ? 'shadow-sm text-white' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: isGirls ? (isDark ? '#FF6584' : '#C46D82') : 'transparent',
                  color: isGirls ? (isDark ? '#0D0811' : '#FFFFFF') : undefined,
                }}
              >
                <span>🎀</span>
                <span>نسخة البنات</span>
              </button>
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={handleModeToggle}
              className="w-full flex items-center justify-between p-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2.5">
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span>نمط العرض</span>
              </div>
              <span 
                className="text-xs px-2.5 py-1 rounded-lg border font-bold"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {isDark ? 'الوضع الليلي 🌙' : 'الوضع النهاري ☀️'}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleSoundToggle}
              className="w-full flex items-center justify-between p-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2.5">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
                <span>المؤثرات الصوتية</span>
              </div>
              <span 
                className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${
                  isMuted ? 'text-red-400' : 'text-teal-400'
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {isMuted ? 'مكتوم' : 'مفعّل'}
              </span>
            </button>
          </div>

          {/* Academic Info Badge */}
          <div 
            className="p-3.5 rounded-2xl border text-center space-y-1"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <p className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
              جامعة بني سويف • كلية التربية
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              الفرقة الثانية • قسم الرياضيات والذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t text-center text-[11px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          منصة المنهج الذكية v1.2.1 • 2026
        </div>
      </div>
    </div>
  );
}
export default MobileNavDrawer;
