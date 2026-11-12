'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Brain,
  Headphones,
  Video,
  Cloud,
  Play,
} from 'lucide-react';
import { AcademicMediaAsset as LectureAsset } from '@/types/academic';

interface AdminTrackedLectureCardProps {
  trackedLecture: any;
}

export default function AdminTrackedLectureCard({
  trackedLecture,
}: AdminTrackedLectureCardProps) {
  if (!trackedLecture) return null;

  return (
    <div
      className="p-6 rounded-3xl border relative overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-xl transition-all"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--accent-primary)',
        boxShadow: 'var(--card-shadow-hover)',
      }}
    >
      <div
        className="absolute top-0 right-0 left-0 h-1.5"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-prominent)',
              color: 'var(--accent-primary)',
            }}
          >
            {trackedLecture.status === 'completed' ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            ) : (
              <RefreshCw className="w-6 h-6 animate-spin" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs sm:text-sm font-black px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-prominent)',
                  color: 'var(--accent-primary)',
                }}
              >
                متابعة خط الإنتاج اللحظي
              </span>
              <span
                className="text-xs sm:text-sm font-bold font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                #{trackedLecture.id}
              </span>
            </div>
            <h3
              className="text-xl sm:text-2xl font-black mt-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              {trackedLecture.title || `المحاضرة ${trackedLecture.lecture_num}`}
            </h3>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {trackedLecture.status === 'completed' ? (
            <span className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-black text-sm sm:text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>اكتملت جميع المخرجات بنجاح</span>
            </span>
          ) : trackedLecture.status === 'failed' ? (
            <span className="px-4 py-2.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-black text-sm sm:text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <span>فشلت العملية</span>
            </span>
          ) : (
            <span
              className="px-4 py-2.5 rounded-2xl border font-black text-sm sm:text-base flex items-center gap-2"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-interactive)',
                color: 'var(--text-primary)',
              }}
            >
              <RefreshCw
                className="w-4 h-4 animate-spin"
                style={{ color: 'var(--accent-primary)' }}
              />
              <span>{trackedLecture.stage_info || 'جاري المعالجة والإنتاج...'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Stepper Visualization */}
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,130px),1fr))] gap-2.5 sm:gap-3 pt-4 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="p-3.5 rounded-2xl border text-center transition-all"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <FileText className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
          <span
            className="block text-xs sm:text-sm font-black"
            style={{ color: 'var(--text-primary)' }}
          >
            1. استلام الـ PDF
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-300 font-bold">
            تم التأكيد ✓
          </span>
        </div>
        <div
          className="p-3.5 rounded-2xl border text-center transition-all"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Brain className="w-5 h-5 mx-auto mb-1 text-purple-500" />
          <span
            className="block text-xs sm:text-sm font-black"
            style={{ color: 'var(--text-primary)' }}
          >
            2. حقن البرومبت
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-300 font-bold">
            المادة المعتمدة ✓
          </span>
        </div>
        <div
          className="p-3.5 rounded-2xl border text-center transition-all"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Headphones className="w-5 h-5 mx-auto mb-1 text-teal-500" />
          <span
            className="block text-xs sm:text-sm font-black"
            style={{ color: 'var(--text-primary)' }}
          >
            3. بودكاست مصري
          </span>
          <span className="text-xs text-teal-600 dark:text-teal-300 font-bold">
            NotebookLM
          </span>
        </div>
        <div
          className="p-3.5 rounded-2xl border text-center transition-all"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Video className="w-5 h-5 mx-auto mb-1 text-amber-500" />
          <span
            className="block text-xs sm:text-sm font-black"
            style={{ color: 'var(--text-primary)' }}
          >
            4. فيديو وكويز
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-300 font-bold">
            إنتاج الباقة
          </span>
        </div>
        <div
          className="p-3.5 rounded-2xl border text-center col-span-2 sm:col-span-1 transition-all"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Cloud className="w-5 h-5 mx-auto mb-1 text-sky-500" />
          <span
            className="block text-xs sm:text-sm font-black"
            style={{ color: 'var(--text-primary)' }}
          >
            5. رفع تليجرام CDN
          </span>
          <span className="text-xs text-sky-600 dark:text-sky-300 font-bold">
            التخزين الدائم
          </span>
        </div>
      </div>

      {/* Generated Assets Preview */}
      {trackedLecture.assets && trackedLecture.assets.length > 0 && (
        <div
          className="mt-6 pt-5 border-t flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-wrap gap-2.5">
            {trackedLecture.assets.map((asset: LectureAsset) => (
              <span
                key={asset.id}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-black shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{asset.title}</span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  (
                  {asset.file_size_bytes
                    ? `${(asset.file_size_bytes / (1024 * 1024)).toFixed(1)}MB`
                    : 'مكتمل'}
                  )
                </span>
              </span>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-white font-black text-sm shadow-lg hover:opacity-95 transition-all"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Play className="w-4 h-4" />
            <span>معاينة في بوابة الطلاب</span>
          </Link>
        </div>
      )}
    </div>
  );
}
