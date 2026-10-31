'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Flame, 
  X, 
  CheckCircle2, 
  HelpCircle, 
  ArrowUpRight, 
  Sparkles, 
  Loader2, 
  AlertOctagon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import MathRenderer from '@/components/MathRenderer';

interface HurdleQuestion {
  question_hash: string;
  lecture_id: number;
  question_text: string;
  explanation: string;
  correct_answer: string;
  total_attempts: number;
  incorrect_attempts: number;
  failure_rate_pct: number;
  subject_name: string;
  lecture_title: string;
  lecture_num: number;
}

interface CohortHurdlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export default function CohortHurdlesModal({ isOpen, onClose, isDark = true }: CohortHurdlesModalProps) {
  const [hurdles, setHurdles] = useState<HurdleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);

    fetch(getApiUrl('/api/stats/cohort-hurdles?limit=25'))
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted) {
          setHurdles(data || []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.warn('Failed loading cohort hurdles:', err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all"
        style={{
          backgroundColor: isDark ? '#140D1B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)',
          boxShadow: isDark ? '0 0 50px rgba(239, 68, 68, 0.2)' : '0 20px 40px rgba(0,0,0,0.1)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-red-500/15 border border-red-500/30 text-red-400 shrink-0">
              <Flame className="w-6 h-6 fill-red-500 text-red-500 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  رادار فخاخ الدفعة 🎯
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  ذكاء جماعي
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                أصعب الأسئلة اللي وقعت فيها الدفعة في الكويزات لتتدرب عليها قبل الامتحانات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: 'var(--text-primary)'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                جاري رصد إحصائيات أسئلة الدفعة وتحليل الفخاخ...
              </p>
            </div>
          ) : hurdles.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                ما شاء الله، مفيش فخاخ مستعصية حتى الآن!
              </h4>
              <p className="text-xs sm:text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                كل ما الدفعة تحل كويزات ويظهر أسئلة نسبة الخطأ فيها عالية، الرادار هيلتقطها ويعرضها هنا تلقائياً.
              </p>
            </div>
          ) : (
            hurdles.map((h, idx) => {
              const isExpanded = expandedIndex === idx;
              const rate = Math.round(h.failure_rate_pct);

              return (
                <div
                  key={h.question_hash + idx}
                  className="rounded-2xl border p-4 sm:p-5 transition-all shadow-sm"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Top Bar: Subject, Lecture, Failure Rate */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
                        {h.subject_name}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        المحاضرة {h.lecture_num}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black">
                      <Flame className="w-3.5 h-3.5 fill-red-500 shrink-0" />
                      <span>نسبة خطأ: {rate}%</span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <h4 className="text-sm sm:text-base font-bold leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
                    <MathRenderer text={h.question_text} />
                  </h4>

                  {/* Controls & Answer Reveal */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>{isExpanded ? 'إخفاء الإجابة والشرح' : 'كشف الإجابة الصحيحة والشرح'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <Link
                      href={`/lecture?id=${h.lecture_id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all hover:scale-105"
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span>فتح المحاضرة</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Expanded Explanation */}
                  {isExpanded && (
                    <div 
                      className="mt-3 p-3.5 rounded-xl border space-y-2 text-xs sm:text-sm animate-fadeIn"
                      style={{
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(236, 253, 245, 0.9)',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>الإجابة النموذجية: </span>
                        <MathRenderer text={h.correct_answer} />
                      </div>
                      {h.explanation && (
                        <div className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          💡 <strong>الشرح والتوضيح:</strong>{' '}
                          <MathRenderer text={h.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-3 sm:p-4 border-t flex items-center justify-between text-xs font-semibold"
          style={{ 
            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            color: 'var(--text-muted)'
          }}
        >
          <span>✨ يتم تحديث الفخاخ لحظياً من نتائج الطلاب الفعلية</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            فهمت، جاهز للمذاكرة
          </button>
        </div>
      </div>
    </div>
  );
}
