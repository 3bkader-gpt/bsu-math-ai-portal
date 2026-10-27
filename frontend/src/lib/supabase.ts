/**
 * Direct High-Speed Supabase Client for BSU Mathematics Portal.
 * Enables ultra-fast edge loading (<100ms) with zero dependency on the local machine
 * for all catalog queries, lecture listings, quizzes, guides, and flashcards.
 */

export const SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_iukVp-1coXRxhHD3T_pqoQ_k2g1PnN5';

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: 'application/json',
};

import { 
  AcademicSubject, 
  AcademicLecture, 
  AcademicMediaAsset, 
  AcademicLectureBundle 
} from '@/types/academic';

export interface SupabaseSubject extends AcademicSubject {
  doctors: string[];
}

export interface SupabaseLectureItem extends AcademicLecture {
  doctor: string | null;
  stage_info: string | null;
  assets_count: number;
  study_resources_count: number;
  has_audio: boolean;
  has_video: boolean;
  has_quiz: boolean;
  has_guide: boolean;
  has_flashcards: boolean;
  is_ready: boolean;
}

export type SupabaseMediaAsset = AcademicMediaAsset;
export type SupabaseLectureBundle = AcademicLectureBundle;

export const OFFICIAL_SUBJECT_DOCTORS: Record<string, string[]> = {
  'هندسه تفاضلية': ['د/ سيد'],
  'هندسة تفاضلية': ['د/ سيد'],
  'عملي فيزياء': ['د/ سيد'],
  'نظريه عدد ومنطق': ['د/ محمد حسين'],
  'مقدمة في نظرية العدد والمنطق': ['د/ محمد حسين'],
  'تدريس مصغر': ['د/ عبدالرحمن برعي'],
  'معادلات تفاضلية': ['د/ حسين'],
  'فلسفه وتاريخ رياضيات': ['د/ طه ابراهيم'],
  'فلسفة وتاريخ الرياضيات': ['د/ طه ابراهيم'],
  'ديناميكا 2': ['د/ مروة ذكري'],
  'ديناميكا (٢)': ['د/ مروة ذكري'],
  'اداره معرفه': ['د/ عزام'],
  'إدارة المعرفة': ['د/ عزام'],
  'تكنولوجيا والتحول الرقمي': ['د/ ايمان', 'د/ ايه'],
  'تكنولوجيا التعليم': ['د/ ايمان', 'د/ ايه'],
  'تعليم ورياده اعمال': ['د/ مروة', 'د/ وليد'],
  'التعليم وريادة الأعمال': ['د/ مروة', 'د/ وليد'],
  'استاتيكا2': ['د/ ايه'],
  'استاتيكا (٢)': ['د/ ايه'],
  'كهربيه مغناطيسية وتيار متردد': ['د/ حسن سيد'],
  'كهربية ومغناطيسية وتيار متردد': ['د/ حسن سيد'],
};

/**
 * Fetches all academic subjects directly from Supabase edge CDN.
 */
export async function getDirectSupabaseSubjects(): Promise<SupabaseSubject[]> {
  const fetchSub = async () => {
    let subRes = await fetch(`${SUPABASE_URL}/rest/v1/subjects?select=id,name,prompt_path,semester`, { headers: HEADERS });
    if (!subRes.ok && subRes.status === 400) {
      subRes = await fetch(`${SUPABASE_URL}/rest/v1/subjects?select=id,name,prompt_path`, { headers: HEADERS });
    }
    if (!subRes.ok) throw new Error(`Supabase subjects error: ${subRes.statusText}`);
    return subRes.json();
  };

  const fetchLec = async () => {
    try {
      const lecRes = await fetch(`${SUPABASE_URL}/rest/v1/lectures?select=id,subject_id,doctor,status`, { headers: HEADERS });
      return lecRes.ok ? await lecRes.json() : [];
    } catch {
      return [];
    }
  };

  const [subjects, lectures] = await Promise.all([fetchSub(), fetchLec()]);

  const validSubjects = (subjects as any[]).filter(
    (s) => s.name && s.name.trim() !== 'كتب كامله' && !['BOT', 'subjects'].includes(s.name.trim())
  );

  return validSubjects.map((s: any) => {
    const subLecs = (lectures as any[]).filter((l: any) => l.subject_id === s.id);
    const officialDocs = OFFICIAL_SUBJECT_DOCTORS[s.name] || [];
    const docs = officialDocs.length > 0 
      ? officialDocs 
      : (Array.from(new Set(subLecs.map((l: any) => l.doctor).filter(Boolean))) as string[]);

    const sem = (typeof s.semester === 'number' && (s.semester === 1 || s.semester === 2)) ? s.semester : 1;

    return {
      id: s.id,
      name: s.name,
      semester: sem,
      has_prompt: Boolean(s.prompt_path),
      lecture_count: subLecs.length,
      doctors: docs,
    };
  });
}

/**
 * Fetches lectures for a given subject directly from Supabase edge CDN.
 */
export async function getDirectSupabaseLectures(
  subjectId: number,
  doctor?: string
): Promise<SupabaseLectureItem[]> {
  let url = `${SUPABASE_URL}/rest/v1/lectures?subject_id=eq.${subjectId}&select=id,lecture_num,title,doctor,status,stage_info,created_at,media_assets(id,asset_type)&order=lecture_num.asc`;
  if (doctor && doctor !== 'الكل' && doctor.trim()) {
    url += `&doctor=eq.${encodeURIComponent(doctor.trim())}`;
  }

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Supabase lectures error: ${res.statusText}`);
  const data = await res.json();

  return data.map((l: any) => {
    const rawAssets: any[] = l.media_assets || [];
    const hasAudio = rawAssets.some((a) => a.asset_type === 'audio');
    const hasVideo = rawAssets.some((a) => a.asset_type === 'video');
    const hasQuiz = rawAssets.some((a) => a.asset_type === 'quiz_md');
    const hasGuide = rawAssets.some((a) => a.asset_type === 'study_guide_md');
    const hasFlashcards = rawAssets.some(
      (a) => a.asset_type === 'flashcards_md' || a.asset_type === 'flashcards_json'
    );

    let studyCount = 0;
    if (hasAudio) studyCount++;
    if (hasVideo) studyCount++;
    if (hasQuiz) studyCount++;
    if (hasGuide) studyCount++;
    if (hasFlashcards) studyCount++;

    // A lecture is truly ready for studying if core modalities are generated (not just raw PDF)
    const isReady = (hasAudio || hasQuiz || hasGuide) && l.status === 'completed';

    return {
      id: l.id,
      lecture_num: l.lecture_num,
      title: l.title,
      doctor: l.doctor,
      status: l.status,
      stage_info: l.stage_info,
      created_at: l.created_at,
      assets_count: studyCount,
      study_resources_count: studyCount,
      has_audio: hasAudio,
      has_video: hasVideo,
      has_quiz: hasQuiz,
      has_guide: hasGuide,
      has_flashcards: hasFlashcards,
      is_ready: isReady,
    };
  });
}

/**
 * Fetches full lecture details with all media assets directly from Supabase edge CDN.
 */
export async function getDirectSupabaseBundle(
  lectureId: number,
  fallbackBaseUrl: string
): Promise<SupabaseLectureBundle> {
  const url = `${SUPABASE_URL}/rest/v1/lectures?id=eq.${lectureId}&select=id,subject_id,lecture_num,title,doctor,status,stage_info,error_message,created_at,media_assets(*)`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Supabase bundle error: ${res.statusText}`);
  const list = await res.json();
  if (!list || list.length === 0) throw new Error('Lecture not found in Supabase');

  const l = list[0];
  const assets: SupabaseMediaAsset[] = (l.media_assets || []).map((a: any) => {
    const isDirectUrl = Boolean(
      a.local_file_path &&
      (a.local_file_path.startsWith('http://') || a.local_file_path.startsWith('https://'))
    );
    const hasTg = Boolean(a.telegram_file_id || a.telegram_message_id || isDirectUrl);
    return {
      id: a.id,
      asset_type: a.asset_type,
      title: a.title,
      file_size_bytes: a.file_size_bytes,
      has_telegram: hasTg,
      telegram_file_id: a.telegram_file_id,
      telegram_message_id: a.telegram_message_id || null,
      content_text: a.content_text || null,
      stream_url: isDirectUrl ? a.local_file_path : `${fallbackBaseUrl}/api/stream/${a.id}`,
      is_available: hasTg,
    };
  });

  await reconcileAssetAvailability(assets, lectureId, fallbackBaseUrl);

  return {
    id: l.id,
    subject_id: l.subject_id,
    lecture_num: l.lecture_num,
    title: l.title,
    doctor: l.doctor,
    status: l.status,
    stage_info: l.stage_info,
    error_message: l.error_message,
    assets,
    created_at: l.created_at,
  };
}

/**
 * Reconciles local non-Telegram assets with backend server-side verification.
 */
export async function reconcileAssetAvailability(
  assets: SupabaseMediaAsset[],
  lectureId: number,
  backendBaseUrl: string
): Promise<void> {
  const hasUnverifiedPdf = assets.some(
    (a) => !a.has_telegram && (a.asset_type === 'original_pdf' || a.asset_type === 'pdf')
  );
  if (!hasUnverifiedPdf || !backendBaseUrl) return;

  try {
    const cleanBase = backendBaseUrl.replace(/\/+$/, '');
    const backendRes = await fetch(`${cleanBase}/api/lectures/${lectureId}`);
    if (backendRes.ok) {
      const backendData = await backendRes.json();
      const backendMap = new Map<number, boolean>();
      for (const ba of backendData.assets || []) {
        if (typeof ba.is_available === 'boolean') {
          backendMap.set(ba.id, ba.is_available);
        }
      }
      for (const a of assets) {
        if (backendMap.has(a.id)) {
          a.is_available = backendMap.get(a.id)!;
        }
      }
    }
  } catch {
    // Backend unreachable: non-Telegram local files remain unavailable
  }
}
