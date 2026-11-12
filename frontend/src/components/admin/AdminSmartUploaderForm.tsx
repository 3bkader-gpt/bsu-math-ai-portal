'use client';

import React from 'react';
import {
  UploadCloud,
  AlertCircle,
  FileText,
  Trash2,
  X,
  Headphones,
  Video,
  HelpCircle,
  FileCheck,
  Layers,
  Cloud,
  Sparkles,
} from 'lucide-react';
import {
  AcademicSubject as Subject,
  AcademicLecture as Lecture,
} from '@/types/academic';

interface AdminSmartUploaderFormProps {
  subjects: Subject[];
  selectedSubjectId: number | '';
  setSelectedSubjectId: (id: number) => void;
  selectedSubject?: Subject;
  selectedDoctor: string;
  setSelectedDoctor: (doc: string) => void;
  subjectLectures: Lecture[];
  lectureNum: number;
  setLectureNum: (num: number) => void;
  lectureTitle: string;
  setLectureTitle: (title: string) => void;
  selectedFiles: File[];
  isUploading: boolean;
  uploadError: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleRemoveFile: (index: number, e?: React.MouseEvent) => void;
  handleClearAllFiles: (e?: React.MouseEvent) => void;
  handleUploadSubmit: (e: React.FormEvent) => void;
}

export default function AdminSmartUploaderForm({
  subjects,
  selectedSubjectId,
  setSelectedSubjectId,
  selectedSubject,
  selectedDoctor,
  setSelectedDoctor,
  subjectLectures,
  lectureNum,
  setLectureNum,
  lectureTitle,
  setLectureTitle,
  selectedFiles,
  isUploading,
  uploadError,
  fileInputRef,
  handleFileChange,
  handleDrop,
  handleRemoveFile,
  handleClearAllFiles,
  handleUploadSubmit,
}: AdminSmartUploaderFormProps) {
  return (
    <div
      className="lg:col-span-7 p-6 sm:p-8 rounded-3xl border transition-all shadow-xl min-w-0 w-full"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div
        className="flex items-center justify-between mb-5 pb-3.5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2
            className="text-base sm:text-lg md:text-xl font-extrabold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <UploadCloud
              className="w-5 h-5 sm:w-6 sm:h-6"
              style={{ color: 'var(--accent-primary)' }}
            />
            <span>رفع محاضرة جديدة وإطلاق الذكاء الاصطناعي</span>
          </h2>
          <p
            className="text-xs sm:text-sm font-medium mt-1 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            ارفع ملف الـ PDF وسيقوم المحرك بتوليد الشرح الصوتي، الفيديو، الكويز، والملخص تلقائياً في السحابة.
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-600 dark:text-rose-300 text-xs sm:text-sm font-bold">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <form onSubmit={handleUploadSubmit} className="space-y-5">
        {/* Step 1: Subject Picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="block text-xs sm:text-sm font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              1. اختر المادة الدراسية ({subjects.length} مادة متاحة)
            </label>
            <span
              className="md:hidden text-[11px] font-semibold flex items-center gap-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>اسحب المقررات أفقياً</span>
              <span className="text-[10px] opacity-75">↔</span>
            </span>
          </div>

          <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,135px),1fr))] overflow-x-auto md:overflow-x-visible overscroll-x-contain touch-pan-x snap-x snap-mandatory gap-2 sm:gap-2.5 pb-2.5 pt-1 md:py-0 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {subjects.map((sub) => {
              const isSelected = sub.id === selectedSubjectId;
              return (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer min-h-[72px] sm:min-h-[75px] w-[138px] xs:w-[150px] md:w-auto shrink-0 snap-start scroll-mt-24 ${
                    isSelected
                      ? 'ring-2 ring-cyan-500/50 shadow-md sm:scale-[1.02]'
                      : 'sm:hover:scale-[1.01]'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--bg-surface-elevated)'
                      : 'var(--bg-surface)',
                    borderColor: isSelected
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)',
                    color: isSelected
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  }}
                >
                  <span className="font-bold text-xs sm:text-sm leading-snug line-clamp-2">
                    {sub.name}
                  </span>
                  <div
                    className="mt-2 flex items-center justify-between text-[11px] font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      {sub.lecture_count} محاضرات
                    </span>
                    {sub.has_prompt && (
                      <span
                        className="font-bold text-[10px] px-1 py-0.5 rounded border text-emerald-500"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-prominent)',
                        }}
                      >
                        برومبت ✓
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Doctor Picker */}
        {selectedSubject?.doctors && selectedSubject.doctors.length > 0 && (
          <div className="pt-1">
            <label
              className="block text-xs sm:text-sm font-bold mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              مسار الدكتور / أستاذ المادة
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {selectedSubject.doctors.map((doc) => {
                const isSelected = selectedDoctor === doc;
                const isFemale =
                  doc.includes('مروة') || doc.includes('ايمان') || doc.includes('ايه');
                return (
                  <button
                    type="button"
                    key={doc}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 min-w-[130px] ${
                      isSelected ? 'ring-2 ring-cyan-500/50 shadow-sm' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--bg-surface-elevated)'
                        : 'var(--bg-surface)',
                      borderColor: isSelected
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                      color: isSelected
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-sm">{isFemale ? '👩‍🏫' : '👨‍🏫'}</span>
                    <span>{doc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Lecture Info */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3 sm:gap-4 pt-1">
          <div>
            <label
              className="block text-xs sm:text-sm font-bold mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              رقم المحاضرة
            </label>
            <input
              type="number"
              min="1"
              value={lectureNum}
              onChange={(e) => setLectureNum(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-bold focus:outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: subjectLectures.some((l: Lecture) => l.lecture_num === lectureNum)
                  ? 'var(--accent-warning, #f59e0b)'
                  : 'var(--border-prominent)',
                color: 'var(--text-primary)',
              }}
              required
            />
            {subjectLectures.some((l: Lecture) => l.lecture_num === lectureNum) && (
              <p className="text-[11px] sm:text-xs font-black mt-1.5 text-amber-600 dark:text-amber-400 leading-relaxed">
                ⚠️ محاضرة بهذا الرقم موجودة — الرفع هيستبدل ملفاتها ويعيد معالجتها من الصفر
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label
              className="block text-xs sm:text-sm font-bold mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              عنوان المحاضرة (اختياري)
            </label>
            <input
              type="text"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="مثال: مفهوم المنحنى وطول القوس في الفراغ"
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-medium focus:outline-none transition-all placeholder:text-slate-400"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-prominent)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Step 3: Drag & Drop Zone */}
        <div>
          <label
            className="block text-xs sm:text-sm font-bold mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            2. رفع ملفات المحاضرة (PDF)
          </label>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-2xl p-5 sm:p-7 text-center cursor-pointer transition-all group"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-prominent)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              style={{ display: 'none' }}
            />

            <div
              className="w-12 h-12 mx-auto mb-2.5 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)' }}
            >
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              اسحب ملفات الـ PDF وأفلتها هنا، أو{' '}
              <span style={{ color: 'var(--accent-primary)' }} className="underline font-bold">
                تصفح ملفاتك
              </span>
            </p>
            <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
              ارفع ملفات المحاضرة المعتمدة (السبورات + الكتاب المقرر + التلخيص) — يمكنك اختيار وإفلات عدة ملفات معاً
            </p>

            {selectedFiles.length > 0 && (
              <div
                className="mt-4 pt-3.5 border-t space-y-2.5 text-right"
                style={{ borderColor: 'var(--border-subtle)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    الملفات المختارة ({selectedFiles.length}):
                  </span>
                  {selectedFiles.length > 1 && (
                    <button
                      type="button"
                      onClick={handleClearAllFiles}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح كل الملفات</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {selectedFiles.map((f, idx) => {
                    const isBook = /كتاب|book/i.test(f.name);
                    const isSlides = /سبور|سلايد|slides|blackboard|lec/i.test(f.name);
                    const isNotes = /تلخيص|ملخص|notes/i.test(f.name);
                    const badgeText = isBook
                      ? '📚 جزء الكتاب'
                      : isNotes
                      ? '✍️ تلخيص يدوي'
                      : isSlides
                      ? '🖼️ سبورات / سلايدات'
                      : '📄 ملف أصلي';

                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black shadow-xs transition-all group/item"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-interactive)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <FileText className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span className="truncate max-w-[160px] sm:max-w-[220px]" title={f.name}>
                          {f.name}
                        </span>
                        <span
                          className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md font-bold shrink-0 border"
                          style={{
                            backgroundColor: isBook
                              ? 'rgba(59, 130, 246, 0.1)'
                              : isNotes
                              ? 'rgba(16, 185, 129, 0.1)'
                              : 'rgba(245, 158, 11, 0.1)',
                            borderColor: isBook
                              ? 'rgba(59, 130, 246, 0.3)'
                              : isNotes
                              ? 'rgba(16, 185, 129, 0.3)'
                              : 'rgba(245, 158, 11, 0.3)',
                            color: isBook ? '#3B82F6' : isNotes ? '#10B981' : '#F59E0B',
                          }}
                        >
                          {badgeText}
                        </span>
                        <span
                          dir="ltr"
                          className="text-xs font-mono font-bold shrink-0"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {(f.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFile(idx, e)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 transition-colors shrink-0 cursor-pointer ml-1"
                          title="إلغاء هذا الملف"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Included Bundle Highlights */}
        <div
          className="p-5 rounded-2xl border transition-colors shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span
            className="text-sm sm:text-base font-black block mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            ✨ ما سيتم إنتاجه تلقائياً من خلال هذا الرفع:
          </span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,115px),1fr))] gap-3 text-xs sm:text-sm font-black">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-300">
              <Headphones className="w-4.5 h-4.5 text-sky-500 shrink-0" />
              <span>بودكاست مصري (30د)</span>
            </div>
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
              <Video className="w-4.5 h-4.5 text-purple-500 shrink-0" />
              <span>فيديو شرح توضيحي</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-300">
              <HelpCircle className="w-4.5 h-4.5 text-cyan-500 shrink-0" />
              <span>كويز تفاعلي فوري</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
              <FileCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>دليل دراسي وملخص</span>
            </div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
              <Layers className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              <span>بطاقات استذكار</span>
            </div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-300">
              <Cloud className="w-4.5 h-4.5 text-sky-500 shrink-0" />
              <span>تخزين تليجرام CDN</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading || selectedFiles.length === 0}
          className="w-full py-4.5 px-6 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-3 shadow-xl hover:opacity-95 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-white"
          style={{
            backgroundColor: 'var(--accent-primary)',
            boxShadow: 'var(--card-shadow-hover)',
          }}
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>جاري الرفع وإدراج المحاضرة في خط الإنتاج السحابي...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>بدء خط الإنتاج الذكي للمحاضرة 🚀</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
