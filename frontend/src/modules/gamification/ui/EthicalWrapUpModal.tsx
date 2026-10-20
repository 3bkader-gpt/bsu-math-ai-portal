'use client';

import React from 'react';
import { Coffee, CheckCircle, Flame, Heart, Sparkles, X } from 'lucide-react';
import { trackSessionEnded } from '@/modules/telemetry';

interface EthicalWrapUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: {
    conceptsLearned?: number;
    cardsReviewed?: number;
    quizAccuracy?: number;
    durationMinutes?: number;
  };
}

export function EthicalWrapUpModal({ isOpen, onClose, stats }: EthicalWrapUpModalProps) {
  if (!isOpen) return null;

  const concepts = stats?.conceptsLearned || 2;
  const cards = stats?.cardsReviewed || 6;
  const accuracy = stats?.quizAccuracy || 85;
  const duration = stats?.durationMinutes || 25;

  const handleFinish = () => {
    const sessionId = sessionStorage.getItem('bsu_session_id') || 'sess-default';
    trackSessionEnded(sessionId, duration * 60, concepts, cards, accuracy);

    // Save quiet hours indicator in localStorage
    try {
      localStorage.setItem('bsu_session_quiet_until', String(Date.now() + 12 * 3600 * 1000));
    } catch {}

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl relative p-6 sm:p-8 text-center space-y-6"
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Coffee Cup Visual */}
        <div
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-page)',
          }}
          className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-xl animate-pulse"
        >
          <Coffee className="w-10 h-10" />
        </div>

        {/* Supportive Heading */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            خلصت لليوم.. استريح وفصل مخك ☕🌿
          </h3>
          <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            عاش يا بطل! المذاكرة بتركيز لوقت محدد أفضل 10 مرات من السهر والإجهاد. مخك محتاج يرتاح ويثبت الروابط العصبية دلوقتي.
          </p>
        </div>

        {/* Concrete Learning Stats Cards */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-3 rounded-2xl border text-center space-y-1 shadow-xs"
          >
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
              مفاهيم مثبتة
            </span>
            <div className="text-lg font-black" style={{ color: 'var(--accent-primary)' }}>
              {concepts}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-3 rounded-2xl border text-center space-y-1 shadow-xs"
          >
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
              كروت روجعت
            </span>
            <div className="text-lg font-black text-indigo-500">
              {cards}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-3 rounded-2xl border text-center space-y-1 shadow-xs"
          >
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
              دقة الكويز
            </span>
            <div className="text-lg font-black text-emerald-500">
              {accuracy}%
            </div>
          </div>
        </div>

        {/* Calming Action Buttons */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={handleFinish}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-page)',
            }}
            className="w-full py-3.5 rounded-2xl font-black text-sm shadow-md hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>أنهيت مذاكرتي لليوم، في أمان الله 👋</span>
          </button>
        </div>
      </div>
    </div>
  );
}
