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
      className="p-5 sm:p-6 rounded-3xl border relative overflow-hidden transition-all duration-300 hover:shadow-xl group"
    >
      {/* Subtle Glow Accent Behind */}
      <div
        className="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-page)',
            }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform"
          >
            <TabIcon className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--accent-primary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {subjectName || 'استئناف فوري'}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {mediaSubtitle}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black line-clamp-1" style={{ color: 'var(--text-primary)' }}>
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm shadow-md hover:opacity-95 active:scale-98 transition-all shrink-0 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>كمّل من حيث وقفت</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
