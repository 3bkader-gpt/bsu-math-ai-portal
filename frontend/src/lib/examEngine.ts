/**
 * Custom Exam Engine & Diagnostic Post-Mortem Analyzer
 * 
 * Implements Fisher-Yates reservoir sampling for balanced lecture distribution,
 * deterministic question hash generation, and pedagogical diagnostic breakdown.
 */

import type { QuizQuestion } from '@/lib/lecture-utils';

export interface ExamConfig {
  subjectId: number;
  subjectName: string;
  selectedLectureIds: number[];
  questionCount: number; // 10, 20, or 30
  mode: 'simulation' | 'practice';
  timeLimitMinutes: number; // e.g. 15, 30, 45
}

export interface ExamQuestion extends QuizQuestion {
  id: string; // unique exam question identifier
  lectureId: number;
  lectureNum: number;
  lectureTitle: string;
  questionHash: string;
}

export interface LectureDiagnosticItem {
  lectureId: number;
  lectureNum: number;
  lectureTitle: string;
  total: number;
  correct: number;
  percentage: number;
  isWeakPoint: boolean; // e.g. percentage < 60%
}

export interface ExamResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  gradeLabel: string;
  gradeColor: string;
  durationSeconds: number;
  timeRemainingSeconds: number;
  lectureBreakdown: LectureDiagnosticItem[];
  criticalWeakLectures: LectureDiagnosticItem[];
  masteredLectures: LectureDiagnosticItem[];
  recommendation: string;
}

/**
 * Computes deterministic 32-bit question hash
 */
export function computeQuestionHash(text: string): string {
  let hashVal = 0;
  const cleanQ = text.trim().toLowerCase();
  for (let i = 0; i < cleanQ.length; i++) {
    hashVal = (hashVal << 5) - hashVal + cleanQ.charCodeAt(i);
    hashVal |= 0;
  }
  return 'q_' + Math.abs(hashVal).toString(36);
}

/**
 * Shuffles an array in-place using Fisher-Yates algorithm
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Samples questions uniformly across selected lectures
 */
export function buildExamQuestions(
  quizzesByLecture: Record<number, { lectureNum: number; lectureTitle: string; questions: QuizQuestion[] }>,
  config: ExamConfig
): ExamQuestion[] {
  const selectedLecIds = config.selectedLectureIds.filter(id => quizzesByLecture[id]?.questions?.length > 0);
  if (selectedLecIds.length === 0) return [];

  // Group and wrap questions with metadata
  const lectureBuckets: Record<number, ExamQuestion[]> = {};
  selectedLecIds.forEach(lid => {
    const lec = quizzesByLecture[lid];
    lectureBuckets[lid] = shuffleArray(
      lec.questions.map((q, idx) => ({
        ...q,
        id: `exam_q_${lid}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        lectureId: lid,
        lectureNum: lec.lectureNum,
        lectureTitle: lec.lectureTitle,
        questionHash: computeQuestionHash(q.question),
      }))
    );
  });

  const selectedQuestions: ExamQuestion[] = [];
  const targetCount = config.questionCount;

  // Round-robin reservoir extraction to ensure fair representation of each selected lecture
  let hasMore = true;
  while (selectedQuestions.length < targetCount && hasMore) {
    hasMore = false;
    for (const lid of selectedLecIds) {
      if (selectedQuestions.length >= targetCount) break;
      const bucket = lectureBuckets[lid];
      if (bucket && bucket.length > 0) {
        selectedQuestions.push(bucket.shift()!);
        hasMore = true;
      }
    }
  }

  // Final overall shuffle so questions from the same lecture don't appear in contiguous blocks
  return shuffleArray(selectedQuestions);
}

/**
 * Evaluates exam submission and computes post-mortem pedagogical diagnostic vector
 */
export function evaluateExam(
  questions: ExamQuestion[],
  userAnswers: Record<number, number>,
  durationSeconds: number,
  timeRemainingSeconds: number,
  isGirls: boolean = false
): ExamResult {
  const totalQuestions = questions.length;
  let correctCount = 0;

  // Track per-lecture performance
  const lectureStatsMap: Record<number, { lectureNum: number; lectureTitle: string; total: number; correct: number }> = {};

  questions.forEach((q, idx) => {
    const chosen = userAnswers[idx];
    const isCorrect = chosen !== undefined && chosen === q.correctIndex;
    if (isCorrect) correctCount++;

    if (!lectureStatsMap[q.lectureId]) {
      lectureStatsMap[q.lectureId] = {
        lectureNum: q.lectureNum,
        lectureTitle: q.lectureTitle,
        total: 0,
        correct: 0,
      };
    }
    lectureStatsMap[q.lectureId].total += 1;
    if (isCorrect) {
      lectureStatsMap[q.lectureId].correct += 1;
    }
  });

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Academic Grade
  let gradeLabel = 'راسب — بحاجة لمراجعة مكثفة';
  let gradeColor = '#EF4444'; // Red
  if (percentage >= 85) {
    gradeLabel = isGirls ? 'امتياز يا عبقرية! 🌸✨' : 'امتياز مع مرتبة الشرف 🏆';
    gradeColor = '#10B981'; // Emerald
  } else if (percentage >= 75) {
    gradeLabel = isGirls ? 'جيد جداً مرتفع 🌸' : 'جيد جداً مرتفع 🎯';
    gradeColor = '#3B82F6'; // Blue
  } else if (percentage >= 65) {
    gradeLabel = 'جيد — أداء طيب 💡';
    gradeColor = '#F59E0B'; // Amber
  } else if (percentage >= 50) {
    gradeLabel = 'مقبول — في فرصة كبيرة للتحسين 💪';
    gradeColor = '#F97316'; // Orange
  }

  // Breakdown array
  const lectureBreakdown: LectureDiagnosticItem[] = Object.entries(lectureStatsMap).map(([lidStr, stats]) => {
    const lid = parseInt(lidStr, 10);
    const lecPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    return {
      lectureId: lid,
      lectureNum: stats.lectureNum,
      lectureTitle: stats.lectureTitle,
      total: stats.total,
      correct: stats.correct,
      percentage: lecPct,
      isWeakPoint: lecPct < 60,
    };
  }).sort((a, b) => a.lectureNum - b.lectureNum);

  const criticalWeakLectures = lectureBreakdown.filter(l => l.isWeakPoint);
  const masteredLectures = lectureBreakdown.filter(l => l.percentage >= 80);

  // Personalized pedagogical recommendation
  let recommendation = '';
  if (criticalWeakLectures.length > 0) {
    const weakNames = criticalWeakLectures.map(w => `المحاضرة ${w.lectureNum}`).join(' و ');
    recommendation = isGirls
      ? `شطورة جداً في حلك 🌸! بننصحك تركزي تراجعي زتونة وبطاقات استذكار (${weakNames}) قبل امتحان الفاينال علشان تضمني الدرجة النهائية.`
      : `عاش يا بطل! نقاط التحسين الأساسية متمركزة في (${weakNames}). راجع كروت الاستذكار والزتونة الخاصة بها وهتقفل الامتحان بكل ثقة.`;
  } else {
    recommendation = isGirls
      ? 'ما شاء الله تبارك الله! استيعابك للمنهج متكامل وبدون أي فجوات، واثقين فيكي جداً في امتحانات الميدترم والفاينال 🌸✨'
      : 'أداء أسطوري! استيعابك شامل ومتقن لجميع المحاضرات المختارة. أنت جاهز للامتحان 100% 🎯';
  }

  return {
    score: correctCount,
    totalQuestions,
    percentage,
    gradeLabel,
    gradeColor,
    durationSeconds,
    timeRemainingSeconds,
    lectureBreakdown,
    criticalWeakLectures,
    masteredLectures,
    recommendation,
  };
}
