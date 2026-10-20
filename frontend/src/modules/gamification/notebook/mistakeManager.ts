import { useState, useEffect, useCallback } from 'react';
import {
  fetchDueMistakes,
  fetchMistakeNotebookSummary,
  submitMistakeReviewRpc,
} from '../supabase/gamification';
import { MistakeNotebookItem, SubmitMistakeReviewResponse } from '../supabase/types';
import { useGamificationStore } from '../store/useGamificationStore';

export interface MistakeSummaryState {
  total: number;
  dueCount: number;
  boxCounts: Record<number, number>;
  masteredCount: number;
}

/**
 * Custom hook to manage the Leitner Mistake Notebook state and reviews.
 */
export function useMistakeNotebook() {
  const [dueItems, setDueItems] = useState<MistakeNotebookItem[]>([]);
  const [summary, setSummary] = useState<MistakeSummaryState>({
    total: 0,
    dueCount: 0,
    boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    masteredCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [due, stats] = await Promise.all([
        fetchDueMistakes(),
        fetchMistakeNotebookSummary(),
      ]);
      setDueItems(due);
      setSummary(stats);
    } catch (err: any) {
      console.error('[MistakeManager] Load error:', err);
      setError(err?.message || 'تعذر تحميل كراسة الأخطاء.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Submits a review for a question.
   * STRICT GUARANTEE: Calls submitMistakeReviewRpc ONLY; NEVER emits quiz.question_answered.
   */
  const submitReview = async (
    questionHash: string,
    isCorrect: boolean,
    durationMs: number
  ): Promise<SubmitMistakeReviewResponse> => {
    const res = await submitMistakeReviewRpc(questionHash, isCorrect, durationMs);

    // Update local list: remove reviewed item
    setDueItems((prev) => prev.filter((item) => item.question_hash !== questionHash));

    // Update local summary counts
    setSummary((prev) => {
      const nextDue = Math.max(0, prev.dueCount - 1);
      const nextBoxes = { ...prev.boxCounts };
      if (res.isMastered) {
        return {
          ...prev,
          dueCount: nextDue,
          masteredCount: prev.masteredCount + 1,
        };
      }
      nextBoxes[res.boxLevel] = (nextBoxes[res.boxLevel] || 0) + 1;
      return {
        ...prev,
        dueCount: nextDue,
        boxCounts: nextBoxes,
      };
    });

    // If authoritative XP was awarded by the server, update client total XP immediately
    if (res.awardedXp > 0) {
      const storeState = useGamificationStore.getState();
      const currentXp = storeState.totalXp;
      storeState.reconcileWithServer({
        success: true,
        awardedXp: res.awardedXp,
        profile: {
          id: storeState.userId || '',
          nickname: '',
          persona: 'boys',
          totalXp: currentXp + res.awardedXp,
          level: Math.floor(Math.sqrt((currentXp + res.awardedXp) / 60)) + 1,
          currentStreak: storeState.currentStreak,
          longestStreak: storeState.longestStreak,
          lastActiveDate: storeState.lastActiveDate,
          freezesLeft: storeState.freezesRemaining,
        },
        newBadges: [],
      });
    }

    return res;
  };

  return {
    dueItems,
    summary,
    isLoading,
    error,
    refresh: loadData,
    submitReview,
  };
}
