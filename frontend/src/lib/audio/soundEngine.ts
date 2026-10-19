/**
 * Procedural Web Audio API Sound Synthesizer.
 * Generates dopamine micro-sounds in real-time with 0 external network requests,
 * 0 bundle bloat, and 100% offline compatibility.
 */

let audioCtx: AudioContext | null = null;

const STORAGE_KEY_MUTED = 'bsu_portal_audio_muted';

/**
 * Returns audio context safely, handling browser auto-play restrictions.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Checks if sound effects are muted by user preference.
 */
export function isAudioMuted(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    }
  } catch {}
  return false;
}

/**
 * Sets user mute preference persistently in LocalStorage.
 */
export function setAudioMuted(muted: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MUTED, muted ? 'true' : 'false');
    }
  } catch {}
}

/**
 * Toggles user mute preference and returns new state.
 */
export function toggleAudioMute(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

/**
 * Procedural tone generator: plays a frequency with envelope.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  peakGain = 0.2
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Synthesizes sound effects matching game events.
 */
export function playSound(
  sound: 'xp_chime' | 'level_up' | 'streak_fire' | 'badge_unlock' | 'quiz_correct'
): void {
  if (isAudioMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (sound) {
    case 'xp_chime': {
      // Ascending crystalline chord: C6 -> E6
      playTone(ctx, 1046.5, now, 0.15, 'sine', 0.15);
      playTone(ctx, 1318.5, now + 0.08, 0.25, 'sine', 0.18);
      break;
    }

    case 'quiz_correct': {
      // Crisp bell chime
      playTone(ctx, 880, now, 0.18, 'sine', 0.18);
      playTone(ctx, 1760, now + 0.05, 0.28, 'sine', 0.12);
      break;
    }

    case 'level_up': {
      // Glorious triumphant collegiate fanfare arpeggio: C5 -> E5 -> G5 -> C6 -> E6
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        playTone(ctx, freq, now + idx * 0.09, 0.45, 'triangle', 0.22);
        playTone(ctx, freq * 1.002, now + idx * 0.09, 0.45, 'sine', 0.12); // Chorus shimmer
      });
      break;
    }

    case 'badge_unlock': {
      // Sparkling achievement burst chord (C5 + G5 + C6 + E6)
      playTone(ctx, 523.25, now, 0.5, 'triangle', 0.15);
      playTone(ctx, 783.99, now + 0.04, 0.55, 'sine', 0.15);
      playTone(ctx, 1046.5, now + 0.08, 0.65, 'sine', 0.18);
      playTone(ctx, 1318.5, now + 0.12, 0.75, 'sine', 0.2);
      break;
    }

    case 'streak_fire': {
      // Warm rising fire resonance: 220Hz rising to 440Hz with soft harmonics
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.3); // Rise to D5

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      // Lowpass filter to give warm campfire warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.linearRampToValueAtTime(2400, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
      break;
    }
  }
}
