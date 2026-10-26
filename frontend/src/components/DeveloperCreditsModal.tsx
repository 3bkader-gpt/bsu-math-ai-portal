'use client';

import React, { useEffect, useState } from 'react';
import { X, Heart, Code2, GraduationCap, CheckCircle2, Lightbulb } from 'lucide-react';

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

  const whatsappHref = `https://wa.me/201023100767?text=${encodeURIComponent('يا عبقادر، عندي فكرة / داتا للمنصة:')}`;

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
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* 1. Horizontal Header (ID / Dev Card style) */}
          <div className="flex items-center gap-3.5 text-right pt-1 pl-8">
            {/* Custom Stylish Avatar with Monogram */}
            <div className="relative shrink-0">
              <div
                className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center font-black shadow-md border-2 transition-transform duration-300 hover:rotate-3 select-none"
                style={{
                  background: isGirls
                    ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(251, 113, 133, 0.1))'
                    : 'linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(56, 189, 248, 0.15))',
                  borderColor: isGirls ? '#F43F5E' : 'var(--accent-primary)',
                  color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
                }}
              >
                <span className="font-mono font-black text-2xl sm:text-3xl leading-none">ع</span>
              </div>

              {/* Active Online Indicator */}
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 bg-emerald-500 shadow-xs flex items-center justify-center"
                style={{ borderColor: 'var(--bg-surface)' }}
                title="مطور نشط"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75" />
              </span>
            </div>

            {/* Name & Academic Badges */}
            <div className="min-w-0 flex-1">
              <h2
                id="developer-credits-title"
                className="text-xl sm:text-2xl font-black tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                عبقادر
              </h2>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold shadow-2xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
                  }}
                >
                  <GraduationCap className="w-3 h-3" />
                  <span>تانية تربية رياضة</span>
                </span>

                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold shadow-2xs font-mono"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Code2 className="w-3 h-3 text-emerald-500" />
                  <span>المطور</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Quote Section (Idea 3 - Exam / Natural vibe) */}
          <div
            className="border-r-3 pr-3.5 py-1 text-right space-y-1.5 transition-colors"
            style={{
              borderColor: isGirls ? '#F43F5E' : 'var(--accent-primary)',
            }}
          >
            <p className="text-xs sm:text-sm leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>
              الموقع ده اتعمل عشان مالناش حجة.. الداتا قدامك مترتبة وجاهزة، ذاكر بقى أو بصمج براحتك، المهم نعدي السنة دي على خير! 😂
            </p>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              لو شايف حاجة ناقصة أو عندك اقتراح يظبط الدنيا، خش كلمني من غير رسميات.
            </p>
          </div>

          {/* 3. Channels (3-Column Grid: WhatsApp, Instagram, GitHub) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            
            {/* WhatsApp Card */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 group hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-xs text-center"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'rgba(37, 211, 102, 0.35)',
              }}
              title="تواصل مباشر على واتساب: 01023100767"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-110"
                style={{ background: '#25D366' }}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
              <span className="text-xs font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>واتساب</span>
              <span dir="ltr" className="text-[10px] font-bold text-emerald-500 font-mono">01023100767</span>
            </a>

            {/* Instagram Card */}
            <a
              href="https://www.instagram.com/3_bkader/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 group hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-xs text-center"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'rgba(225, 48, 108, 0.35)',
              }}
              title="حساب إنستجرام: @3_bkader"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                }}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-xs font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>إنستجرام</span>
              <span dir="ltr" className="text-[10px] font-bold text-rose-500 font-mono truncate">@3_bkader</span>
            </a>

            {/* GitHub Card */}
            <a
              href="https://github.com/3bkader-gpt"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 group hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-xs text-center"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-prominent)',
              }}
              title="مشاريع جيت هب: 3bkader-gpt"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs bg-slate-900 text-white dark:bg-white dark:text-slate-950 transition-transform group-hover:scale-110">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </div>
              <span className="text-xs font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>جيت هب</span>
              <span dir="ltr" className="text-[10px] font-bold opacity-75 font-mono truncate">3bkader</span>
            </a>
          </div>

          {/* 4. Bottom Action Area: Split Buttons */}
          <div className="pt-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            
            {/* Primary Wide Action: WhatsApp idea/data */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-2xl border text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 group cursor-pointer shadow-xs text-white hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: isGirls
                  ? 'linear-gradient(135deg, #F43F5E, #E11D48)'
                  : 'linear-gradient(135deg, #0D9488, #0F766E)',
                borderColor: 'transparent',
              }}
            >
              <Lightbulb className="w-4 h-4 transition-transform group-hover:rotate-12" />
              <span>ابعت فكرة أو ضيف داتا</span>
            </a>

            {/* Interactive Compact Cheer Button */}
            <button
              type="button"
              onClick={handleCheer}
              className={`py-2.5 px-3 rounded-2xl border text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                hasCheered 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                  : 'hover:scale-105 active:scale-95'
              }`}
              style={{
                backgroundColor: hasCheered ? undefined : 'var(--bg-surface-elevated)',
                borderColor: hasCheered ? undefined : 'var(--border-subtle)',
                color: hasCheered ? undefined : 'var(--text-primary)',
              }}
              title={hasCheered ? 'تم تسجيل دعوتك الحلوة 🤍' : 'اضغط لدعوة حلوة للمطور'}
            >
              <Heart className={`w-4 h-4 ${hasCheered ? 'text-emerald-500 fill-emerald-500' : 'text-rose-500 fill-rose-500/20'}`} />
              <span>دعوة حلوة ({cheerCount})</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

export default DeveloperCreditsModal;
