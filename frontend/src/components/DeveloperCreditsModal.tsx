'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Heart, Code2, ExternalLink, GraduationCap, CheckCircle2 } from 'lucide-react';

interface DeveloperCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGirls?: boolean;
}

export function DeveloperCreditsModal({ isOpen, onClose, isGirls = false }: DeveloperCreditsModalProps) {
  const [hasCheered, setHasCheered] = useState(false);
  const [cheerCount, setCheerCount] = useState(128);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved cheer count
    try {
      const savedCheer = localStorage.getItem('bsu_dev_cheers');
      if (savedCheer) setCheerCount(parseInt(savedCheer, 10));
      const userCheered = localStorage.getItem('bsu_dev_user_cheered');
      if (userCheered) setHasCheered(true);
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleCheer = () => {
    if (hasCheered) return;
    const next = cheerCount + 1;
    setCheerCount(next);
    setHasCheered(true);
    try {
      localStorage.setItem('bsu_dev_cheers', next.toString());
      localStorage.setItem('bsu_dev_user_cheered', 'true');
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="developer-credits-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-3xl border shadow-2xl transition-all duration-300 scale-100"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: isGirls ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-interactive)',
          boxShadow: isGirls 
            ? '0 24px 60px -12px rgba(244, 63, 94, 0.25), 0 0 1px 1px rgba(244, 63, 94, 0.2)' 
            : '0 24px 60px -12px rgba(45, 212, 191, 0.25), 0 0 1px 1px rgba(45, 212, 191, 0.2)',
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

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer z-10"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          title="إغلاق النافذة"
          aria-label="إغلاق النافذة"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 text-center space-y-4">
          
          {/* Avatar & Pulse Ring */}
          <div className="relative inline-block mx-auto mt-1">
            <div
              className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg border-2 transition-transform duration-300 hover:rotate-3 select-none"
              style={{
                backgroundColor: isGirls ? 'rgba(255, 101, 132, 0.15)' : 'rgba(45, 212, 191, 0.15)',
                borderColor: isGirls ? '#F43F5E' : 'var(--accent-primary)',
                color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
              }}
            >
              <span>👨‍💻</span>
            </div>
            
            {/* Active Online Indicator */}
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 bg-emerald-500 shadow-xs flex items-center justify-center"
              style={{ borderColor: 'var(--bg-surface)' }}
              title="مطور نشط في الدفعة"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
            </span>
          </div>

          {/* Name & Academic Title */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-xs font-bold mb-2 shadow-2xs"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
              }}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>مطور ومصمم المنصة</span>
            </div>

            <h2
              id="developer-credits-title"
              className="text-xl sm:text-2xl font-black tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              عبقادر
            </h2>

            <p className="text-xs sm:text-sm font-semibold mt-1 flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <GraduationCap className="w-4 h-4" />
              <span>كلية التربية • تانية رياضيات وذكاء اصطناعي 📐</span>
            </p>
          </div>

          {/* Heartfelt Note to the Batch */}
          <div
            className="p-3.5 sm:p-4 rounded-2xl border text-right space-y-1.5 relative overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <p className="text-xs sm:text-sm leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
              المنصة دي اتعملت كـ <strong className="font-extrabold" style={{ color: 'var(--text-primary)' }}>Side Project</strong> بكل حب وقهوة ☕ لخدمة دفعتنا العظيمة تانية رياضيات.. عشان نلم المواد والمعادلات ونوفر وقت ومجهود المذاكرة علينا كلنا.
            </p>
            <p className="text-xs font-bold flex items-center gap-1" style={{ color: isGirls ? '#F43F5E' : 'var(--accent-primary)' }}>
              <span>✨</span>
              <span>لو عندك أي فكرة تطوير للمنصة، تواصل معايا فوراً:</span>
            </p>
          </div>

          {/* Direct Social Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            
            {/* Instagram Link Card */}
            <a
              href="https://www.instagram.com/3_bkader/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-2.5 group hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: '#E1306C',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Official Instagram Gradient Icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white"
                  style={{
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  }}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="text-right min-w-0">
                  <span dir="ltr" className="block text-xs font-extrabold truncate text-right" style={{ color: 'var(--text-primary)' }}>
                    @3_bkader
                  </span>
                  <span className="block text-[11px] font-medium" style={{ color: '#E1306C' }}>
                    إنستجرام • تواصل مباشر
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>

            {/* GitHub Link Card */}
            <a
              href="https://github.com/3bkader-gpt"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-2.5 group hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-prominent)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Official GitHub Dark Icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                </div>
                <div className="text-right min-w-0">
                  <span dir="ltr" className="block text-xs font-extrabold truncate text-right" style={{ color: 'var(--text-primary)' }}>
                    3bkader-gpt
                  </span>
                  <span className="block text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    جيت هب • المشاريع
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          </div>

          {/* Cheer/Thanks Micro-interaction */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={handleCheer}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                hasCheered 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : 'hover:scale-[1.01] active:scale-[0.99]'
              }`}
              style={{
                backgroundColor: hasCheered ? undefined : 'var(--bg-surface-elevated)',
                borderColor: hasCheered ? undefined : 'var(--border-subtle)',
                color: hasCheered ? undefined : 'var(--text-primary)',
              }}
            >
              {hasCheered ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>شكراً يا بطل! تم تسجيل تشجيعك 🤍 ({cheerCount})</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                  <span>اضغط شكر وتشجيع لعبقادر ({cheerCount})</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default DeveloperCreditsModal;
