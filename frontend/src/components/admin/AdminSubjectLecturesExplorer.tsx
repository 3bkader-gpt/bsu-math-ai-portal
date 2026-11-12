'use client';

import React from 'react';
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Brain,
} from 'lucide-react';
import {
  AcademicSubject as Subject,
  AcademicLecture as Lecture,
} from '@/types/academic';

interface AdminSubjectLecturesExplorerProps {
  selectedSubject?: Subject;
  subjectLectures: Lecture[];
  onSelectTrackingLecture: (id: number) => void;
}

export default function AdminSubjectLecturesExplorer({
  selectedSubject,
  subjectLectures,
  onSelectTrackingLecture,
}: AdminSubjectLecturesExplorerProps) {
  return (
    <div className="lg:col-span-5 space-y-6 min-w-0 w-full">
      <div
        className="p-6 rounded-3xl border transition-all shadow-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div
          className="flex items-center justify-between mb-4 pb-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h3
              className="font-black text-lg sm:text-xl flex items-center gap-2.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <span>محاضرات {selectedSubject?.name || 'المادة المحددة'}</span>
            </h3>
            <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
              إجمالي {subjectLectures.length} محاضرة مسجلة في قاعدة البيانات
            </p>
          </div>
        </div>

        {subjectLectures.length === 0 ? (
          <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
            <div
              className="w-14 h-14 mx-auto mb-3.5 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <GraduationCap className="w-7 h-7" />
            </div>
            <p className="text-base sm:text-lg font-black" style={{ color: 'var(--text-primary)' }}>
              لم يتم رفع أي محاضرات لهذه المادة بعد
            </p>
            <p className="text-sm font-bold mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              ارفع أول محاضرة الآن من لوحة الرفع على اليمين!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjectLectures.map((lec) => (
              <div
                key={lec.id}
                className="p-3.5 sm:p-5 rounded-2xl border transition-all flex flex-col xs:flex-row xs:items-start justify-between gap-3 group hover:shadow-md"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 font-bold text-sm sm:text-base shadow-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-prominent)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {lec.lecture_num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className="font-bold text-sm sm:text-base transition-colors leading-tight break-words"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {lec.title}
                    </h4>
                    {lec.doctor && (
                      <div className="mt-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold border"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-prominent)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {lec.doctor.includes('مروة') ||
                          lec.doctor.includes('ايمان') ||
                          lec.doctor.includes('ايه')
                            ? '👩‍🏫'
                            : '👨‍🏫'}{' '}
                          {lec.doctor}
                        </span>
                      </div>
                    )}
                    <div
                      className="flex flex-wrap items-center gap-2 mt-2 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{lec.assets_count} أصول مكتملة</span>
                      </span>
                      <span>•</span>
                      <span className="font-medium">
                        {new Date(lec.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectTrackingLecture(lec.id)}
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs hover:scale-105 self-start xs:self-center"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  معاينة
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Feature Guide Box */}
      <div
        className="p-6 rounded-3xl border space-y-3.5 shadow-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <h4
          className="font-black text-base sm:text-lg flex items-center gap-2.5"
          style={{ color: 'var(--text-primary)' }}
        >
          <Brain className="w-5 h-5 text-cyan-500" />
          <span>كيف يعمل خط الإنتاج الذكي؟</span>
        </h4>
        <p
          className="text-sm sm:text-base leading-relaxed font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          1. بمجرد رفع الـ PDF، يسحب السيرفر تلقائياً{' '}
          <strong className="font-black text-cyan-600 dark:text-cyan-300">
            البرومبت الرئيسي للمادة
          </strong>{' '}
          الذي تم إعداده خصيصاً (المشروح بالمصري والموجّه لأسلوب امتحانات بني سويف).
        </p>
        <p
          className="text-sm sm:text-base leading-relaxed font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          2. يقوم{' '}
          <strong className="font-black text-teal-600 dark:text-teal-300">
            NotebookLM
          </strong>{' '}
          بإنتاج البودكاست الصوتي والفيديو والكويز والملخص بالتوازي في السحابة.
        </p>
        <p
          className="text-sm sm:text-base leading-relaxed font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          3. تُرفع كافة الملفات إلى{' '}
          <strong className="font-black text-sky-600 dark:text-sky-300">
            قناة تليجرام السحابية
          </strong>
          ، وتُسجل الروابط فورياً في{' '}
          <strong className="font-black text-emerald-600 dark:text-emerald-300">
            Supabase
          </strong>{' '}
          لتظهر في بوابة الطلاب مباشرة!
        </p>
      </div>
    </div>
  );
}
