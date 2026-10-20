import { GAMIFICATION_CONFIG } from '@/config/gamification-rules';
import { AppEvent, GamificationEffect } from '@/shared/events/types';
import { GamificationState, ReducerResult, isCompletedActivity } from './types';
import { applyXpGain } from './xp';
import { evaluateDailyStreak, getCairoDate } from './streak';
import { evaluateAchievements } from './achievements';

/**
 * Root Pure Reducer: processes an incoming AppEvent against current GamificationState,
 * producing the next state and an array of side-effect triggers (sounds, confetti, modals).
 *
 * (state, event) => { nextState, effects[] }
 */
export function processGamificationEvent(
  state: GamificationState,
  event: AppEvent
): ReducerResult {
  const allEffects: GamificationEffect[] = [];
  const currentCairoDate = getCairoDate(event.meta.timestamp);
  let workingState = state;

  // 1. Evaluate Daily Streak ONLY on verified completed activity
  if (isCompletedActivity(event)) {
    const streakResult = evaluateDailyStreak(workingState, event.meta.timestamp);
    workingState = streakResult.nextState;
    allEffects.push(...streakResult.effects);

    // If streak was extended today, award daily streak XP bonus
    if (streakResult.streakExtended && streakResult.isNewDay) {
      const streakBonus = Math.min(
        workingState.currentStreak * GAMIFICATION_CONFIG.xp.streakDailyBonusFactor,
        GAMIFICATION_CONFIG.xp.maxStreakBonus
      );
      const xpRes = applyXpGain(
        workingState,
        streakBonus,
        `مكافأة الاستمرار اليومي (${workingState.currentStreak} أيام)`,
        currentCairoDate
      );
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
    }
  }

  // 2. Process XP and Action Metrics based on Event Type
  switch (event.type) {
    case 'media.completed': {
      const isVideo = event.payload.kind === 'video';
      const xpAmount = isVideo
        ? GAMIFICATION_CONFIG.xp.videoCompleted
        : GAMIFICATION_CONFIG.xp.audioCompleted;
      const reason = isVideo
        ? 'مشاهدة فيديو الشرح التفاعلي بالكامل'
        : 'الاستماع لبودكاست المحاضرة الصوتي بالكامل';

      workingState = {
        ...workingState,
        videoCompletedCount: isVideo
          ? workingState.videoCompletedCount + 1
          : workingState.videoCompletedCount,
        audioCompletedCount: !isVideo
          ? workingState.audioCompletedCount + 1
          : workingState.audioCompletedCount,
      };

      const xpRes = applyXpGain(workingState, xpAmount, reason, currentCairoDate);
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    case 'audio.streak_5min': {
      const xpRes = applyXpGain(
        workingState,
        GAMIFICATION_CONFIG.xp.audioMilestone5Min,
        'استماع متواصل 5 دقائق للبودكاست',
        currentCairoDate
      );
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    case 'video.streak_5min': {
      const xpRes = applyXpGain(
        workingState,
        GAMIFICATION_CONFIG.xp.videoMilestone5Min,
        'مشاهدة متواصلة 5 دقائق للفيديو',
        currentCairoDate
      );
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    case 'quiz.finished': {
      const { score, total } = event.payload;
      const base = GAMIFICATION_CONFIG.xp.quizBaseCompleted;
      const scoreRatio = total > 0 ? score / total : 0;
      const scoreBonus = Math.round(scoreRatio * GAMIFICATION_CONFIG.xp.quizMaxScoreBonus);
      const isPerfect = score === total && total > 0;
      const perfectBonus = isPerfect ? GAMIFICATION_CONFIG.xp.quizPerfectBonus : 0;

      const totalQuizXp = base + scoreBonus + perfectBonus;
      const reason = isPerfect
        ? `تقفيل كويز المحاضرة بامتياز (${score}/${total})`
        : `إكمال كويز المحاضرة (${score}/${total})`;

      const xpRes = applyXpGain(workingState, totalQuizXp, reason, currentCairoDate);
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    case 'quiz.question_answered': {
      const { isCorrect, durationMs, confidence } = event.payload;
      if (isCorrect && (durationMs ?? 0) >= 3000) {
        const bonus = confidence === 'high' ? 3 : 0;
        const totalXp = 5 + bonus;
        const reason = bonus > 0 ? 'إجابة سؤال كويز بثقة تامة 🎯' : 'إجابة سؤال كويز بشكل صحيح 💡';
        const xpRes = applyXpGain(workingState, totalXp, reason, currentCairoDate);
        workingState = xpRes.nextState;
        allEffects.push(...xpRes.effects);
      }
      break;
    }

    case 'quiz.mistake_reviewed': {
      const { durationMs, boxLevel } = event.payload;
      if ((durationMs ?? 0) >= 3000) {
        const xpRes = applyXpGain(
          workingState,
          15,
          `مراجعة وتثبيت خطأ سابق (صندوق ${boxLevel}) 🧠`,
          currentCairoDate
        );
        workingState = xpRes.nextState;
        allEffects.push(...xpRes.effects);
      }
      break;
    }

    case 'flashcard.flipped': {
      const xpRes = applyXpGain(
        workingState,
        GAMIFICATION_CONFIG.xp.flashcardFlip,
        'تقليب بطاقة استذكار',
        currentCairoDate
      );
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    case 'flashcard.deck_completed': {
      workingState = {
        ...workingState,
        decksCompletedCount: workingState.decksCompletedCount + 1,
      };
      const xpRes = applyXpGain(
        workingState,
        GAMIFICATION_CONFIG.xp.flashcardDeckCompleted,
        'إتمام مجموعة بطاقات الاستذكار بالكامل',
        currentCairoDate
      );
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    case 'study_guide.read': {
      if (event.payload.dwellSec >= 60) {
        const xpRes = applyXpGain(
          workingState,
          GAMIFICATION_CONFIG.xp.studyGuideDwell,
          'قراءة ومذاكرة دليل المحاضرة الشامل',
          currentCairoDate
        );
        workingState = xpRes.nextState;
        allEffects.push(...xpRes.effects);
      }
      break;
    }

    case 'lecture.completed': {
      workingState = {
        ...workingState,
        lecturesCompletedCount: workingState.lecturesCompletedCount + 1,
      };
      const xpRes = applyXpGain(
        workingState,
        50,
        'ختم المحاضرة بجميع وسائطها (5/5)',
        currentCairoDate
      );
      workingState = xpRes.nextState;
      allEffects.push(...xpRes.effects);
      break;
    }

    default:
      break;
  }

  // 3. Evaluate Achievements on updated state
  const achievementResult = evaluateAchievements(workingState, event);
  workingState = achievementResult.nextState;
  allEffects.push(...achievementResult.effects);

  return {
    state: workingState,
    effects: allEffects,
  };
}
