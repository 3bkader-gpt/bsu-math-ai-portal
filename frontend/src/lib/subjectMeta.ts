/**
 * Shared Curriculum & Subject Metadata Registry (Single Source of Truth)
 *
 * Centralizes canonical BSU course definitions, doctor mappings, visual themes,
 * and dynamic backend/database merging logic (`mergeSubjects`) so adding new
 * semesters or cohorts requires zero duplicated hardcoded dictionaries.
 */

import { AcademicSubject, CanonicalCourse } from '@/types/academic';

export interface SubjectStyleConfig {
  charm: string;
  badgeTag: string;
  darkBadge: string;
  lightBadge: string;
  glowColor: string;
  boysCharm: string;
  boysBadgeTag: string;
  boysDarkBadge: string;
  boysLightBadge: string;
  boysGlowColor: string;
}

export const CANONICAL_COURSES: CanonicalCourse[] = [
  {
    canonicalName: 'هندسة تفاضلية',
    doctor: 'د/ سيد',
    icon: '📐',
    aliases: ['هندسه تفاضلية', 'هندسة تفاضلية', 'تفاضلية'],
    fallbackId: 11,
  },
  {
    canonicalName: 'مقدمة في نظرية العدد والمنطق',
    doctor: 'د/ محمد حسين',
    icon: '🔢',
    aliases: ['نظريه عدد ومنطق', 'نظرية العدد والمنطق', 'عدد ومنطق', 'مقدمة في نظرية العدد والمنطق'],
    fallbackId: 10,
  },
  {
    canonicalName: 'معادلات تفاضلية',
    doctor: 'د/ حسين',
    icon: '∫',
    aliases: ['معادلات تفاضلية', 'معادلات'],
    fallbackId: 9,
  },
  {
    canonicalName: 'ديناميكا (٢)',
    doctor: 'د/ مروة ذكري',
    icon: '🚀',
    aliases: ['ديناميكا 2', 'ديناميكا (٢)', 'ديناميكا'],
    fallbackId: 6,
  },
  {
    canonicalName: 'استاتيكا (٢)',
    doctor: 'د/ ايه',
    icon: '⚖️',
    aliases: ['استاتيكا2', 'استاتيكا (٢)', 'استاتيكا'],
    fallbackId: 2,
  },
  {
    canonicalName: 'كهربية ومغناطيسية وتيار متردد',
    doctor: 'د/ حسن سيد',
    icon: '🧲',
    aliases: ['كهربيه مغناطيسية وتيار متردد', 'كهربية ومغناطيسية', 'كهربيه'],
    fallbackId: 8,
  },
  {
    canonicalName: 'عملي فيزياء',
    doctor: 'د/ سيد',
    icon: '🔬',
    aliases: ['عملي فيزياء', 'فيزياء عملي'],
    fallbackId: 101,
  },
  {
    canonicalName: 'التعليم وريادة الأعمال',
    doctor: 'د/ مروة + د/ وليد',
    icon: '💼',
    aliases: ['تعليم ورياده اعمال', 'التعليم وريادة الأعمال', 'ريادة أعمال'],
    fallbackId: 4,
  },
  {
    canonicalName: 'تدريس مصغر',
    doctor: 'د/ عبدالرحمن برعي',
    icon: '🎓',
    aliases: ['تدريس مصغر'],
    fallbackId: 3,
  },
  {
    canonicalName: 'تكنولوجيا التعليم',
    doctor: 'د/ ايمان + د/ ايه',
    icon: '💻',
    aliases: ['تكنولوجيا والتحول الرقمي', 'تكنولوجيا التعليم', 'تكنولوجيا'],
    fallbackId: 5,
  },
  {
    canonicalName: 'إدارة المعرفة',
    doctor: 'د/ عزام',
    icon: '📚',
    aliases: ['اداره معرفه', 'إدارة المعرفة'],
    fallbackId: 1,
  },
  {
    canonicalName: 'فلسفة وتاريخ الرياضيات',
    doctor: 'د/ طه ابراهيم',
    icon: '🏛️',
    aliases: ['فلسفه وتاريخ رياضيات', 'فلسفة وتاريخ الرياضيات', 'فلسفة'],
    fallbackId: 7,
  },
];

/**
 * Derived automatically from `CANONICAL_COURSES` so `supabase.ts` and other
 * modules do not maintain a second copy of doctor lists.
 */
export const OFFICIAL_SUBJECT_DOCTORS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const course of CANONICAL_COURSES) {
    const docs = course.doctor
      .split('+')
      .map((d) => d.trim())
      .filter(Boolean);
    map[course.canonicalName] = docs;
    for (const alias of course.aliases) {
      map[alias] = docs;
    }
  }
  return map;
})();

export const SUBJECT_THEME_STYLES: Record<string, SubjectStyleConfig> = {
  'هندسة تفاضلية': {
    charm: '🎀',
    badgeTag: 'منحنيات وفضاء 🎀',
    darkBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/60',
    lightBadge: 'bg-rose-100 text-rose-700 border-rose-200',
    glowColor: '#FB7185',
    boysCharm: '',
    boysBadgeTag: 'منحنيات وفضاء',
    boysDarkBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/60',
    boysLightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    boysGlowColor: '#06B6D4',
  },
  'مقدمة في نظرية العدد والمنطق': {
    charm: '🌸',
    badgeTag: 'أعداد ومنطق 🌸',
    darkBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/60',
    lightBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    glowColor: '#F59E0B',
    boysCharm: '',
    boysBadgeTag: 'أعداد ومنطق',
    boysDarkBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-950/60',
    boysLightBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    boysGlowColor: '#6366F1',
  },
  'معادلات تفاضلية': {
    charm: '✨',
    badgeTag: 'معادلات وتفاضل ✨',
    darkBadge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm shadow-fuchsia-950/60',
    lightBadge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    glowColor: '#D946EF',
    boysCharm: '',
    boysBadgeTag: 'معادلات وتفاضل',
    boysDarkBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/60',
    boysLightBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    boysGlowColor: '#F59E0B',
  },
  'ديناميكا (٢)': {
    charm: '🍓',
    badgeTag: 'حركة وطاقة 🍓',
    darkBadge: 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm shadow-pink-950/60',
    lightBadge: 'bg-pink-100 text-pink-700 border-pink-200',
    glowColor: '#F43F5E',
    boysCharm: '',
    boysBadgeTag: 'سرعة وتسارع',
    boysDarkBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-950/60',
    boysLightBadge: 'bg-blue-100 text-blue-800 border-blue-200',
    boysGlowColor: '#3B82F6',
  },
  'استاتيكا (٢)': {
    charm: '🌷',
    badgeTag: 'اتزان وقوى 🌷',
    darkBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-950/60',
    lightBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    glowColor: '#A855F7',
    boysCharm: '',
    boysBadgeTag: 'اتزان وقوى',
    boysDarkBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/60',
    boysLightBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    boysGlowColor: '#10B981',
  },
  'كهربية ومغناطيسية وتيار متردد': {
    charm: '💖',
    badgeTag: 'دوائر وتيار 💖',
    darkBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/60',
    lightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    glowColor: '#06B6D4',
    boysCharm: '',
    boysBadgeTag: 'تيار ومجالات',
    boysDarkBadge: 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-950/60',
    boysLightBadge: 'bg-teal-100 text-teal-800 border-teal-200',
    boysGlowColor: '#14B8A6',
  },
  'عملي فيزياء': {
    charm: '🪞',
    badgeTag: 'معمل وتجارب 🪞',
    darkBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/60',
    lightBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    glowColor: '#10B981',
    boysCharm: '',
    boysBadgeTag: 'معمل وتجارب',
    boysDarkBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-950/60',
    boysLightBadge: 'bg-sky-100 text-sky-800 border-sky-200',
    boysGlowColor: '#0EA5E9',
  },
  'التعليم وريادة الأعمال': {
    charm: '🧸',
    badgeTag: 'بيزنس ومشاريع 🧸',
    darkBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-950/60',
    lightBadge: 'bg-orange-100 text-orange-800 border-orange-200',
    glowColor: '#F97316',
    boysCharm: '',
    boysBadgeTag: 'بيزنس ومشاريع',
    boysDarkBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-950/60',
    boysLightBadge: 'bg-orange-100 text-orange-800 border-orange-200',
    boysGlowColor: '#F97316',
  },
  'تدريس مصغر': {
    charm: '🍰',
    badgeTag: 'شرح ومهارات 🍰',
    darkBadge: 'bg-rose-400/20 text-rose-300 border-rose-400/40 shadow-sm shadow-rose-950/60',
    lightBadge: 'bg-rose-50 text-rose-600 border-rose-200',
    glowColor: '#EC4899',
    boysCharm: '',
    boysBadgeTag: 'شرح وتدريب',
    boysDarkBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/60',
    boysLightBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    boysGlowColor: '#F43F5E',
  },
  'تكنولوجيا التعليم': {
    charm: '🌸',
    badgeTag: 'ديجيتال وتطوير 🌸',
    darkBadge: 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-950/60',
    lightBadge: 'bg-violet-100 text-violet-800 border-violet-200',
    glowColor: '#6366F1',
    boysCharm: '',
    boysBadgeTag: 'ذكاء وتطوير',
    boysDarkBadge: 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-950/60',
    boysLightBadge: 'bg-violet-100 text-violet-800 border-violet-200',
    boysGlowColor: '#8B5CF6',
  },
  'إدارة المعرفة': {
    charm: '☕',
    badgeTag: 'تنظيم ونوتس ☕',
    darkBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm shadow-yellow-950/60',
    lightBadge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    glowColor: '#EAB308',
    boysCharm: '',
    boysBadgeTag: 'تنظيم ومعرفة',
    boysDarkBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm shadow-yellow-950/60',
    boysLightBadge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    boysGlowColor: '#EAB308',
  },
  'فلسفة وتاريخ الرياضيات': {
    charm: '✨',
    badgeTag: 'علماء وتاريخ ✨',
    darkBadge: 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-950/60',
    lightBadge: 'bg-teal-100 text-teal-800 border-teal-200',
    glowColor: '#14B8A6',
    boysCharm: '',
    boysBadgeTag: 'فلسفة وعلماء',
    boysDarkBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-950/60',
    boysLightBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    boysGlowColor: '#A855F7',
  },
};

export function getDoctorTrackDetails(subjectName: string = '', docName: string = '') {
  const isTech = subjectName.includes('تكنولوجيا') || subjectName.includes('التحول الرقمي');
  const isEdu = subjectName.includes('تعليم') || subjectName.includes('رياد');

  if (isTech) {
    if (docName.includes('ايمان')) {
      return {
        label: 'المحاضرات النظرية',
        subtext: 'د/ إيمان',
        icon: '📖',
        badge: 'نظري',
      };
    }
    if (docName.includes('ايه')) {
      return {
        label: 'السكاشن العملية',
        subtext: 'د/ آية',
        icon: '💻',
        badge: 'عملي',
      };
    }
  }

  if (isEdu) {
    if (docName.includes('مروة')) {
      return {
        label: 'التربية المعاصرة',
        subtext: 'د/ مروة',
        icon: '👩‍🏫',
        badge: 'تربية',
      };
    }
    if (docName.includes('وليد')) {
      return {
        label: 'ريادة الأعمال',
        subtext: 'د/ وليد',
        icon: '💼',
        badge: 'مشروعات',
      };
    }
  }

  return {
    label: docName,
    subtext: docName,
    icon: (docName.includes('مروة') || docName.includes('ايه') || docName.includes('ايمان')) ? '👩‍🏫' : '👨‍🏫',
    badge: null,
  };
}

/**
 * Merges dynamic database subjects with the canonical registry, preserving
 * custom DB icons, themes, doctors, semester, and year_level while dynamically
 * appending new courses added for Semester 2 or future cohorts.
 */
export const mergeSubjects = (backendSubjects: any[]): AcademicSubject[] => {
  const rawBackendList = Array.isArray(backendSubjects) ? backendSubjects : [];
  const matchedBackendIds = new Set<number>();
  const matchedBackendNames = new Set<string>();
  const assignedSubjectIds = new Set<number>();
  const assignedSubjectNames = new Set<string>();

  const canonicalList: AcademicSubject[] = CANONICAL_COURSES.map((course) => {
    const found = rawBackendList.find((b) => {
      if (!b) return false;
      if (typeof b.id === 'number' && b.id === course.fallbackId) return true;
      const bName = (b.name || '').trim().toLowerCase();
      if (!bName) return false;
      return (
        course.canonicalName.trim().toLowerCase() === bName ||
        course.aliases.some((a) => a.trim().toLowerCase() === bName)
      );
    });

    if (found) {
      if (typeof found.id === 'number') matchedBackendIds.add(found.id);
      if (found.name) matchedBackendNames.add(found.name.trim().toLowerCase());
    }

    const resolvedId = typeof found?.id === 'number' ? found.id : course.fallbackId;
    assignedSubjectIds.add(resolvedId);
    assignedSubjectNames.add(course.canonicalName.trim().toLowerCase());

    const doctorsList = found?.doctors && Array.isArray(found.doctors) && found.doctors.length > 0
      ? found.doctors
      : (course.doctor.includes('+') ? course.doctor.split('+').map((d: string) => d.trim()) : [course.doctor]);

    const sem = (typeof found?.semester === 'number' && (found.semester === 1 || found.semester === 2))
      ? found.semester
      : (course.semester ?? 1);

    return {
      id: resolvedId,
      name: course.canonicalName,
      semester: sem,
      year_level: typeof found?.year_level === 'number' ? found.year_level : 2,
      has_prompt: found?.has_prompt ?? true,
      lecture_count: typeof found?.lecture_count === 'number' ? found.lecture_count : 0,
      doctors: doctorsList,
      canonicalDoctor: course.doctor,
      icon: (typeof found?.icon === 'string' && found.icon.trim()) ? found.icon.trim() : course.icon,
      theme_config: (found?.theme_config && typeof found.theme_config === 'object') ? found.theme_config : undefined,
    };
  });

  const dynamicSubjects: AcademicSubject[] = [];
  for (const b of rawBackendList) {
    if (!b || typeof b !== 'object') continue;
    const rawName = typeof b.name === 'string' ? b.name.trim() : '';
    if (!rawName) continue;

    if (['كتب كامله', 'BOT', 'subjects'].includes(rawName) || rawName.startsWith('.')) {
      continue;
    }

    const normalizedName = rawName.toLowerCase();
    const isAlreadyMatchedById = typeof b.id === 'number' && (matchedBackendIds.has(b.id) || assignedSubjectIds.has(b.id));
    const isAlreadyMatchedByName = matchedBackendNames.has(normalizedName) || assignedSubjectNames.has(normalizedName);
    const matchesAnyCanonical = CANONICAL_COURSES.some((c) =>
      c.canonicalName.trim().toLowerCase() === normalizedName ||
      c.aliases.some((a) => a.trim().toLowerCase() === normalizedName) ||
      (typeof b.id === 'number' && c.fallbackId === b.id)
    );

    if (isAlreadyMatchedById || isAlreadyMatchedByName || matchesAnyCanonical) {
      continue;
    }

    const newSubjectId = typeof b.id === 'number' ? b.id : 1000 + dynamicSubjects.length;
    if (assignedSubjectIds.has(newSubjectId)) {
      continue;
    }
    assignedSubjectIds.add(newSubjectId);
    assignedSubjectNames.add(normalizedName);

    const cleanDoctors = Array.isArray(b.doctors)
      ? b.doctors.map((d: any) => (typeof d === 'string' ? d.trim() : '')).filter(Boolean)
      : [];
    const canonicalDoc = cleanDoctors.length > 0 ? cleanDoctors.join(' + ') : undefined;

    const rawSem = typeof b.semester === 'number' ? b.semester : 1;
    const validSem = (rawSem === 2) ? 2 : 1;

    dynamicSubjects.push({
      id: newSubjectId,
      name: rawName,
      semester: validSem,
      year_level: typeof b.year_level === 'number' ? b.year_level : 2,
      has_prompt: Boolean(b.has_prompt),
      lecture_count: typeof b.lecture_count === 'number' ? b.lecture_count : 0,
      doctors: cleanDoctors,
      canonicalDoctor: canonicalDoc,
      icon: (typeof b.icon === 'string' && b.icon.trim()) ? b.icon.trim() : '📚',
      theme_config: (b.theme_config && typeof b.theme_config === 'object') ? b.theme_config : undefined,
    });
  }

  return [...canonicalList, ...dynamicSubjects];
};
