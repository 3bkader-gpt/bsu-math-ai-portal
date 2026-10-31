/**
 * Student Profile & AI Context Manager
 * 
 * Manages zero-friction student identity, local persistence, and prepares
 * rich student learning context for the upcoming AI Private Tutor API.
 */

import { getOrCreateDeviceId, updateStudentProfile as updateSupabaseProfile } from '@/modules/gamification/supabase/auth';
import { getLocalResumeState } from '@/modules/gamification/resume';

export const STUDENT_NAME_KEY = 'bsu_portal_student_nickname';
export const STUDENT_PERSONA_KEY = 'bsu_portal_persona';
export const STUDENT_ONBOARDED_KEY = 'bsu_student_has_onboarded_v1';
export const PROFILE_UPDATED_EVENT = 'bsu-student-profile-updated';

export interface StudentProfile {
  name: string;
  persona: 'boys' | 'girls';
  deviceId: string;
  hasOnboarded: boolean;
}

export interface StudentAIContext {
  studentName: string;
  persona: 'boys' | 'girls';
  deviceId: string;
  totalXp: number;
  level: number;
  streakDays: number;
  recordedMistakesCount: number;
  recentMistakeTopics: string[];
  lastVisitedLectureId: number | null;
  lastActiveTab: string | null;
  generatedAt: string;
}

/**
 * Returns the current student profile from localStorage.
 */
export function getStudentProfileLocal(): StudentProfile {
  if (typeof window === 'undefined') {
    return {
      name: '',
      persona: 'boys',
      deviceId: 'ssr',
      hasOnboarded: false,
    };
  }

  const rawName = localStorage.getItem(STUDENT_NAME_KEY) || '';
  const isDefault = rawName === 'عاشق الرياضيات' || rawName === 'عاشقة الرياضيات';
  const name = isDefault ? '' : rawName.trim();
  const persona = (localStorage.getItem(STUDENT_PERSONA_KEY) as 'boys' | 'girls') || 'boys';
  const hasOnboarded = localStorage.getItem(STUDENT_ONBOARDED_KEY) === 'true';
  const deviceId = getOrCreateDeviceId();

  return {
    name,
    persona,
    deviceId,
    hasOnboarded,
  };
}

/**
 * Determines whether the first-visit onboarding modal should appear.
 */
export function shouldPromptOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const profile = getStudentProfileLocal();
  return !profile.hasOnboarded || !profile.name;
}

/**
 * Saves the student name and persona locally and triggers background Supabase sync.
 */
export function saveStudentProfileLocal(name: string, persona: 'boys' | 'girls' = 'boys'): StudentProfile {
  const cleanName = name.trim();
  if (typeof window !== 'undefined') {
    if (cleanName) {
      localStorage.setItem(STUDENT_NAME_KEY, cleanName);
    }
    localStorage.setItem(STUDENT_PERSONA_KEY, persona);
    localStorage.setItem(STUDENT_ONBOARDED_KEY, 'true');

    // Sync with Supabase anonymous profile in background
    try {
      updateSupabaseProfile({ nickname: cleanName || undefined, persona });
    } catch (e) {
      console.warn('Silent Supabase profile sync error:', e);
    }

    // Broadcast change to all mounted components
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, {
      detail: { name: cleanName, persona }
    }));
  }

  return {
    name: cleanName,
    persona,
    deviceId: getOrCreateDeviceId(),
    hasOnboarded: true,
  };
}

/**
 * Prepares aggregated student context for the upcoming AI Private Tutor API.
 */
export function getStudentContextForAI(): StudentAIContext {
  const profile = getStudentProfileLocal();
  let totalXp = 0;
  let level = 1;
  let streakDays = 0;
  let recordedMistakesCount = 0;
  const recentMistakeTopics: string[] = [];

  if (typeof window !== 'undefined') {
    try {
      const gState = localStorage.getItem('bsu_gamification_state');
      if (gState) {
        const parsed = JSON.parse(gState);
        totalXp = parsed.state?.totalXp || 0;
        level = parsed.state?.level || 1;
        streakDays = parsed.state?.streak?.currentStreak || 0;
      }
    } catch {}

    try {
      const mistakes = localStorage.getItem('bsu_mistake_notebook_v1');
      if (mistakes) {
        const parsedMistakes = JSON.parse(mistakes);
        if (Array.isArray(parsedMistakes)) {
          recordedMistakesCount = parsedMistakes.length;
          parsedMistakes.slice(0, 5).forEach((m: any) => {
            if (m.topic && !recentMistakeTopics.includes(m.topic)) {
              recentMistakeTopics.push(m.topic);
            }
          });
        }
      }
    } catch {}
  }

  const resume = getLocalResumeState();

  return {
    studentName: profile.name || (profile.persona === 'girls' ? 'عاشقة الرياضيات' : 'عاشق الرياضيات'),
    persona: profile.persona,
    deviceId: profile.deviceId,
    totalXp,
    level,
    streakDays,
    recordedMistakesCount,
    recentMistakeTopics,
    lastVisitedLectureId: resume?.lectureId || null,
    lastActiveTab: resume?.lastTab || null,
    generatedAt: new Date().toISOString(),
  };
}

export const TEST_MODE_KEY = 'bsu_portal_test_mode';
export const TEST_MODE_CHANGED_EVENT = 'bsu_test_mode_changed';

/**
 * Returns true if the client is operating in Sandbox / Test Mode.
 * Test actions are strictly isolated from real cohort statistics and leaderboards.
 * Operates 100% silently in the background with ZERO visible UI footprint for real students.
 */
export function isTestModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Manual dev flag in localStorage (developers/admins only)
    if (localStorage.getItem(TEST_MODE_KEY) === 'true') return true;

    // 2. Automated browser test suites (Playwright / Puppeteer / Selenium)
    if (typeof navigator !== 'undefined' && (navigator.webdriver || (window as any).__TEST_ENV__)) {
      return true;
    }

    // 3. Secret URL query parameter ?test_mode=1 or ?sandbox=true
    if (typeof window.location !== 'undefined' && window.location.search) {
      const search = window.location.search;
      if (search.includes('test_mode=1') || search.includes('sandbox=true')) {
        return true;
      }
    }

    // 4. Test nicknames used during testing
    const profile = getStudentProfileLocal();
    if (
      profile.name.includes('تجربة') ||
      profile.name.toLowerCase().includes('test') ||
      profile.name.includes('فرماو')
    ) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Enables or disables Sandbox / Test Mode for the current browser session.
 */
export function setTestMode(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEST_MODE_KEY, active ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent(TEST_MODE_CHANGED_EVENT, { detail: { isTestMode: active } })
    );
  } catch {}
}
