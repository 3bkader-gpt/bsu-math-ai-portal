/**
 * Direct High-Speed Supabase Client for BSU Mathematics Portal.
 * Enables ultra-fast edge loading (<100ms) with zero dependency on the local machine
 * for all catalog queries, lecture listings, quizzes, guides, and flashcards.
 */

export const SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjUyMDIsImV4cCI6MjEwNzQwMTIwMn0.NipIyq1IfvcjXiI9iL4KjIq-B-OK60AI0guQZz5PB8k';

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: 'application/json',
};

export interface SupabaseSubject {
  id: number;
  name: string;
  has_prompt: boolean;
  lecture_count: number;
  doctors: string[];
}

export interface SupabaseLectureItem {
  id: number;
  lecture_num: number;
  title: string;
  doctor: string | null;
  status: string;
  stage_info: string | null;
  created_at: string;
  assets_count: number;
  study_resources_count: number;
  has_audio: boolean;
  has_video: boolean;
  has_quiz: boolean;
  has_guide: boolean;
  has_flashcards: boolean;
  is_ready: boolean;
}

export interface SupabaseMediaAsset {
  id: number;
  asset_type: string;
  title: string;
  file_size_bytes: number | null;
  has_telegram: boolean;
  telegram_file_id: string | null;
  content_text: string | null;
  stream_url: string;
}

export interface SupabaseLectureBundle {
  id: number;
  subject_id: number;
  subject_name?: string;
  lecture_num: number;
  title: string;
  doctor: string | null;
  status: string;
  stage_info: string | null;
  error_message: string | null;
  assets: SupabaseMediaAsset[];
  created_at: string;
}

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
  'تكنولوجيا والتحول الرقمي': ['د/ ايمان'],
  'تكنولوجيا التعليم': ['د/ ايمان'],
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
  const [subRes, lecRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/subjects?select=id,name,prompt_path`, { headers: HEADERS }),
    fetch(`${SUPABASE_URL}/rest/v1/lectures?select=id,subject_id,doctor,status`, { headers: HEADERS }),
  ]);

  if (!subRes.ok) throw new Error(`Supabase subjects error: ${subRes.statusText}`);
  const subjects = await subRes.json();
  const lectures = lecRes.ok ? await lecRes.json() : [];

  const validSubjects = (subjects as any[]).filter(
    (s) => s.name && s.name.trim() !== 'كتب كامله' && !['BOT', 'subjects'].includes(s.name.trim())
  );

  return validSubjects.map((s: any) => {
    const subLecs = lectures.filter((l: any) => l.subject_id === s.id);
    const officialDocs = OFFICIAL_SUBJECT_DOCTORS[s.name] || [];
    const docs = officialDocs.length > 0 
      ? officialDocs 
      : (Array.from(new Set(subLecs.map((l: any) => l.doctor).filter(Boolean))) as string[]);

    return {
      id: s.id,
      name: s.name,
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
  const assets: SupabaseMediaAsset[] = (l.media_assets || []).map((a: any) => ({
    id: a.id,
    asset_type: a.asset_type,
    title: a.title,
    file_size_bytes: a.file_size_bytes,
    has_telegram: Boolean(a.telegram_file_id),
    telegram_file_id: a.telegram_file_id,
    content_text: a.content_text || null,
    stream_url: `${fallbackBaseUrl}/api/stream/${a.id}`,
  }));

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
