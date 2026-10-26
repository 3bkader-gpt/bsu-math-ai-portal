'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, User, GraduationCap, CheckCircle2, ArrowRight, Bot } from 'lucide-react';
import { getStudentProfileLocal, saveStudentProfileLocal, StudentProfile } from '@/lib/studentProfile';
import { triggerConfetti } from '@/lib/effects/confetti';
import { playSound } from '@/lib/audio/soundEngine';

interface WelcomeStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (profile: StudentProfile) => void;
  isInitialOnboarding?: boolean;
}

export function WelcomeStudentModal({
  isOpen,
  onClose,
  onSaved,
  isInitialOnboarding = true,
}: WelcomeStudentModalProps) {
  const [name, setName] = useState('');
  const [persona, setPersona] = useState<'boys' | 'girls'>('boys');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const profile = getStudentProfileLocal();
    setName(profile.name || '');
    setPersona(profile.persona || 'boys');
    setError(null);

    // Focus input after modal renders
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isInitialOnboarding) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isInitialOnboarding, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setError('من فضلك اكتب اسمك أو اسم الشهرة يا بطل');
      inputRef.current?.focus();
      return;
    }

    if (cleanName.length < 2) {
      setError('الاسم يجب أن يحتوي على حرفين على الأقل');
      inputRef.current?.focus();
      return;
    }

    const saved = saveStudentProfileLocal(cleanName, persona);
    try {
      playSound('level_up');
      triggerConfetti();
    } catch {}

    if (onSaved) onSaved(saved);
    onClose();
  };

  const handleSkip = () => {
    // Save as guest and proceed
    const defaultName = persona === 'girls' ? 'عاشقة الرياضيات' : 'عاشق الرياضيات';
    const saved = saveStudentProfileLocal(defaultName, persona);
    if (onSaved) onSaved(saved);
    onClose();
  };

  const isGirls = persona === 'girls';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-student-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (!isInitialOnboarding && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-3xl border shadow-2xl transition-all duration-300 scale-100"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: isGirls ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-interactive)',
          boxShadow: isGirls 
            ? '0 24px 60px -12px rgba(244, 63, 94, 0.3), 0 0 1px 1px rgba(244, 63, 94, 0.2)' 
            : '0 24px 60px -12px rgba(45, 212, 191, 0.3), 0 0 1px 1px rgba(45, 212, 191, 0.2)',
        }}
      >
        {/* Decorative Top Accent Bar */}
        <div
          className="h-2 w-full"
          style={{
            background: isGirls
              ? 'linear-gradient(90deg, #F43F5E, #FB7185, #FDA4AF)'
              : 'linear-gradient(90deg, #0D9488, #2DD4BF, #38BDF8)',
          }}
        />

        {/* Optional Close Button (Only if not initial mandatory onboarding) */}
        {!isInitialOnboarding && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Content */}
        <div className="p-6 text-center space-y-4">
          
          {/* Header Icon */}
          <div className="relative inline-block mx-auto mt-1">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 select-none transition-transform hover:scale-105"
              style={{
                backgroundColor: isGirls ? 'rgba(255, 101, 132, 0.15)' : 'rgba(45, 212, 191, 0.15)',
                borderColor: isGirls ? '#F43F5E' : 'var(--accent-primary)',
              }}
            >
              <span>{isGirls ? '👩‍🎓' : '👨‍🎓'}</span>
            </div>
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 bg-emerald-500 shadow-xs flex items-center justify-center"
              style={{ borderColor: 'var(--bg-surface)' }}
            >
              <Sparkles className="w-3 h-3 text-white" />
            </span>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h2
              id="welcome-student-title"
              className="text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {isInitialOnboarding ? 'منور في منصة تانية رياضيات! 📐✨' : 'تعديل اسمك وهويتك ✏️'}
            </h2>
            <p className="text-xs sm:text-sm font-medium mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {isInitialOnboarding
                ? 'اكتب اسمك عشان نخصص تجربتك ونسجل مستواك وإنجازاتك باسمك في الدفعة.'
                : 'حدث اسمك وهوية دراستك في أي وقت لتحديث مكانتك في الليدربورد.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-right pt-1">
            
            {/* Name Input Field */}
            <div>
              <label htmlFor="student-name-input" className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                اسمك بالكامل أو اسم الشهرة:
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="student-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="مثلاً: أحمد محمود أو مريم..."
                  maxLength={40}
                  className="w-full px-4 py-3 rounded-2xl border text-sm font-bold transition-all outline-hidden shadow-xs focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: error ? '#EF4444' : 'var(--border-interactive)',
                    color: 'var(--text-primary)',
                  }}
                />
                <User className="absolute left-3.5 top-3.5 w-4 h-4 opacity-40 pointer-events-none" />
              </div>
              {error && (
                <p className="text-xs text-rose-500 font-bold mt-1 pr-1">
                  ⚠️ {error}
                </p>
              )}
            </div>

            {/* Persona Selector (طالب / طالبة) */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                تخصيص أسلوب الخطاب والثيم:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPersona('boys')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    persona === 'boys'
                      ? 'border-teal-500 bg-teal-500/15 text-teal-400 font-extrabold shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: persona === 'boys' ? undefined : 'var(--bg-surface-elevated)',
                    borderColor: persona === 'boys' ? undefined : 'var(--border-subtle)',
                    color: persona === 'boys' ? undefined : 'var(--text-muted)',
                  }}
                >
                  <span>👨‍🎓 طالب (شباب)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPersona('girls')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    persona === 'girls'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-400 font-extrabold shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: persona === 'girls' ? undefined : 'var(--bg-surface-elevated)',
                    borderColor: persona === 'girls' ? undefined : 'var(--border-subtle)',
                    color: persona === 'girls' ? undefined : 'var(--text-muted)',
                  }}
                >
                  <span>👩‍🎓 طالبة (بنات)</span>
                </button>
              </div>
            </div>

            {/* AI Private Tutor Teaser */}
            <div
              className="p-3 rounded-2xl border text-right space-y-1 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: isGirls ? 'rgba(244, 63, 94, 0.25)' : 'rgba(45, 212, 191, 0.25)',
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: isGirls ? '#F43F5E' : 'var(--accent-primary)' }}>
                <Bot className="w-3.5 h-3.5" />
                <span>تمهيد لمدرس الذكاء الاصطناعي الخصوصي ⚡</span>
              </div>
              <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
                بياناتك وكويزاتك هتتحفظ باسمك على جهازك، وقريبًا المدرس الذكي هيتابع نقاط ضعفك ويشرحهالك خطوة بخطوة!
              </p>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl font-extrabold text-sm transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer shadow-md text-white hover:scale-[1.01] active:scale-[0.99] mt-2"
              style={{
                background: isGirls
                  ? 'linear-gradient(135deg, #F43F5E, #E11D48)'
                  : 'linear-gradient(135deg, #0D9488, #0F766E)',
              }}
            >
              <span>{isInitialOnboarding ? 'يلا بينا نبدأ المذاكرة 🚀' : 'حفظ التعديلات ✨'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-1 rotate-180" />
            </button>

            {/* Skip Option for Initial Onboarding */}
            {isInitialOnboarding && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs font-semibold hover:underline cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  الدخول كزائر مؤقتاً
                </button>
              </div>
            )}
          </form>

        </div>

      </div>
    </div>
  );
}

export default WelcomeStudentModal;
