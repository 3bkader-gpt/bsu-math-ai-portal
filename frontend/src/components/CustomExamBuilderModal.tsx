'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  BookOpen, 
  Layers, 
  Timer, 
  Flame, 
  Loader2, 
  Award,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import { parseQuizMarkdown, QuizQuestion } from '@/lib/lecture-utils';
import type { AcademicSubject, AcademicLectureBundle } from '@/types/academic';
import { getDirectSupabaseBundle } from '@/lib/supabase';
import { 
  ExamConfig, 
  ExamQuestion, 
  ExamResult, 
  buildExamQuestions, 
  evaluateExam 
} from '@/lib/examEngine';

interface CustomExamBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: AcademicSubject | null;
  subjectLectures?: Array<{ id: number; lecture_num: number; title: string; is_ready?: boolean; has_quiz?: boolean }>;
  isDark?: boolean;
  isGirls?: boolean;
}

type ExamPhase = 'CONFIG' | 'LOADING' | 'TESTING' | 'RESULTS';

export default function CustomExamBuilderModal({
  isOpen,
  onClose,
  activeSubject,
  subjectLectures = [],
  isDark = true,
  isGirls = false,
}: CustomExamBuilderModalProps) {
  // Phase State
  const [phase, setPhase] = useState<ExamPhase>('CONFIG');

  // Config State
  const [selectedLectureIds, setSelectedLectureIds] = useState<number[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [examMode, setExamMode] = useState<'simulation' | 'practice'>('simulation');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(15);

  // Runtime State
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize selected lectures whenever subjectLectures change
  useEffect(() => {
    if (subjectLectures.length > 0) {
      const readyIds = subjectLectures
        .filter(l => l.is_ready !== false && l.has_quiz !== false)
        .map(l => l.id);
      setSelectedLectureIds(readyIds);
    }
  }, [subjectLectures, isOpen]);

  // Adjust time limit automatically when question count changes
  useEffect(() => {
    if (questionCount === 10) setTimeLimitMinutes(15);
    else if (questionCount === 20) setTimeLimitMinutes(30);
    else if (questionCount === 30) setTimeLimitMinutes(45);
  }, [questionCount]);

  // Timer Countdown in simulation mode
  useEffect(() => {
    if (phase === 'TESTING' && examMode === 'simulation' && secondsRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, examMode, secondsRemaining]);

  if (!isOpen) return null;

  // Toggle single lecture selection
  const toggleLecture = (id: number) => {
    setSelectedLectureIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select / Deselect all
  const selectAllLectures = () => {
    const all = subjectLectures.map(l => l.id);
    setSelectedLectureIds(all);
  };
  const deselectAllLectures = () => {
    setSelectedLectureIds([]);
  };

  // Launch Exam: Fetch quizzes for selected lectures, assemble reservoir, and shuffle
  const handleStartExam = async () => {
    if (selectedLectureIds.length === 0) return;
    setPhase('LOADING');
    setLoadingStatus('جاري استدعاء وتوليف كويزات المحاضرات المختارة...');

    try {
      const quizzesByLecture: Record<number, { lectureNum: number; lectureTitle: string; questions: QuizQuestion[] }> = {};

      for (const lid of selectedLectureIds) {
        const lec = subjectLectures.find(l => l.id === lid);
        if (!lec) continue;

        try {
          // Fetch lecture bundle
          const bundle: AcademicLectureBundle = await getDirectSupabaseBundle(lid, getApiBaseUrl());
          const quizAsset = bundle?.assets?.find(a => a.asset_type === 'quiz_md');
          if (quizAsset) {
            let quizText = quizAsset.content_text || '';
            if (!quizText && quizAsset.stream_url) {
              const res = await fetch(getApiUrl(quizAsset.stream_url));
              if (res.ok) quizText = await res.text();
            }
            if (quizText) {
              const parsed = parseQuizMarkdown(quizText);
              if (parsed && parsed.length > 0) {
                quizzesByLecture[lid] = {
                  lectureNum: lec.lecture_num,
                  lectureTitle: lec.title,
                  questions: parsed,
                };
              }
            }
          }
        } catch (err) {
          console.warn(`Could not load quiz for lecture ${lid}:`, err);
        }
      }

      const config: ExamConfig = {
        subjectId: activeSubject?.id || 1,
        subjectName: activeSubject?.name || 'الرياضيات',
        selectedLectureIds,
        questionCount,
        mode: examMode,
        timeLimitMinutes,
      };

      const assembled = buildExamQuestions(quizzesByLecture, config);
      if (assembled.length === 0) {
        alert('لم نتمكن من العثور على أسئلة كافية في المحاضرات المختارة. يرجى اختيار محاضرات مكتملة.');
        setPhase('CONFIG');
        return;
      }

      setQuestions(assembled);
      setUserAnswers({});
      setFlaggedQuestions({});
      setCurrentIdx(0);
      const totalSec = timeLimitMinutes * 60;
      setTotalSeconds(totalSec);
      setSecondsRemaining(totalSec);
      setPhase('TESTING');
    } catch (err) {
      console.error('Failed to start exam:', err);
      alert('حدث خطأ أثناء إعداد الامتحان. يرجى المحاولة مرة أخرى.');
      setPhase('CONFIG');
    }
  };

  // Submit & Grade Exam
  const handleFinishExam = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const duration = totalSeconds - secondsRemaining;
    const result = evaluateExam(questions, userAnswers, duration, secondsRemaining, isGirls);
    setExamResult(result);
    setPhase('RESULTS');
    setShowExitConfirm(false);
  };

  // Format MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all"
        style={{
          backgroundColor: isDark ? '#111620' : '#FFFFFF',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
          boxShadow: isDark ? '0 0 50px rgba(59, 130, 246, 0.15)' : '0 20px 40px rgba(0,0,0,0.1)',
        }}
      >
        {/* ======================================================== */}
        {/* PHASE 1: CONFIGURATION SCREEN                           */}
        {/* ======================================================== */}
        {phase === 'CONFIG' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
                  <Timer className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                    محاكي الميدترم والامتحانات المخصصة ⚡
                  </h3>
                  <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {activeSubject?.name ? `مقرر: ${activeSubject.name}` : 'حدد نطاق المحاضرات ونمط الاختبار'}
                  </p>
                </div>
              </div>
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

            {/* Scrollable Config Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* 1. Exam Scope: Select Lectures */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>نطاق المحاضرات الداخلة في الامتحان:</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedLectureIds.length} من {subjectLectures.length} محاضرة
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllLectures}
                      className="text-blue-500 hover:underline font-bold cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <button
                      type="button"
                      onClick={deselectAllLectures}
                      className="text-rose-500 hover:underline font-bold cursor-pointer"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 rounded-2xl border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  {subjectLectures.map(lec => {
                    const isSelected = selectedLectureIds.includes(lec.id);
                    return (
                      <div
                        key={lec.id}
                        onClick={() => toggleLecture(lec.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs sm:text-sm font-bold cursor-pointer transition-all select-none ${
                          isSelected ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          borderColor: isSelected ? 'rgba(59, 130, 246, 0.5)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
                        }}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : ''}`} style={{ borderColor: isSelected ? '#3B82F6' : 'var(--border-prominent)' }}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate flex-1">
                          المحاضرة {lec.lecture_num}: {lec.title.replace(/^المحاضرة \d+:\s*/, '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Question Volume */}
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  <span>عدد الأسئلة:</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[10, 20, 30].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`p-3 rounded-2xl border text-center font-black text-sm sm:text-base transition-all cursor-pointer ${
                        questionCount === cnt ? 'scale-102 shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: questionCount === cnt ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface)',
                        borderColor: questionCount === cnt ? '#F59E0B' : 'var(--border-subtle)',
                        color: questionCount === cnt ? '#F59E0B' : 'var(--text-primary)'
                      }}
                    >
                      <div>{cnt} سؤال</div>
                      <div className="text-[11px] font-normal opacity-75 mt-0.5">
                        {cnt === 10 ? 'سريع (15 د)' : cnt === 20 ? 'ميدترم (30 د)' : 'فاينال مكثف (45 د)'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Exam Mode */}
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>نمط الاختبار:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExamMode('simulation')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      examMode === 'simulation' ? 'scale-[1.01] shadow-md border-purple-500' : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: examMode === 'simulation' ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-surface)',
                      borderColor: examMode === 'simulation' ? '#A855F7' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between font-black text-sm sm:text-base mb-1" style={{ color: examMode === 'simulation' ? '#A855F7' : 'var(--text-primary)' }}>
                      <span>🎯 محاكاة امتحان رسمية</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">موصى به</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      مؤقت زمني حاسم، حجب الإجابات أثناء الحل، ومراجعة تشخيصية شاملة لجميع المحاضرات فور التسليم.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamMode('practice')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                      examMode === 'practice' ? 'scale-[1.01] shadow-md border-emerald-500' : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: examMode === 'practice' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                      borderColor: examMode === 'practice' ? '#10B981' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="font-black text-sm sm:text-base mb-1" style={{ color: examMode === 'practice' ? '#10B981' : 'var(--text-primary)' }}>
                      <span>💡 وضع التدريب والمراجعة</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      حل بروقان بدون ضغط وقت، مع إمكانية معرفة الإجابة النموذجية وقراءة الشرح فور اختيار الإجابة.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer / CTA */}
            <div
              className="p-4 sm:p-5 border-t flex items-center justify-between shrink-0"
              style={{
                backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span>🎯 توليف عشوائي منصف من بنك أسئلة المحاضرات</span>
              </div>
              <button
                type="button"
                disabled={selectedLectureIds.length === 0}
                onClick={handleStartExam}
                className="px-6 py-2.5 rounded-2xl font-black text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-2 shadow-lg"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
                }}
              >
                <span>ابدأ الامتحان الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PHASE 2: LOADING SCREEN                                 */}
        {/* ======================================================== */}
        {phase === 'LOADING' && (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-center p-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <h4 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {loadingStatus}
            </h4>
            <p className="text-xs sm:text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
              نطبق خوارزمية Fisher-Yates لتوزيع الأسئلة بنسب متكافئة بين المحاضرات المختارة لضمان محاكاة حقيقية.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* PHASE 3: LIVE TESTING ENVIRONMENT                       */}
        {/* ======================================================== */}
        {phase === 'TESTING' && questions.length > 0 && (() => {
          const currentQ = questions[currentIdx];
          const chosenOpt = userAnswers[currentIdx];
          const isAnswered = chosenOpt !== undefined;
          const isPractice = examMode === 'practice';
          const isTimeWarning = examMode === 'simulation' && secondsRemaining <= 180; // 3 min

          return (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Exam Top Bar */}
              <div
                className="flex items-center justify-between p-3.5 sm:p-5 border-b shrink-0 flex-wrap gap-2"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                    المحاضرة {currentQ.lectureNum}
                  </span>
                  <span className="text-xs font-semibold hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                    السؤال {currentIdx + 1} من {questions.length}
                  </span>
                </div>

                {/* Countdown Timer (if simulation) */}
                {examMode === 'simulation' ? (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black font-mono border transition-all ${
                      isTimeWarning ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{formatTimer(secondsRemaining)}</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    💡 نمط تدريب ومراجعة
                  </span>
                )}

                {/* Finish Exam Button */}
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  className="px-3.5 py-1 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  إنهاء وتسليم
                </button>
              </div>

              {/* Progress Bar & Question Dots Bar */}
              <div className="px-4 py-2 border-b bg-black/10 shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  {questions.map((q, idx) => {
                    const isAns = userAnswers[idx] !== undefined;
                    const isCur = idx === currentIdx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold font-mono shrink-0 transition-all cursor-pointer flex items-center justify-center border ${
                          isCur
                            ? 'scale-110 shadow-md font-black border-blue-400 bg-blue-500 text-white'
                            : isAns
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                            : 'opacity-50 hover:opacity-100 border-gray-600'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* Question Statement */}
                <div
                  className="p-4 sm:p-6 rounded-2xl border text-base sm:text-xl font-bold leading-relaxed"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <MathRenderer text={currentQ.question} />
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = chosenOpt === optIdx;
                    const isCorrect = optIdx === currentQ.correctIndex;
                    
                    let bg = isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB';
                    let border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                    let color = 'var(--text-primary)';

                    if (isPractice && isAnswered) {
                      if (isCorrect) {
                        bg = 'rgba(16, 185, 129, 0.15)';
                        border = '#10B981';
                        color = isDark ? '#6EE7B7' : '#065F46';
                      } else if (isSelected) {
                        bg = 'rgba(239, 68, 68, 0.15)';
                        border = '#EF4444';
                        color = isDark ? '#FCA5A5' : '#991B1B';
                      }
                    } else if (isSelected) {
                      bg = 'rgba(59, 130, 246, 0.15)';
                      border = '#3B82F6';
                      color = isDark ? '#93C5FD' : '#1D4ED8';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          if (isPractice && isAnswered) return; // locked after answer in practice
                          setUserAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
                        }}
                        className={`w-full text-right p-3.5 sm:p-4 rounded-2xl border text-sm sm:text-base font-bold transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected ? 'scale-[1.01] shadow-md' : 'hover:scale-[1.005]'
                        }`}
                        style={{ backgroundColor: bg, borderColor: border, color }}
                      >
                        <span className="w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ borderColor: border }}>
                          {['أ', 'ب', 'ج', 'د'][optIdx] || optIdx + 1}
                        </span>
                        <div className="flex-1">
                          <MathRenderer text={opt} />
                        </div>
                        {isPractice && isAnswered && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {isPractice && isAnswered && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Feedback in Practice Mode */}
                {isPractice && isAnswered && (
                  <div
                    className="p-4 rounded-2xl border space-y-2 text-xs sm:text-sm animate-fadeIn"
                    style={{
                      backgroundColor: chosenOpt === currentQ.correctIndex ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      borderColor: chosenOpt === currentQ.correctIndex ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    <div className="font-bold" style={{ color: chosenOpt === currentQ.correctIndex ? '#10B981' : '#EF4444' }}>
                      {chosenOpt === currentQ.correctIndex ? 'إجابة صحيحة ومتقنة! 🎯' : 'إجابة غير صحيحة — ركز في النقطة دي 💡'}
                    </div>
                    {currentQ.hint && (
                      <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        💡 <strong>التوضيح:</strong> {currentQ.hint}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Footer */}
              <div
                className="p-3.5 sm:p-5 border-t flex items-center justify-between shrink-0"
                style={{
                  backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <span>تمت الإجابة على {answeredCount} من {questions.length}</span>
                </div>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black text-white cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(true)}
                    className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-md"
                  >
                    <span>تسليم الامتحان 🏁</span>
                  </button>
                )}
              </div>

              {/* Exit Confirmation Dialog */}
              {showExitConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                  <div
                    className="w-full max-w-sm rounded-3xl border p-5 sm:p-6 text-center space-y-4 shadow-2xl"
                    style={{
                      backgroundColor: isDark ? '#1C2533' : '#FFFFFF',
                      borderColor: 'var(--border-prominent)',
                    }}
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h4 className="text-base sm:text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                      هل أنت متأكد من تسليم الامتحان؟
                    </h4>
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                      أجبت على {answeredCount} من أصل {questions.length} سؤال. سيتم احتساب النتيجة وتوليد التقرير التشخيصي فوراً.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowExitConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold border cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        العودة للامتحان
                      </button>
                      <button
                        type="button"
                        onClick={handleFinishExam}
                        className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-500 cursor-pointer shadow-md transition-all"
                      >
                        تأكيد التسليم
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* PHASE 4: POST-MORTEM DIAGNOSTIC REPORT RESULTS          */}
        {/* ======================================================== */}
        {phase === 'RESULTS' && examResult && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Results Header */}
            <div
              className="p-5 sm:p-6 border-b text-center space-y-2 shrink-0"
              style={{
                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black border shadow-md animate-bounce"
                style={{
                  backgroundColor: `${examResult.gradeColor}18`,
                  borderColor: `${examResult.gradeColor}45`,
                  color: examResult.gradeColor,
                }}
              >
                <Award className="w-4 h-4" />
                <span>{examResult.gradeLabel}</span>
              </div>

              <div className="text-3xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {examResult.score} <span className="text-lg sm:text-2xl font-bold opacity-60">/ {examResult.totalQuestions}</span>
                <span className="text-xl sm:text-2xl font-bold mr-3 font-mono" style={{ color: examResult.gradeColor }}>
                  ({examResult.percentage}%)
                </span>
              </div>

              <p className="text-xs sm:text-sm max-w-lg mx-auto font-medium" style={{ color: 'var(--text-secondary)' }}>
                {examResult.recommendation}
              </p>
            </div>

            {/* Results Body: Diagnostic Breakdown & Review */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Lecture-by-Lecture Mastery Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📊 التقرير التشخيصي لمستوى الإتقان حسب كل محاضرة:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {examResult.lectureBreakdown.map(b => (
                    <div
                      key={b.lectureId}
                      className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-xs"
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                        borderColor: b.isWeakPoint
                          ? 'rgba(239, 68, 68, 0.4)'
                          : b.percentage >= 80
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black">المحاضرة {b.lectureNum}</span>
                          {b.isWeakPoint ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30">
                              ⚠️ بحاجة لمراجعة
                            </span>
                          ) : b.percentage >= 80 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              متقن 🟢
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {b.lectureTitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black font-mono" style={{ color: b.isWeakPoint ? '#EF4444' : '#10B981' }}>
                          {b.correct}/{b.total} ({b.percentage}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Question Review Sheet */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📝 كشف ومراجعة الأسئلة بالكامل:</span>
                </h4>
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const chosen = userAnswers[idx];
                    const isCorrect = chosen !== undefined && chosen === q.correctIndex;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border space-y-2.5 text-xs sm:text-sm"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                          borderColor: isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 font-bold">
                          <span className="flex items-center gap-1.5" style={{ color: isCorrect ? '#10B981' : '#EF4444' }}>
                            {isCorrect ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                            <span>السؤال {idx + 1} (المحاضرة {q.lectureNum})</span>
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                            {isCorrect ? 'صحيحة (+1)' : 'خاطئة (0)'}
                          </span>
                        </div>

                        <div className="font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                          <MathRenderer text={q.question} />
                        </div>

                        <div className="space-y-1 text-xs pt-1 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">الإجابة النموذجية:</span>
                            <span>{q.options[q.correctIndex]}</span>
                          </div>
                          {!isCorrect && (
                            <div className="flex items-center gap-2 text-rose-400">
                              <span className="font-bold">إجابتك:</span>
                              <span>{chosen !== undefined ? q.options[chosen] : 'لم تتم الإجابة'}</span>
                            </div>
                          )}
                          {q.hint && (
                            <p className="mt-1 leading-relaxed opacity-85" style={{ color: 'var(--text-muted)' }}>
                              💡 <strong>التوضيح:</strong> {q.hint}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results Footer */}
            <div
              className="p-4 sm:p-5 border-t flex items-center justify-between shrink-0 flex-wrap gap-2"
              style={{
                backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => setPhase('CONFIG')}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة الاختبار بنموذج جديد</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-xs sm:text-sm font-black text-white cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                تم، العودة للمقررات
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
