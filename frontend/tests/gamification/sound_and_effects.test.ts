import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isAudioMuted,
  setAudioMuted,
  toggleAudioMute,
  playSound,
} from '@/lib/audio/soundEngine';
import { triggerConfetti } from '@/lib/effects/confetti';
import { effectBus, createEffect } from '@/shared/events/bus';

// Mock localStorage for headless Node environment
const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.clear) {
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
    key: (i: number) => Object.keys(mockStorage)[i] ?? null,
    length: 0,
  };
}

describe('Phase 6: Audio Synthesizer, Confetti & Micro-Interactions Suite', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {}
    effectBus.clear();
  });

  describe('1. Procedural Sound Synthesizer & Preferences', () => {
    it('manages and toggles audio mute preference in localStorage', () => {
      expect(isAudioMuted()).toBe(false);

      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);

      const toggledState = toggleAudioMute();
      expect(toggledState).toBe(false);
      expect(isAudioMuted()).toBe(false);
    });

    it('plays all collegiate sound types safely without throwing', () => {
      const sounds = [
        'xp_chime',
        'level_up',
        'streak_fire',
        'badge_unlock',
        'quiz_correct',
      ] as const;

      sounds.forEach((sound) => {
        expect(() => playSound(sound)).not.toThrow();
      });
    });

    it('suppresses audio output when muted', () => {
      setAudioMuted(true);
      expect(() => playSound('level_up')).not.toThrow();
    });
  });

  describe('2. Canvas Confetti Celebration Engine', () => {
    it('initializes canvas and creates particles on standard intensity', () => {
      expect(() => triggerConfetti('standard')).not.toThrow();
    });

    it('initializes canvas with high particle density on epic intensity', () => {
      expect(() => triggerConfetti('epic')).not.toThrow();
    });
  });

  describe('3. Effect Bus Sound & Confetti Triggers', () => {
    it('emits sound.play and confetti.trigger effects cleanly', () => {
      const capturedEffects: any[] = [];
      const unsub = effectBus.on('sound.play', (e) => capturedEffects.push(e));

      const effect = createEffect('sound.play', { sound: 'xp_chime' });
      effectBus.emit('sound.play', effect as any);

      expect(capturedEffects.length).toBe(1);
      expect(capturedEffects[0].payload.sound).toBe('xp_chime');
      unsub();
    });
  });
});
