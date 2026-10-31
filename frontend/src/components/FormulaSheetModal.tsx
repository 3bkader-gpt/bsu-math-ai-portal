'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  X, 
  Search, 
  Copy, 
  Check, 
  Printer, 
  Filter, 
  Sparkles, 
  Loader2, 
  FileText,
  Bookmark
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import type { AcademicSubject, AcademicLectureBundle } from '@/types/academic';
import { getDirectSupabaseBundle } from '@/lib/supabase';
import { 
  FormulaItem, 
  extractFormulasFromMarkdown, 
  deduplicateFormulas 
} from '@/lib/formulaExtractor';

interface FormulaSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: AcademicSubject | null;
  subjectLectures?: Array<{ id: number; lecture_num: number; title: string }>;
  isDark?: boolean;
  isGirls?: boolean;
}

export default function FormulaSheetModal({
  isOpen,
  onClose,
  activeSubject,
  subjectLectures = [],
  isDark = true,
  isGirls = false,
}: FormulaSheetModalProps) {
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLectureFilter, setSelectedLectureFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Load and parse formulas when modal opens
  useEffect(() => {
    if (!isOpen || subjectLectures.length === 0) return;
    let isMounted = true;
    setLoading(true);

    const loadAllFormulas = async () => {
      const collected: FormulaItem[] = [];

      for (const lec of subjectLectures) {
        try {
          const bundle: AcademicLectureBundle = await getDirectSupabaseBundle(lec.id, getApiBaseUrl());
          const guideAsset = bundle?.assets?.find(a => a.asset_type === 'study_guide_md');
          if (guideAsset) {
            let guideText = guideAsset.content_text || '';
            if (!guideText && guideAsset.stream_url) {
              const res = await fetch(getApiUrl(guideAsset.stream_url));
              if (res.ok) guideText = await res.text();
            }
            if (guideText) {
              const extracted = extractFormulasFromMarkdown(
                guideText, 
                lec.id, 
                lec.lecture_num, 
                lec.title
              );
              collected.push(...extracted);
            }
          }
        } catch (err) {
          console.warn(`Could not extract formulas from lecture ${lec.id}:`, err);
        }
      }

      if (isMounted) {
        setFormulas(deduplicateFormulas(collected));
        setLoading(false);
      }
    };

    loadAllFormulas();

    return () => {
      isMounted = false;
    };
  }, [isOpen, subjectLectures]);

  if (!isOpen) return null;

  // Filter formulas
  const filteredFormulas = formulas.filter(item => {
    // Lecture filter
    if (selectedLectureFilter !== 'all' && item.lectureId.toString() !== selectedLectureFilter) {
      return false;
    }
    // Category filter
    if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchFormula = item.formula.toLowerCase().includes(q);
      const matchExpl = item.explanation.toLowerCase().includes(q);
      return matchTitle || matchFormula || matchExpl;
    }
    return true;
  });

  // Copy LaTeX code
  const handleCopy = (id: string, formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Print Formula Sheet (dedicated clean print mode)
  const handlePrint = () => {
    window.print();
  };

  const categories = ['all', 'قانون', 'نظرية', 'تعريف', 'خاصية', 'نتيجة', 'صيغة رياضية'];

  return (
    <>
      {/* Dedicated Print Media Stylesheet to guarantee crisp black-and-white printouts */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-formula-sheet, #printable-formula-sheet * {
            visibility: visible;
          }
          #printable-formula-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .formula-print-card {
            break-inside: avoid;
            border: 1px solid #ccc !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md animate-fadeIn no-print">
        <div
          id="printable-formula-sheet"
          className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all"
          style={{
            backgroundColor: isDark ? '#101520' : '#FFFFFF',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
            boxShadow: isDark ? '0 0 50px rgba(16, 185, 129, 0.15)' : '0 20px 40px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0 flex-wrap gap-2"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Bookmark className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                    كشكول القوانين والنظريات الجامع 📐
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                    جاهز للطباعة
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {activeSubject?.name ? `مقرر: ${activeSubject.name}` : 'جميع القوانين الرياضية المستخلصة من المحاضرات'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                  color: 'var(--text-primary)',
                }}
                title="تصدير كـ PDF أو طباعة ورقية ليلة الامتحان"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">طباعة الكشكول (PDF)</span>
              </button>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: 'var(--text-primary)',
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter & Search Bar (no-print) */}
          <div
            className="p-3 sm:p-4 border-b space-y-3 shrink-0 no-print"
            style={{
              backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          >
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن قانون، نظرية، رمز، أو مفهوم..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none transition-all"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: 'var(--text-primary)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Lecture & Category Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                      selectedCategoryFilter === cat ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: selectedCategoryFilter === cat ? '#10B981' : 'var(--border-subtle)',
                      backgroundColor: selectedCategoryFilter === cat ? '#10B981' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                      color: selectedCategoryFilter === cat ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {cat === 'all' ? 'جميع التصنيفات' : cat}
                  </button>
                ))}
              </div>

              {/* Lecture Selector */}
              {subjectLectures.length > 0 && (
                <select
                  value={selectedLectureFilter}
                  onChange={e => setSelectedLectureFilter(e.target.value)}
                  className="px-3 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">جميع المحاضرات</option>
                  {subjectLectures.map(l => (
                    <option key={l.id} value={l.id.toString()}>
                      المحاضرة {l.lecture_num}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Formulas Content Grid */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  جاري استخراج وفهرسة القوانين والمعادلات من زتونات المحاضرات...
                </p>
              </div>
            ) : filteredFormulas.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  لم يتم العثور على قوانين مطابقة لبحثك
                </h4>
                <p className="text-xs sm:text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                  جرب تغيير كلمات البحث أو اختيار محاضرة أو تصنيف آخر.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredFormulas.map(item => {
                  const isCopied = copiedId === item.id;
                  
                  // Category Badge Color
                  let catColor = '#10B981'; // emerald
                  let catBg = 'rgba(16, 185, 129, 0.12)';
                  let catBorder = 'rgba(16, 185, 129, 0.3)';

                  if (item.category === 'قانون') {
                    catColor = '#3B82F6'; // blue
                    catBg = 'rgba(59, 130, 246, 0.12)';
                    catBorder = 'rgba(59, 130, 246, 0.3)';
                  } else if (item.category === 'نظرية') {
                    catColor = '#A855F7'; // purple
                    catBg = 'rgba(168, 85, 247, 0.12)';
                    catBorder = 'rgba(168, 85, 247, 0.3)';
                  } else if (item.category === 'تعريف') {
                    catColor = '#F59E0B'; // amber
                    catBg = 'rgba(245, 158, 11, 0.12)';
                    catBorder = 'rgba(245, 158, 11, 0.3)';
                  }

                  return (
                    <div
                      key={item.id}
                      className="formula-print-card p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all hover:border-emerald-500/50 shadow-xs"
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Top Bar: Category & Lecture */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-md border"
                            style={{ backgroundColor: catBg, borderColor: catBorder, color: catColor }}
                          >
                            {item.category}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-400">
                            المحاضرة {item.lectureNum}
                          </span>
                        </div>

                        {/* Copy LaTeX button (no-print) */}
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.formula)}
                          className="no-print inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer hover:bg-white/5 active:scale-95"
                          style={{
                            borderColor: isCopied ? '#10B981' : 'var(--border-subtle)',
                            color: isCopied ? '#10B981' : 'var(--text-muted)',
                          }}
                          title="نسخ صيغة الـ LaTeX للحافظة"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'تم النسخ' : 'نسخ LaTeX'}</span>
                        </button>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-black leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </h4>

                      {/* Rendered Math Formula */}
                      <div
                        className="p-3 rounded-xl border text-center font-bold text-base sm:text-lg overflow-x-auto py-3.5"
                        style={{
                          backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF',
                          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <MathRenderer text={item.formula.startsWith('$$') ? item.formula : `$$${item.formula}$$`} />
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <p className="text-xs leading-relaxed opacity-85" style={{ color: 'var(--text-muted)' }}>
                          💡 {item.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-3.5 sm:p-4 border-t flex items-center justify-between text-xs font-semibold shrink-0 no-print"
            style={{
              backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              color: 'var(--text-muted)',
            }}
          >
            <span>✨ إجمالي {filteredFormulas.length} قانون وصيغة معتمدة</span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
