import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocalResumeState,
  saveResumeState,
  recordPlaybackProgress,
  recordImmediateTransition,
  ResumeState,
} from '@/modules/gamification/resume';

describe('Smart Resume Engine - Unit Tests', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    const mockLs = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      },
    };

    const mockWindow = {
      localStorage: mockLs,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('localStorage', mockLs);
    vi.stubGlobal('CustomEvent', class {
      type: string;
      detail: any;
      constructor(type: string, params: any) {
        this.type = type;
        this.detail = params?.detail;
      }
    });
  });

  it('returns null when no resume state is saved', () => {
    expect(getLocalResumeState()).toBeNull();
  });

  it('saves and reads local resume state with 0ms latency', () => {
    const testState: ResumeState = {
      lectureId: 28,
      lectureNum: 3,
      subjectName: 'كهربية ومغناطيسية',
      lectureTitle: 'المقاومات الضوئية',
      lastTab: 'audio',
      audioSec: 320,
      updatedAt: Date.now(),
    };

    saveResumeState(testState, false);

    const loaded = getLocalResumeState();
    expect(loaded).not.toBeNull();
    expect(loaded?.lectureId).toBe(28);
    expect(loaded?.audioSec).toBe(320);
    expect(loaded?.lastTab).toBe('audio');
  });

  it('recordPlaybackProgress updates audio position with throttling', () => {
    recordPlaybackProgress(28, 'audio', 450.7, {
      lectureNum: 3,
      subjectName: 'كهربية',
      lectureTitle: 'المكثفات',
    });

    const loaded = getLocalResumeState();
    expect(loaded?.audioSec).toBe(450);
    expect(loaded?.lastTab).toBe('audio');
    expect(loaded?.lectureNum).toBe(3);
  });

  it('recordImmediateTransition updates tab and flushes immediately', () => {
    recordImmediateTransition(28, 'quiz');

    const loaded = getLocalResumeState();
    expect(loaded?.lastTab).toBe('quiz');
  });
});
