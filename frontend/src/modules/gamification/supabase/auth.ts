import { supabase } from './client';
import { ProfileRow } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://bsu-math-api.onrender.com';

const DEVICE_ID_KEY = 'bsu_portal_device_id';
const GUEST_CREDENTIALS_KEY = 'bsu_portal_guest_auth';

export interface StudentSession {
  userId: string;
  email: string;
  profile: ProfileRow | null;
  isGuest: boolean;
}

/**
 * Returns a persistent device ID unique to this browser instance.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr-device';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'dev_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Fetches the student profile for a given user ID.
 */
export async function getStudentProfile(
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as ProfileRow;
}

/**
 * Guarantees an authenticated Supabase user session from the first millisecond.
 * If no session exists, silently provisions a confirmed guest user via backend API
 * and signs into Supabase Auth.
 */
export async function getOrCreateAnonymousSession(): Promise<StudentSession> {
  if (typeof window === 'undefined') {
    return {
      userId: 'ssr-user',
      email: 'ssr@bsu-math.internal',
      profile: null,
      isGuest: true,
    };
  }

  // 1. Check existing active Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const profile = await getStudentProfile(session.user.id);
    return {
      userId: session.user.id,
      email: session.user.email || '',
      profile,
      isGuest: true,
    };
  }

  // 2. Check stored guest credentials
  const storedCredsJson = localStorage.getItem(GUEST_CREDENTIALS_KEY);
  if (storedCredsJson) {
    try {
      const creds = JSON.parse(storedCredsJson);
      const { data: loginData, error: loginErr } =
        await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });

      if (!loginErr && loginData.user) {
        const profile = await getStudentProfile(loginData.user.id);
        return {
          userId: loginData.user.id,
          email: loginData.user.email || '',
          profile,
          isGuest: true,
        };
      }
    } catch {
      localStorage.removeItem(GUEST_CREDENTIALS_KEY);
    }
  }

  // 3. Provision new guest account via Render API
  const deviceId = getOrCreateDeviceId();
  const persona =
    (localStorage.getItem('bsu_portal_persona') as 'boys' | 'girls') || 'boys';

  const res = await fetch(`${API_BASE}/api/auth/anonymous-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      nickname: 'عاشق الرياضيات',
      persona,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to provision anonymous session: ${res.statusText}`);
  }

  const { email, password, user_id } = await res.json();
  localStorage.setItem(
    GUEST_CREDENTIALS_KEY,
    JSON.stringify({ email, password, user_id })
  );

  // 4. Sign into Supabase with the confirmed credentials
  const { data: authData, error: authErr } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authErr || !authData.user) {
    throw new Error(
      `Failed to sign in with guest credentials: ${authErr?.message}`
    );
  }

  const profile = await getStudentProfile(authData.user.id);
  return {
    userId: authData.user.id,
    email,
    profile,
    isGuest: true,
  };
}

/**
 * Updates the student's nickname and persona in Supabase profiles.
 */
export async function updateStudentProfile(params: {
  nickname?: string;
  persona?: 'boys' | 'girls';
}): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (params.nickname) updates.nickname = params.nickname.trim();
  if (params.persona) updates.persona = params.persona;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  return !error;
}
