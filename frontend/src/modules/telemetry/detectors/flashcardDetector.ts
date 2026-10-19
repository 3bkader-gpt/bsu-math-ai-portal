import {
  trackFlashcardFlipped,
  trackFlashcardDeckCompleted,
  trackFlashcardSpeedRun,
} from '../collector';
import { FlashcardDetectorState } from '../types';

export function createFlashcardDetector(lectureId: number, totalCards = 0) {
  let state: FlashcardDetectorState = {
    lectureId,
    totalCards,
    flippedCards: new Set<number>(),
    startTimeMs: Date.now(),
    isDeckCompleted: false,
  };

  return {
    setTotalCards(total: number) {
      state.totalCards = total;
    },

    onCardFlipped(cardIndex: number): {
      isNewFlip: boolean;
      totalFlipped: number;
      isCompleted: boolean;
    } {
      const isNewFlip = !state.flippedCards.has(cardIndex);

      if (isNewFlip) {
        state.flippedCards.add(cardIndex);
        trackFlashcardFlipped(state.lectureId, cardIndex);
      }

      // Check if all cards in the deck have now been flipped
      let isCompleted = state.isDeckCompleted;
      if (
        state.totalCards > 0 &&
        state.flippedCards.size >= state.totalCards &&
        !state.isDeckCompleted
      ) {
        state.isDeckCompleted = true;
        isCompleted = true;

        trackFlashcardDeckCompleted(state.lectureId, state.totalCards);

        // Speed run milestone: completed full deck under 45 seconds (minimum 3 cards)
        const durationMs = Date.now() - state.startTimeMs;
        if (state.totalCards >= 3 && durationMs <= 45000) {
          trackFlashcardSpeedRun(state.lectureId, durationMs);
        }
      }

      return {
        isNewFlip,
        totalFlipped: state.flippedCards.size,
        isCompleted,
      };
    },

    reset(newLectureId?: number, newTotal?: number) {
      state = {
        lectureId: newLectureId ?? state.lectureId,
        totalCards: newTotal ?? state.totalCards,
        flippedCards: new Set<number>(),
        startTimeMs: Date.now(),
        isDeckCompleted: false,
      };
    },

    getState(): Readonly<FlashcardDetectorState> {
      return {
        ...state,
        flippedCards: new Set(state.flippedCards),
      };
    },
  };
}
