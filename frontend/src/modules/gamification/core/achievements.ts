import { GAMIFICATION_CONFIG, BadgeDefinition } from '@/config/gamification-rules';
import { AppEvent, GamificationEffect } from '@/shared/events/types';
import { createEffect } from '@/shared/events/bus';
import { GamificationState, isCompletedActivity } from './types';

/**
 * Pure function: Evaluates state and incoming event to check if any new badge is unlocked.
 */
export function evaluateAchievements(
  state: GamificationState,
  event: AppEvent
): {
  nextState: GamificationState;
  newBadges: BadgeDefinition[];
  effects: GamificationEffect[];
} {
  const newBadges: BadgeDefinition[] = [];
  const effects: GamificationEffect[] = [];
  const unlocked = new Set(state.unlockedBadges);

  // Helper to check and unlock
  const unlock = (badgeId: string) => {
    if (!unlocked.has(badgeId)) {
      const def = GAMIFICATION_CONFIG.badges.find((b) => b.id === badgeId);
      if (def) {
        unlocked.add(badgeId);
        newBadges.push(def);
        effects.push(
          createEffect('badge.unlocked', {
            badgeId: def.id,
            title: def.title,
            description: def.description,
            icon: def.icon,
          })
        );
        effects.push(createEffect('sound.play', { sound: 'badge_unlock' }));
        effects.push(createEffect('confetti.trigger', { intensity: 'medium' }));
      }
    }
  };

  // 1. "أول الغيث" - First step (Awarded strictly on first completed educational activity)
  if (isCompletedActivity(event)) {
    unlock('first_step');
  }

  // 2. Streaks (streak_3, streak_7)
  if (state.currentStreak >= 3) {
    unlock('streak_3');
  }
  if (state.currentStreak >= 7) {
    unlock('streak_7');
  }

  // 3. Perfect Quiz (قناص الدرجات)
  if (
    event.type === 'quiz.finished' &&
    event.payload.score === event.payload.total &&
    event.payload.attempt === 1
  ) {
    unlock('perfect_quiz');
  }

  // 4. Night Owl (سهران مع فيرما) - Activity between 10 PM and 4 AM Cairo time
  const cairoHour = new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: 'numeric',
      hour12: false,
    }).format(new Date(event.meta.timestamp))
  ).getHours();

  if (
    (cairoHour >= 22 || cairoHour < 4) &&
    (event.type === 'quiz.finished' || event.type === 'lecture.completed')
  ) {
    unlock('night_owl');
  }

  // 5. Podcast Master (سميع الزتونة)
  if (state.audioCompletedCount >= 3) {
    unlock('podcast_master');
  }

  // 6. Video Champion (رؤية ثاقبة)
  if (state.videoCompletedCount >= 3) {
    unlock('video_champion');
  }

  // 7. Deck Crusher (حوت الفلاش كاردز)
  if (state.decksCompletedCount >= 3) {
    unlock('deck_crusher');
  }

  // 8. Five of Five (دحيح الدفعة)
  if (event.type === 'lecture.completed') {
    unlock('five_of_five');
  }

  const nextState: GamificationState = {
    ...state,
    unlockedBadges: Array.from(unlocked),
  };

  return { nextState, newBadges, effects };
}
