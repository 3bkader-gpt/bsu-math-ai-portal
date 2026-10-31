/**
 * Zero-Bandwidth Synthetic Focus Sound Engine & Procedural Ambient Noise
 * 
 * Generates soothing Brownian noise, gentle rain, and white noise directly in the browser
 * using the Web Audio API with 0 audio downloads, 0 bandwidth, and 100% offline support.
 * Also manages the Pomodoro Focus Session lifecycle with +15 XP rewards.
 */

export type AmbientSoundType = 'none' | 'brown' | 'rain' | 'white';

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;

let currentAmbientType: AmbientSoundType = 'none';
let currentVolume: number = 0.5;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
 * Generates a 5-second looping buffer of synthetic Brownian Noise.
 * Brownian noise has high energy at low frequencies (1/f^2), creating a warm,
 * deep rumble that masks distractions and induces deep math focus.
 */
function createBrownianNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferLength = sampleRate * 5; // 5 seconds loop
  const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < bufferLength; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5; // Gain normalization
  }

  // Crossfade ends to eliminate audio click on loop
  const fadeSamples = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < fadeSamples; i++) {
    const ratio = i / fadeSamples;
    data[i] = data[i] * ratio + data[bufferLength - fadeSamples + i] * (1 - ratio);
  }

  return buffer;
}

/**
 * Generates a 5-second looping buffer of synthetic Rainfall.
 * Combines pink noise filtering with randomized gentle transient droplets.
 */
function createRainBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferLength = sampleRate * 5;
  const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferLength; i++) {
    const white = Math.random() * 2 - 1;
    // Pink noise filter poles
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;

    // Soft rain droplets
    if (Math.random() < 0.0008) {
      pink += (Math.random() * 2 - 1) * 0.8;
    }
    data[i] = pink * 0.12;
  }

  // Crossfade ends
  const fadeSamples = Math.floor(sampleRate * 0.05);
  for (let i = 0; i < fadeSamples; i++) {
    const ratio = i / fadeSamples;
    data[i] = data[i] * ratio + data[bufferLength - fadeSamples + i] * (1 - ratio);
  }

  return buffer;
}

/**
 * Generates a 3-second looping buffer of pure White Noise.
 */
function createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferLength = sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferLength; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.15;
  }

  return buffer;
}

/**
 * Starts generating procedural ambient noise
 */
export function setAmbientSound(type: AmbientSoundType, volume = currentVolume): void {
  currentVolume = Math.max(0, Math.min(1, volume));

  if (type === 'none') {
    stopAmbientSound();
    currentAmbientType = 'none';
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  // Stop any currently playing ambient node
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch {}
    currentSource = null;
  }

  let buffer: AudioBuffer;
  switch (type) {
    case 'brown':
      buffer = createBrownianNoiseBuffer(ctx);
      break;
    case 'rain':
      buffer = createRainBuffer(ctx);
      break;
    case 'white':
      buffer = createWhiteNoiseBuffer(ctx);
      break;
    default:
      return;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  if (!gainNode) {
    gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
  }

  if (!filterNode) {
    filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(type === 'brown' ? 800 : (type === 'rain' ? 3500 : 8000), ctx.currentTime);
    filterNode.connect(gainNode);
  } else {
    filterNode.frequency.setValueAtTime(type === 'brown' ? 800 : (type === 'rain' ? 3500 : 8000), ctx.currentTime);
  }

  gainNode.gain.setValueAtTime(currentVolume, ctx.currentTime);

  source.connect(filterNode);
  source.start(0);

  currentSource = source;
  currentAmbientType = type;
}

/**
 * Updates ambient volume smoothly
 */
export function setAmbientVolume(volume: number): void {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (gainNode && audioCtx) {
    gainNode.gain.setTargetAtTime(currentVolume, audioCtx.currentTime, 0.05);
  }
}

/**
 * Stops ambient sound generator
 */
export function stopAmbientSound(): void {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch {}
    currentSource = null;
  }
  currentAmbientType = 'none';
}

export function getCurrentAmbientType(): AmbientSoundType {
  return currentAmbientType;
}

export function getCurrentAmbientVolume(): number {
  return currentVolume;
}

// ----------------------------------------------------
// Pomodoro Focus Timer Model
// ----------------------------------------------------

export const POMODORO_FOCUS_MINUTES = 25;
export const POMODORO_BREAK_MINUTES = 5;
export const FOCUS_SESSION_XP_REWARD = 15;
export const STORAGE_KEY_POMODORO = 'bsu_pomodoro_state_v1';

export interface PomodoroState {
  isActive: boolean;
  isPaused: boolean;
  phase: 'focus' | 'break';
  remainingSeconds: number;
  totalSessionsCompleted: number;
}
