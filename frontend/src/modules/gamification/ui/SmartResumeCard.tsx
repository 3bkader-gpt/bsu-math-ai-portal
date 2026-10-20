'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, ArrowLeft, Headphones, Video, BookOpen, HelpCircle, Layers } from 'lucide-react';
import { getLocalResumeState, fetchRemoteResumeState, ResumeState } from '../resume';
import { trackSessionFirstAction } from '@/modules/telemetry';

function formatMinutesSeconds(totalSec?: number): string {
  if (!totalSec || totalSec <= 0) return '00:00';
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SmartResumeCard() {
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // 1. Instant 0ms retrieval from localStorage
    const local = getLocalResumeState();
    if (local) {
      setResume(local);
    }

    // 2. Background remote reconciliation for cross-device sync
    fetchRemoteResumeState().then((remote) => {
      if (remote) setResume(remote);
    });

    // 3. React to local resume updates across tabs/navigation
    const handleUpdate = (e: any) => {
      if (e.detail) setResume(e.detail);
    };

    window.addEventListener('bsu_resume_updated', handleUpdate);
    return () => window.removeEventListener('bsu_resume_updated', handleUpdate);
  }, []);

  if (!isMounted || !resume) {
    return null; // Zero clutter if brand new visitor with no history
  }

  const { lectureId, subjectName, lectureTitle, lastTab, audioSec, videoSec, cardIndex } = resume;

  // Build target link with deep seek param
  let targetUrl = `/lecture?id=${lectureId}&tab=${lastTab}`;
  let mediaSubtitle = 'متابعة المذاكرة من آخر نقطة';
  let TabIcon = BookOpen;

  if (lastTab === 'audio') {
    TabIcon = Headphones;
    const sec = audioSec || 0;
    targetUrl += `&t=${sec}`;
    mediaSubtitle = `ريكورد المحاضرة — الدقيقة ${formatMinutesSeconds(sec)}`;
  } else if (lastTab === 'video') {
    TabIcon = Video;
    const sec = videoSec || 0;
    targetUrl += `&t=${sec}`;
    mediaSubtitle = `فيديو الشرح التفاعلي — الدقيقة ${formatMinutesSeconds(sec)}`;
  } else if (lastTab === 'quiz') {
    TabIcon = HelpCircle;
    mediaSubtitle = 'كويز المحاضرة التفاعلي';
  } else if (lastTab === 'flashcards') {
    TabIcon = Layers;
    mediaSubtitle = `كروت المراجعة — بطاقة ${(cardIndex || 0) + 1}`;
  } else {
    TabIcon = BookOpen;
    mediaSubtitle = 'ملخص الزتونة والدليل الدراسي';
  }

  const handleHeroClick = () => {
    const sessionStart = sessionStorage.getItem('bsu_session_start_ts');
    const sessionId = sessionStorage.getItem('bsu_session_id') || 'sess-anonymous';
    const timeToFirstActionMs = sessionStart ? Math.max(0, Date.now() - parseInt(sessionStart, 10)) : 1500;

    trackSessionFirstAction(sessionId, `smart_resume_${lastTab}`, timeToFirstActionMs);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--card-shadow)',
      }}
      className="p-3.5 sm:p-4.5 rounded-2xl border relative overflow-hidden transition-all duration-300 hover:shadow-lg group"
    >
      {/* Subtle Glow Accent Behind */}
      <div
        className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-page)',
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform"
          >
            <TabIcon className="w-5 h-5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--accent-primary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {subjectName || 'استئناف فوري'}
              </span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {mediaSubtitle}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold line-clamp-1" style={{ color: 'var(--text-primary)' }}>
              {lectureTitle || `المحاضرة رقم ${resume.lectureNum || lectureId}`}
            </h3>
          </div>
        </div>

        <Link
          href={targetUrl}
          onClick={handleHeroClick}
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-page)',
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs hover:opacity-95 active:scale-98 transition-all shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>كمّل من حيث وقفت</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
