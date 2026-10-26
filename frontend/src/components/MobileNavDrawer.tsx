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
import { isAudioMuted, setAudioMuted, playSound } from '@/lib/audio/soundEngine';
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
    if ((targetPersona === 'girls' && isGirls) || (targetPersona === 'boys' && !isGirls)) return;
    const currentMode = isDark ? 'dark' : 'light';
    applyTheme(targetPersona, currentMode);
  };

  const handleModeSelect = (targetMode: 'light' | 'dark') => {
    if ((targetMode === 'dark' && isDark) || (targetMode === 'light' && !isDark)) return;
    const currentPersona = isGirls ? 'girls' : 'boys';
    applyTheme(currentPersona, targetMode);
  };

  const handleSoundSelect = (targetMuted: boolean) => {
    if (isMuted === targetMuted) return;
    setAudioMuted(targetMuted);
    setIsMuted(targetMuted);
    if (!targetMuted) {
      playSound('xp_chime');
    }
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
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {isGirls ? '🎀' : <GraduationCap className="w-4.5 h-4.5" style={{ color: 'var(--accent-primary)' }} />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">إعدادات المنصة</h2>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                تربية بني سويف • رياضيات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border transition-transform hover:scale-105 active:scale-95 cursor-pointer"
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
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4">
          
          {/* Quick Study Tools */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
              أدوات المذاكرة السريعة
            </h3>
            
            <div className="space-y-1">
              {onOpenMistakeNotebook && (
                <button
                  onClick={() => {
                    onClose();
                    setTimeout(onOpenMistakeNotebook, 150);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧠</span>
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
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏱️</span>
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
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">☕</span>
                    <span>أنهيت مذاكرتي لليوم</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-50" />
                </button>
              )}
            </div>
          </div>

          {/* Theme & Persona Customization */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider px-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>المظهر والتفضيلات</span>
            </h3>

            {/* 1. Persona Switcher (Boys vs Girls) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  طابع النسخة والأسلوب
                </span>
              </div>
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
            </div>

            {/* 2. Light / Dark Mode Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  نمط العرض والإضاءة
                </span>
              </div>
              <div 
                className="p-1 rounded-2xl border grid grid-cols-2 gap-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleModeSelect('light')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isDark ? 'shadow-sm text-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: !isDark ? '#D97706' : 'transparent',
                    color: !isDark ? '#FFFFFF' : undefined,
                  }}
                >
                  <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-white' : 'text-amber-500'}`} />
                  <span>الوضع النهاري</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeSelect('dark')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDark ? 'shadow-sm text-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isDark ? '#4F46E5' : 'transparent',
                    color: isDark ? '#FFFFFF' : undefined,
                  }}
                >
                  <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-indigo-400'}`} />
                  <span>الوضع الليلي</span>
                </button>
              </div>
            </div>

            {/* 3. Sound Effects Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  المؤثرات الصوتية
                </span>
              </div>
              <div 
                className="p-1 rounded-2xl border grid grid-cols-2 gap-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSoundSelect(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isMuted ? 'shadow-sm text-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: !isMuted ? '#0D9488' : 'transparent',
                    color: !isMuted ? '#FFFFFF' : undefined,
                  }}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${!isMuted ? 'text-white' : 'text-teal-500'}`} />
                  <span>مفعّلة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSoundSelect(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isMuted ? 'shadow-sm text-white' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isMuted ? '#E11D48' : 'transparent',
                    color: isMuted ? '#FFFFFF' : undefined,
                  }}
                >
                  <VolumeX className={`w-3.5 h-3.5 ${isMuted ? 'text-white' : 'text-rose-500'}`} />
                  <span>مكتومة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Academic Info Badge */}
          <div 
            className="p-2.5 rounded-xl border text-center space-y-0.5"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <p className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
              جامعة بني سويف • كلية التربية
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              الفرقة الثانية • قسم الرياضيات والذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t text-center text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          منصة المنهج الذكية v1.2.9 • 2026
        </div>
      </div>
    </div>
  );
}
export default MobileNavDrawer;
