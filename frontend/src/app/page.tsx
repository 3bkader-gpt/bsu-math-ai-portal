'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { StudentGamificationPill } from '@/components/gamification/StudentGamificationPill';
import NotificationBell from '@/components/NotificationBell';
import content from '@/data/content.json';
import { 
  Sparkles, 
  BookOpen, 
  Headphones, 
  Video, 
  HelpCircle, 
  FileText, 
  Layers, 
  Play, 
  Search, 
  GraduationCap, 
  Clock,
  ChevronLeft,
  Lock,
  Menu
} from 'lucide-react';
import MobileNavDrawer from '@/components/MobileNavDrawer';
import StaplePin3D from '@/components/StaplePin3D';
import DeveloperCreditsModal from '@/components/DeveloperCreditsModal';
import DeveloperCreditsPill from '@/components/DeveloperCreditsPill';
import WelcomeStudentModal from '@/components/WelcomeStudentModal';
import CohortHurdlesModal from '@/components/CohortHurdlesModal';
import CustomExamBuilderModal from '@/components/CustomExamBuilderModal';
import FormulaSheetModal from '@/components/FormulaSheetModal';
import RecoveryPlannerModal from '@/components/RecoveryPlannerModal';
import FocusAmbienceModal from '@/components/FocusAmbienceModal';
import MathScratchpadModal from '@/components/MathScratchpadModal';
import StudentBinderModal from '@/components/StudentBinderModal';
import { 
  getStudentProfileLocal, 
  shouldPromptOnboarding, 
  PROFILE_UPDATED_EVENT,
  isTestModeActive,
  TEST_MODE_CHANGED_EVENT
} from '@/lib/studentProfile';
import { getApiUrl } from '@/lib/api';
import { 
  getDirectSupabaseSubjects, 
  getDirectSupabaseLectures 
} from '@/lib/supabase';
import { 
  AcademicSubject, 
  CanonicalCourse 
} from '@/types/academic';
import {
  SmartResumeCard,
  QuickMicroSessionModal,
  EthicalWrapUpModal,
  MistakeNotebookModal,
  CohortChallengeWidget,
} from '@/modules/gamification/ui';
import { useSmartHeaderVisibility } from '@/lib/useSmartHeaderVisibility';
import { trackSessionStarted } from '@/modules/telemetry';

type Subject = AcademicSubject;

const CANONICAL_COURSES: CanonicalCourse[] = [
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



interface Lecture {
  id: number;
  lecture_num: number;
  title: string;
  doctor?: string | null;
  status: string;
  stage_info?: string | null;
  created_at: string;
  assets_count: number;
  study_resources_count?: number;
  has_audio?: boolean;
  has_video?: boolean;
  has_quiz?: boolean;
  has_guide?: boolean;
  has_flashcards?: boolean;
  is_ready?: boolean;
}



function getDoctorTrackDetails(subjectName: string = '', docName: string = '') {
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

// Build Unified Courses from Backend + Canonical Registry (Dynamic Semester 1 & 2 Extensibility)
const mergeSubjects = (backendSubjects: any[]): Subject[] => {
  const rawBackendList = Array.isArray(backendSubjects) ? backendSubjects : [];
  const matchedBackendIds = new Set<number>();
  const matchedBackendNames = new Set<string>();
  const assignedSubjectIds = new Set<number>();
  const assignedSubjectNames = new Set<string>();

  // 1. Process Canonical Courses (Preserve rich canonical metadata & order)
  const canonicalList: Subject[] = CANONICAL_COURSES.map((course) => {
    // Match by stable fallbackId or canonical aliases / name
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
      has_prompt: found?.has_prompt ?? true,
      lecture_count: typeof found?.lecture_count === 'number' ? found.lecture_count : 0,
      doctors: doctorsList,
      canonicalDoctor: course.doctor,
      icon: course.icon,
    };
  });

  // 2. Dynamically Append Genuinely New Subjects (e.g., Semester 2 or custom courses)
  const dynamicSubjects: Subject[] = [];
  for (const b of rawBackendList) {
    if (!b || typeof b !== 'object') continue;
    const rawName = typeof b.name === 'string' ? b.name.trim() : '';
    if (!rawName) continue;

    // Filter out internal system or utility folders
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

    // Ensure stable unique ID
    const newSubjectId = typeof b.id === 'number' ? b.id : 1000 + dynamicSubjects.length;
    if (assignedSubjectIds.has(newSubjectId)) {
      continue;
    }
    assignedSubjectIds.add(newSubjectId);
    assignedSubjectNames.add(normalizedName);

    // Extract doctors safely without inventing placeholder instructor data
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
      has_prompt: Boolean(b.has_prompt),
      lecture_count: typeof b.lecture_count === 'number' ? b.lecture_count : 0,
      doctors: cleanDoctors,
      canonicalDoctor: canonicalDoc,
      icon: '📚',
    });
  }

  return [...canonicalList, ...dynamicSubjects];
};

export default function Home() {
  const [currentPersona, setCurrentPersona] = useState<'boys' | 'girls'>('boys');
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    try {
      const p = (localStorage.getItem('bsu_portal_persona') as 'boys' | 'girls') || 'boys';
      const m = (localStorage.getItem('bsu_portal_mode') as 'light' | 'dark') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setCurrentPersona(p);
      setCurrentMode(m);
      setIsTestMode(isTestModeActive());
    } catch {}

    const handleThemeChange = (e: any) => {
      if (e.detail?.persona) setCurrentPersona(e.detail.persona);
      if (e.detail?.mode) setCurrentMode(e.detail.mode);
    };

    const handleTestModeChange = (e: any) => {
      if (e.detail?.isTestMode !== undefined) setIsTestMode(e.detail.isTestMode);
      else setIsTestMode(isTestModeActive());
    };

    window.addEventListener('bsu_theme_changed', handleThemeChange);
    window.addEventListener(TEST_MODE_CHANGED_EVENT, handleTestModeChange);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleTestModeChange);
    return () => {
      window.removeEventListener('bsu_theme_changed', handleThemeChange);
      window.removeEventListener(TEST_MODE_CHANGED_EVENT, handleTestModeChange);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleTestModeChange);
    };
  }, []);

  const isGirls = currentPersona === 'girls';
  const isDark = currentMode === 'dark';

  const router = useRouter();

  // Instant 0ms hydration: load from cache or canonical courses immediately
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('bsu_cached_subjects');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return mergeSubjects([]);
  });

  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  // Default active subject: Differential Geometry (id 11) with instant active state
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bsu_active_subject_id');
        if (saved && !isNaN(parseInt(saved))) return parseInt(saved);
      } catch {}
    }
    return 11;
  });

  const [selectedDoctor, setSelectedDoctor] = useState<string>('الكل');

  // Instant 0ms hydration for lectures: pre-populate Differential Geometry Lecture 1 so it appears with zero lag
  const [subjectLectures, setSubjectLectures] = useState<Lecture[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('bsu_cached_lectures_11');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: 1,
        lecture_num: 1,
        title: 'المحاضرة 1: مفهوم المنحنى وطول القوس ومماس الوحدة',
        doctor: 'د/ سيد',
        status: 'completed',
        stage_info: null,
        created_at: '2026-10-15T00:00:00Z',
        assets_count: 5,
        study_resources_count: 5,
        has_audio: true,
        has_video: false,
        has_quiz: true,
        has_guide: true,
        has_flashcards: true,
        is_ready: true,
      }
    ];
  });

  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMicroSessionOpen, setIsMicroSessionOpen] = useState(false);
  const [isWrapUpOpen, setIsWrapUpOpen] = useState(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDevCreditsOpen, setIsDevCreditsOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isHurdlesModalOpen, setIsHurdlesModalOpen] = useState(false);
  const [isExamBuilderOpen, setIsExamBuilderOpen] = useState(false);
  const [isFormulaSheetOpen, setIsFormulaSheetOpen] = useState(false);
  const [isRecoveryPlannerOpen, setIsRecoveryPlannerOpen] = useState(false);
  const [isFocusAmbienceOpen, setIsFocusAmbienceOpen] = useState(false);
  const [isMathScratchpadOpen, setIsMathScratchpadOpen] = useState(false);
  const [isStudentBinderOpen, setIsStudentBinderOpen] = useState(false);
  const [cohortMomentum, setCohortMomentum] = useState<Record<string | number, { weekly_activity_count: number; today_activity_count: number; badge?: string | null; badge_text?: string | null }>>({});
  const [studentName, setStudentName] = useState<string>('');
  const [timeGreeting, setTimeGreeting] = useState<{ icon: string; title: string; subtitle: string } | null>(null);
  const isHeaderVisible = useSmartHeaderVisibility({ threshold: 12, topBoundary: 25 });

  // Passive Cohort Momentum Fetch (Feature 1)
  useEffect(() => {
    let isMounted = true;
    fetch(getApiUrl('/api/stats/momentum'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          const map = data.momentum || data;
          setCohortMomentum(map);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Load student profile & prompt onboarding if first visit
  useEffect(() => {
    const profile = getStudentProfileLocal();
    if (profile.name) {
      setStudentName(profile.name);
    }
    if (shouldPromptOnboarding()) {
      const timer = setTimeout(() => {
        setIsWelcomeModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync profile changes across components
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail?.name !== undefined) {
        setStudentName(e.detail.name);
      }
      if (e.detail?.persona) {
        setCurrentPersona(e.detail.persona);
      }
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
  }, []);

  // Dynamic time-of-day greeting (كلمة ع الماشي / رادار المحاضرات)
  useEffect(() => {
    const hour = new Date().getHours();
    const namePrefix = studentName ? ` يا ${studentName}` : '';

    if (hour >= 5 && hour < 12) {
      setTimeGreeting({
        icon: '☕',
        title: isGirls ? `صباح الفل${namePrefix} ✨` : `صباح النشاط${namePrefix} 🎯`,
        subtitle: isGirls
          ? 'فنجان نسكافيهك الرايق ومحاضرة د/ سيد.. يومك لطيف وسالك بإذن الله 🌸'
          : 'فنجان قهوتك ومحاضرة د/ سيد.. يومك سالك وموفق بإذن الله 🚀',
      });
    } else if (hour >= 12 && hour < 17) {
      setTimeGreeting({
        icon: '⏱️',
        title: isGirls ? `شدي حيلك${namePrefix} 🌸` : `وقت الإنجاز${namePrefix} 💪`,
        subtitle: isGirls
          ? 'لميلك مسألتين في السريع واليوم هيعدي زي الفل ✨'
          : 'لملك مسألتين في السريع قبل ما اليوم يهرب، الزتونة معاك 🎯',
      });
    } else {
      setTimeGreeting({
        icon: '🌙',
        title: isGirls ? `سهرة مذاكرة رايقة${namePrefix} 🎀` : `سهرة الدحيحة${namePrefix} 🚀`,
        subtitle: isGirls
          ? 'سهرانة مع المعادلات والنظريات؟ متقلقيش، الزتونة هنا هتلملك الدنيا ✨'
          : 'سهران مع فيرما والمعادلات؟ متقلقش، الزتونة هنا هتلملك الحوار 💡',
      });
    }
  }, [isGirls, studentName]);

  // Initialize session KPI telemetry on first visit
  useEffect(() => {
    try {
      let sessId = sessionStorage.getItem('bsu_session_id');
      if (!sessId) {
        sessId = 'sess_' + Math.random().toString(36).substring(2, 11);
        sessionStorage.setItem('bsu_session_id', sessId);
        sessionStorage.setItem('bsu_session_start_ts', String(Date.now()));
        const isMobile = window.innerWidth < 768;
        trackSessionStarted(sessId, isMobile ? 'mobile' : 'desktop');
      }
    } catch {}
  }, []);

  // Switch Semester and auto-select appropriate active subject
  const handleSemesterChange = (semester: 1 | 2) => {
    setSelectedSemester(semester);
    const targetSubjects = subjects.filter(s => (s.semester ?? 1) === semester);
    if (targetSubjects.length > 0) {
      const stillValid = targetSubjects.some(s => s.id === activeSubjectId);
      if (!stillValid) {
        setActiveSubjectId(targetSubjects[0].id);
      }
    } else {
      setActiveSubjectId(null);
    }
  };

  // 1. Fetch Subjects on Mount (Supabase Edge Revalidation)
  useEffect(() => {
    setIsLoadingSubjects(true);
    getDirectSupabaseSubjects()
      .then(data => {
        const unified = mergeSubjects(data);
        setSubjects(unified);
        try { localStorage.setItem('bsu_cached_subjects', JSON.stringify(unified)); } catch {}

        // Ensure valid active subject is selected
        const term1 = unified.filter(s => (s.semester ?? 1) === 1);
        const diff = term1.find((s) => s.name === 'هندسة تفاضلية');
        setActiveSubjectId(prev => {
          if (prev && unified.some(s => s.id === prev)) return prev;
          return diff ? diff.id : (term1[0]?.id ?? unified[0]?.id ?? null);
        });
      })
      .catch(err => {
        console.warn('Supabase edge subjects fetch failed, trying fast fallback:', err);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        fetch(getApiUrl('/api/subjects'), { signal: controller.signal })
          .then(res => res.json())
          .then(data => {
            clearTimeout(timeoutId);
            const unified = mergeSubjects(data);
            setSubjects(unified);
            try { localStorage.setItem('bsu_cached_subjects', JSON.stringify(unified)); } catch {}
          })
          .catch(() => {
            // Already initialized with canonical courses instantly!
          });
      })
      .finally(() => setIsLoadingSubjects(false));
  }, []);

  // 2. Fetch Subject Lectures when activeSubjectId changes (Supabase Edge First)
  useEffect(() => {
    if (!activeSubjectId) return;
    try { localStorage.setItem('bsu_active_subject_id', String(activeSubjectId)); } catch {}

    const currentSubj = subjects.find(s => s.id === activeSubjectId);
    if (currentSubj?.doctors && currentSubj.doctors.length > 1) {
      setSelectedDoctor(currentSubj.doctors[0]);
    } else {
      setSelectedDoctor('الكل');
    }

    // Try reading cached lectures for this subject immediately for zero-lag switching
    try {
      const cached = localStorage.getItem(`bsu_cached_lectures_${activeSubjectId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSubjectLectures(parsed);
        }
      }
    } catch {}

    setIsLoadingLectures(true);

    getDirectSupabaseLectures(activeSubjectId)
      .then(data => {
        const lecs = Array.isArray(data) ? data : [];
        setSubjectLectures(lecs);
        try { localStorage.setItem(`bsu_cached_lectures_${activeSubjectId}`, JSON.stringify(lecs)); } catch {}
      })
      .catch(err => {
        console.warn('Direct Supabase lectures failed, trying fast fallback:', err);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        fetch(getApiUrl(`/api/subjects/${activeSubjectId}/lectures`), { signal: controller.signal })
          .then(res => (res.ok ? res.json() : []))
          .then(data => {
            clearTimeout(timeoutId);
            const lecs = Array.isArray(data) ? data : [];
            setSubjectLectures(lecs);
            try { localStorage.setItem(`bsu_cached_lectures_${activeSubjectId}`, JSON.stringify(lecs)); } catch {}
          })
          .catch(() => {
            // Keep current / cached
          });
      })
      .finally(() => setIsLoadingLectures(false));
  }, [activeSubjectId]);


  // Filter subjects by selected semester and search query (name, canonical doctor, or doctor track)
  const semesterSubjects = subjects.filter(s => (s.semester ?? 1) === selectedSemester);
  const filteredSubjects = semesterSubjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.canonicalDoctor && s.canonicalDoctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.doctors && s.doctors.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const activeSubject = subjects.find(s => s.id === activeSubjectId);


  const displayedLectures = subjectLectures
    .filter((l) => l.status !== 'failed')
    .filter((l) => {
      if (activeSubject?.doctors && activeSubject.doctors.length > 1 && selectedDoctor && selectedDoctor !== 'الكل') {
        return l.doctor === selectedDoctor;
      }
      return true;
    });

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
      }}
      className="min-h-screen flex flex-col transition-colors duration-200"
    >
      
      {/* Top Academic Header (Auto-hides on scroll-down, reveals on scroll-up to maximize screen real estate) */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-subtle)',
          boxShadow: isHeaderVisible ? 'var(--card-shadow)' : 'none',
        }}
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-300 ease-in-out ${
          isHeaderVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 min-h-[3.5rem] sm:min-h-[4rem] py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-4">
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              style={{
                backgroundColor: isGirls 
                  ? (isDark ? 'rgba(255, 101, 132, 0.2)' : '#FFE4EC') 
                  : (isDark ? 'rgba(45, 212, 191, 0.15)' : '#E6F4F1'),
                borderColor: isGirls 
                  ? (isDark ? 'rgba(255, 101, 132, 0.4)' : '#F2CBD5') 
                  : (isDark ? 'rgba(45, 212, 191, 0.35)' : '#B2DFDB'),
              }}
              className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-xs shrink-0"
            >
              {isGirls ? (
                <span className="text-lg sm:text-xl">🎀</span>
              ) : (
                <GraduationCap className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" style={{ color: 'var(--accent-primary)' }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-xs xs:text-sm sm:text-base tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {isGirls ? 'منصة المنهج 🎀' : 'منصة المنهج'}
                </h1>
                <span
                  style={{
                    backgroundColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.15)' : '#FFF0F3') : (isDark ? 'rgba(45, 212, 191, 0.15)' : '#E6F4F1'),
                    borderColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.35)' : '#F4D7DE') : (isDark ? 'rgba(45, 212, 191, 0.35)' : '#B2DFDB'),
                    color: isGirls ? (isDark ? '#FFA0B5' : '#C46D82') : (isDark ? '#2DD4BF' : '#184E4E'),
                  }}
                  className="hidden lg:inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border shrink-0"
                >
                  {isGirls ? 'نسخة البنات 🌸' : 'نسخة الشباب'}
                </span>
                {isTestMode && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full border bg-amber-500/15 border-amber-500/40 text-amber-500 shrink-0"
                    title="وضع التجربة والاختبار مفعل: الإحصائيات معزولة تماماً عن الدفعة"
                  >
                    <span>🧪</span>
                    <span className="hidden xs:inline">تجربة (معزول)</span>
                    <span className="xs:hidden">معزول</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium mt-0.5 leading-snug truncate" style={{ color: 'var(--text-muted)' }}>
                <span className="sm:hidden">تربية بني سويف • تانية رياضيات</span>
                <span className="hidden sm:inline">{isGirls ? 'كلية التربية • الفرقة الثانية • شعبة رياضيات 🌸' : 'كلية التربية • الفرقة الثانية • شعبة رياضيات'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsMistakeNotebookOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="كراسة الأخطاء الذكية وتكرار لايتنر"
            >
              <span>🧠</span>
              <span className="hidden sm:inline">كراسة الأخطاء</span>
            </button>
            <button
              onClick={() => setIsMicroSessionOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="جلسة الـ 5 دقائق السريعة"
            >
              <span>⏱️ 5 دقائق</span>
            </button>
            <button
              onClick={() => setIsWrapUpOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold hover:scale-102 active:scale-98 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="أنهيت مذاكرتي لليوم"
            >
              <span>☕ استريح</span>
            </button>
            <StudentGamificationPill isGirls={isGirls} isDark={isDark} />
            <NotificationBell isGirls={isGirls} isDark={isDark} />
            {studentName && (
              <button
                type="button"
                onClick={() => setIsWelcomeModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold hover:scale-105 active:scale-95 transition-all shadow-2xs cursor-pointer select-none"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: isGirls ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-interactive)',
                  color: isGirls ? '#F43F5E' : 'var(--accent-primary)',
                }}
                title="تعديل اسمك وهويتك في المنصة"
              >
                <span>{isGirls ? '👩‍🎓' : '👨‍🎓'}</span>
                <span className="truncate max-w-[120px]">{studentName}</span>
              </button>
            )}
            <div className="hidden md:inline-flex">
              <ThemeToggle />
            </div>
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setIsMobileNavOpen(true)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="lg:hidden p-1.5 rounded-lg border flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              title="القائمة والإعدادات"
              aria-label="القائمة والإعدادات"
            >
              <Menu className="w-4.5 h-4.5" style={{ color: 'var(--accent-primary)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Showcase Section - Clean, Modern, Above-the-fold */}
      <section
        style={{ borderColor: 'var(--border-subtle)' }}
        className="relative overflow-hidden pt-4 pb-6 sm:pt-8 sm:pb-10 px-4 sm:px-6 lg:px-8 border-b"
      >
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          <h2
            className="fluid-h1 font-black tracking-tight leading-snug max-w-4xl mx-auto"
            style={{ color: 'var(--text-primary)' }}
          >
            {isGirls
              ? content.personas.girls.heroTitle
              : content.personas.boys.heroTitle}
          </h2>

          <p
            className="fluid-body max-w-2xl mx-auto leading-relaxed text-xs sm:text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isGirls
              ? content.personas.girls.heroSubtitle
              : content.personas.boys.heroSubtitle}
          </p>

          <div className="max-w-md mx-auto relative pt-1 sm:pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isGirls ? content.personas.girls.searchPlaceholder : content.personas.boys.searchPlaceholder}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.35)' : '#F2CBD5') : 'var(--border-prominent)',
                color: 'var(--text-primary)',
              }}
              className="w-full pr-10 pl-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 absolute right-3.5 top-[15px] sm:top-[18px] pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        
        {/* Phase 1: Zero-Redundancy Smart Resume ("كمّل من حيث وقفت") */}
        <SmartResumeCard />

        {/* Phase 6: Sybil-Proof Collaborative Cohort Challenge */}
        <CohortChallengeWidget isGirls={isGirls} />

        {/* Subjects Grid & Semester Selector */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                {isGirls && <span className="text-2xl">🌸</span>}
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span>{selectedSemester === 1 ? 'مواد الترم الأول' : 'مواد الترم الثاني'}</span>
                  <span className="inline-flex items-center justify-center text-xs font-bold px-2.5 py-0.5 rounded-full font-mono bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                    {filteredSubjects.length} {filteredSubjects.length === 1 ? 'مادة' : 'مواد'}
                  </span>
                </span>
              </h3>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                {isGirls 
                  ? 'اختاري المادة واستمتعي بالمحاضرات والشرح والزتونة 🎀' 
                  : 'اختار المادة وتصفح المحاضرات والشرح والملخصات الذكية'}
              </p>
            </div>

            {/* Semester Switcher Tabs */}
            <div 
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="inline-flex items-center p-0.5 rounded-xl border self-start sm:self-auto shadow-xs"
            >
              <button
                type="button"
                onClick={() => handleSemesterChange(1)}
                style={{
                  backgroundColor: selectedSemester === 1 
                    ? (isGirls ? '#F43F5E' : 'var(--accent-primary)') 
                    : 'transparent',
                  color: selectedSemester === 1 
                    ? '#FFFFFF' 
                    : 'var(--text-secondary)',
                }}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="shrink-0">الترم الأول</span>
                <span className="shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
                  <bdi dir="ltr">{subjects.filter(s => (s.semester ?? 1) === 1).length}</bdi>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSemesterChange(2)}
                style={{
                  backgroundColor: selectedSemester === 2 
                    ? (isGirls ? '#F43F5E' : 'var(--accent-primary)') 
                    : 'transparent',
                  color: selectedSemester === 2 
                    ? '#FFFFFF' 
                    : 'var(--text-secondary)',
                }}
                className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="shrink-0">الترم الثاني</span>
                <span className="shrink-0 inline-flex items-center justify-center text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
                  <bdi dir="ltr">{subjects.filter(s => (s.semester ?? 1) === 2).length}</bdi>
                </span>
              </button>
            </div>
          </div>

          {isLoadingSubjects && filteredSubjects.length === 0 ? (
            <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2.5 pb-2.5 pt-1 md:py-0 px-1 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="h-28 rounded-2xl border animate-pulse p-4 flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-gray-500/10" />
                  <div className="h-4 w-3/4 bg-gray-500/15 rounded" />
                </div>
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div 
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="rounded-3xl border p-8 sm:p-12 text-center max-w-xl mx-auto my-6 transition-colors shadow-sm"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl select-none">
                {searchQuery ? '🔍' : (selectedSemester === 2 ? '⏳' : '📚')}
              </div>
              <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {searchQuery 
                  ? content.semesters.searchEmpty.title
                  : selectedSemester === 2 
                    ? content.semesters.semester2.emptyTitle
                    : content.semesters.semester1.emptyTitle}
              </h4>
              <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {searchQuery
                  ? content.semesters.searchEmpty.subtitle
                  : selectedSemester === 2
                    ? content.semesters.semester2.emptySubtitle
                    : content.semesters.semester1.emptySubtitle}
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Swipe Hint */}
              <div className="flex md:hidden items-center justify-between text-xs font-semibold px-1 mb-2.5" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <span>{content.semesters.mobileSwipeHint}</span>
                  <span className="text-xs opacity-75">↔</span>
                </span>
                <span className="text-xs opacity-80">{filteredSubjects.length} مادة</span>
              </div>

              <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] overflow-x-auto md:overflow-x-visible overscroll-x-contain snap-x snap-mandatory gap-2.5 pb-2.5 pt-3 md:py-0 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rail-courses-mobile">
                {filteredSubjects.map((sub) => {
                  const isActive = sub.id === activeSubjectId;
                  const styleConfig = SUBJECT_THEME_STYLES[sub.name] || {
                    charm: '🌸',
                    badgeTag: 'مقرر دراسي 🌸',
                    darkBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/60',
                    lightBadge: 'bg-rose-100 text-rose-700 border-rose-200',
                    glowColor: '#FB7185',
                    boysCharm: '',
                    boysBadgeTag: 'مقرر دراسي',
                    boysDarkBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/60',
                    boysLightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
                    boysGlowColor: '#06B6D4',
                  };

                  const activeCharm = isGirls ? styleConfig.charm : styleConfig.boysCharm;
                  const activeBadgeTag = isGirls ? styleConfig.badgeTag : styleConfig.boysBadgeTag;
                  const activeDarkBadge = isGirls ? styleConfig.darkBadge : styleConfig.boysDarkBadge;
                  const activeLightBadge = isGirls ? styleConfig.lightBadge : styleConfig.boysLightBadge;
                  const activeGlowColor = isGirls ? styleConfig.glowColor : styleConfig.boysGlowColor;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubjectId(sub.id)}
                      style={{
                        backgroundColor: isActive 
                          ? 'var(--bg-surface-elevated)' 
                          : 'var(--bg-surface)',
                        borderColor: isActive 
                          ? activeGlowColor 
                          : 'var(--border-subtle)',
                        boxShadow: isActive 
                          ? (isDark ? `0 0 20px ${activeGlowColor}33, var(--card-shadow-hover)` : `0 0 16px ${activeGlowColor}22, var(--card-shadow-hover)`)
                          : 'var(--card-shadow)',
                      }}
                      className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer group min-w-[130px] w-[138px] xs:w-[150px] sm:w-[165px] md:w-auto shrink-0 snap-start ${
                        isActive 
                          ? 'ring-2 ring-cyan-500/40' 
                          : 'sm:hover:scale-[1.01]'
                      }`}
                    >
                      {/* Active sticker tag: Girls or Boys */}
                      {isActive && (
                        <div className="absolute -top-2 right-2.5 z-10">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 tracking-wide"
                            style={{
                              backgroundColor: isDark ? (isGirls ? '#28162F' : '#0B132B') : (isGirls ? '#FFF0F3' : '#EFF6FF'),
                              borderColor: activeGlowColor,
                              color: activeGlowColor,
                            }}
                          >
                            {isGirls ? '🎀 المختارة' : 'المقرر النشط'}
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="relative w-9 h-9 sm:w-11 sm:h-11 mb-2">
                          <div
                            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border flex items-center justify-center font-bold text-base sm:text-lg shadow-sm transition-transform duration-200 group-hover:scale-105 select-none leading-none ${
                              isDark ? activeDarkBadge : activeLightBadge
                            }`}
                          >
                            <span className="flex items-center justify-center">{sub.icon || sub.name.slice(0, 2)}</span>
                          </div>

                          {/* Floating Charm Sticker (Girls only) */}
                          {isGirls && activeCharm && (
                            <div
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border shadow-sm flex items-center justify-center text-xs select-none leading-none pointer-events-none"
                              style={{
                                backgroundColor: isDark ? '#28162F' : '#FFFFFF',
                                borderColor: isDark ? `${activeGlowColor}80` : '#F2CBD5',
                              }}
                            >
                              {activeCharm}
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight break-words" style={{ color: 'var(--text-primary)' }}>
                          {sub.name}
                        </h4>
                        {sub.canonicalDoctor && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md mt-1 truncate max-w-full border"
                            style={{
                              backgroundColor: isDark ? `${activeGlowColor}18` : `${activeGlowColor}12`,
                              color: activeGlowColor,
                              borderColor: `${activeGlowColor}35`,
                            }}
                          >
                            {sub.canonicalDoctor.includes('مروة') || sub.canonicalDoctor.includes('ايه') || sub.canonicalDoctor.includes('ايمان') ? '👩‍🏫' : '👨‍🏫'} {sub.canonicalDoctor} {isGirls ? '🌸' : ''}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span 
                          className="font-semibold text-xs sm:text-sm whitespace-nowrap" 
                          style={{ color: activeGlowColor }}
                        >
                          {activeBadgeTag}
                        </span>
                        <ChevronLeft className="w-3.5 h-3.5 opacity-70 transition-transform group-hover:-translate-x-1 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Active Subject Lectures */}
        {activeSubject && (() => {
          const activeSubjectConfig = SUBJECT_THEME_STYLES[activeSubject?.name || ''] || {
            charm: '🎀',
            badgeTag: 'مقرر دراسي 🌸',
            darkBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/60',
            lightBadge: 'bg-rose-100 text-rose-700 border-rose-200',
            glowColor: '#FB7185',
            boysCharm: '',
            boysBadgeTag: 'مقرر دراسي',
            boysDarkBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/60',
            boysLightBadge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
            boysGlowColor: '#06B6D4',
          };
          const activeSubjectCharm = isGirls ? activeSubjectConfig.charm : activeSubjectConfig.boysCharm;
          const activeSubjectGlow = isGirls ? activeSubjectConfig.glowColor : activeSubjectConfig.boysGlowColor;
          const activeSubjectDarkBadge = isGirls ? activeSubjectConfig.darkBadge : activeSubjectConfig.boysDarkBadge;
          const activeSubjectLightBadge = isGirls ? activeSubjectConfig.lightBadge : activeSubjectConfig.boysLightBadge;

          return (
            <section
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--card-shadow)',
              }}
              className="p-3.5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-colors"
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-12 h-12 shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shadow-sm select-none leading-none ${
                        isDark ? activeSubjectDarkBadge : activeSubjectLightBadge
                      }`}
                    >
                      <span className="flex items-center justify-center">{activeSubject?.icon || '📐'}</span>
                    </div>
                    {isGirls && activeSubjectCharm && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border shadow-sm flex items-center justify-center text-[11px] select-none leading-none pointer-events-none"
                        style={{
                          backgroundColor: isDark ? '#28162F' : '#FFFFFF',
                          borderColor: isDark ? `${activeSubjectGlow}80` : '#F2CBD5',
                        }}
                      >
                        {activeSubjectCharm}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: activeSubjectGlow }}>
                        {isGirls ? '🌸 المادة اللي اخترتيها يا شطورة' : 'المقرر المختار'}
                      </span>
                      {activeSubject?.canonicalDoctor && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap shrink-0"
                          style={{
                            backgroundColor: isDark ? `${activeSubjectGlow}20` : `${activeSubjectGlow}15`,
                            borderColor: `${activeSubjectGlow}45`,
                            color: activeSubjectGlow,
                          }}
                        >
                          {activeSubject.canonicalDoctor.includes('مروة') || activeSubject.canonicalDoctor.includes('ايه') || activeSubject.canonicalDoctor.includes('ايمان') ? '👩‍🏫' : '👨‍🏫'} {activeSubject.canonicalDoctor} {isGirls ? '🌸' : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black mt-1 flex items-center gap-2 flex-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                      <span>{activeSubject?.name || content.lecturesSection.defaultPrompt}</span>
                      {isGirls && <span className="text-xl">✨</span>}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
                  {/* Custom Exam Builder Button */}
                  <button
                    type="button"
                    onClick={() => setIsExamBuilderOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 246, 255, 0.95)',
                      borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(191, 219, 254, 0.8)',
                      color: isDark ? '#93C5FD' : '#1D4ED8',
                    }}
                    title="توليف امتحان مخصص ومحاكاة ميدترم بنطاق محاضرات مرن"
                  >
                    <span>⚡</span>
                    <span>محاكي الامتحانات</span>
                  </button>

                  {/* Formula Sheet Button */}
                  <button
                    type="button"
                    onClick={() => setIsFormulaSheetOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 253, 245, 0.95)',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(167, 243, 208, 0.8)',
                      color: isDark ? '#6EE7B7' : '#047857',
                    }}
                    title="استعراض بنك القوانين والنظريات وتصديرها كـ PDF للطباعة الورقية"
                  >
                    <span>📐</span>
                    <span>كشكول القوانين</span>
                  </button>

                  {/* Cohort Hurdles Button */}
                  <button
                    type="button"
                    onClick={() => setIsHurdlesModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 242, 242, 0.95)',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(252, 165, 165, 0.8)',
                      color: isDark ? '#FCA5A5' : '#B91C1C',
                    }}
                    title="استعراض أصعب أسئلة كويزات الدفعة مع الإجابات النموذجية والشرح"
                  >
                    <span>🎯</span>
                    <span>أصعب الفخاخ</span>
                  </button>

                  {/* Recovery Planner Button */}
                  <button
                    type="button"
                    onClick={() => setIsRecoveryPlannerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(250, 245, 255, 0.95)',
                      borderColor: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(233, 213, 255, 0.8)',
                      color: isDark ? '#D8B4FE' : '#7E22CE',
                    }}
                    title="توليف خطة إنقاذ وسد التراكمات اليومية وحصد نقاط XP"
                  >
                    <span>📅</span>
                    <span>خطة الإنقاذ</span>
                  </button>

                  {/* Focus & Pomodoro Ambience Button (Feature 4) */}
                  <button
                    type="button"
                    onClick={() => setIsFocusAmbienceOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(254, 252, 232, 0.95)',
                      borderColor: isDark ? 'rgba(234, 179, 8, 0.4)' : 'rgba(254, 240, 138, 0.8)',
                      color: isDark ? '#FDE047' : '#A16207',
                    }}
                    title="بيئة صوتية طبيعية ومؤقت بومودورو للتركيز وحصد XP"
                  >
                    <span>🧘</span>
                    <span>ركن التركيز</span>
                  </button>

                  {/* Math Scratchpad Button (Feature 4) */}
                  <button
                    type="button"
                    onClick={() => setIsMathScratchpadOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(236, 254, 255, 0.95)',
                      borderColor: isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(165, 243, 252, 0.8)',
                      color: isDark ? '#67E8F9' : '#0E7490',
                    }}
                    title="مسودة بيضاء تفاعلية وحاسبة علمية لحل المعادلات والمسائل"
                  >
                    <span>✏️</span>
                    <span>مسودة الرياضيات</span>
                  </button>

                  {/* Student Binder Button (Feature 4) */}
                  <button
                    type="button"
                    onClick={() => setIsStudentBinderOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 247, 237, 0.95)',
                      borderColor: isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(254, 215, 170, 0.8)',
                      color: isDark ? '#FDBA74' : '#C2410C',
                    }}
                    title="كشكول ملاحظاتي الشخصية وقوانيني وقوالب المذاكرة"
                  >
                    <span>📌</span>
                    <span>كشكول ملاحظاتي</span>
                  </button>

                  <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    {isGirls && <span>☕</span>}
                    <span>متاح {displayedLectures.length} محاضرات</span>
                    {isGirls && <span>بروقان</span>}
                  </div>
                </div>
              </div>

              {/* Doctor / Professor Tracks Switcher */}
              {activeSubject?.doctors && activeSubject.doctors.length > 1 && (
                <div className="flex items-center gap-2.5 mb-6 overflow-x-auto pb-2 scrollbar-none">
                  {activeSubject.doctors.map((doc) => {
                    const isSelected = selectedDoctor === doc;
                    const count = subjectLectures.filter(l => l.doctor === doc).length;
                    const track = getDoctorTrackDetails(activeSubject.name, doc);
                    return (
                      <button
                        key={doc}
                        type="button"
                        onClick={() => setSelectedDoctor(doc)}
                        className={`shrink-0 min-w-fit px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center gap-2.5 shadow-sm ${
                          isSelected ? 'scale-[1.02] shadow-md' : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          color: isSelected ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)'
                        }}
                      >
                        <span className="text-base sm:text-lg shrink-0">{track.icon}</span>
                        <div className="flex flex-col text-right leading-tight">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{track.label}</span>
                            {track.badge && (
                              <span 
                                className="text-[10px] px-1.5 py-0.2 rounded font-semibold border"
                                style={{
                                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-surface)',
                                  borderColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : 'var(--border-subtle)',
                                  color: isSelected ? 'inherit' : 'var(--text-muted)'
                                }}
                              >
                                {track.badge}
                              </span>
                            )}
                          </div>
                          {track.subtext !== track.label && (
                            <span className="text-[11px] font-medium opacity-85 mt-0.5">
                              {track.subtext}
                            </span>
                          )}
                        </div>
                        <span
                          className="inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full shrink-0 font-mono ms-1 border"
                          style={{
                            backgroundColor: isSelected
                              ? 'rgba(255, 255, 255, 0.25)'
                              : 'var(--bg-surface)',
                            borderColor: isSelected ? 'transparent' : 'var(--border-subtle)',
                            color: isSelected ? 'inherit' : 'var(--text-muted)',
                          }}
                        >
                          {count > 0 ? count : (track.badge === 'عملي' ? 'قريباً' : 0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {isLoadingLectures ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <div
                    style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
                    className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3"
                  ></div>
                  <span className="text-base font-semibold">{content.lecturesSection.loading}</span>
                </div>
              ) : displayedLectures.length === 0 ? (
                <div 
                  className="text-center py-12 px-4 rounded-3xl border border-dashed my-4 max-w-xl mx-auto backdrop-blur-xs" 
                  style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                >
                  <div
                    style={{ backgroundColor: isGirls ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)', borderColor: isGirls ? 'rgba(236, 72, 153, 0.25)' : 'rgba(59, 130, 246, 0.25)' }}
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border text-3xl shadow-inner"
                  >
                    {selectedDoctor.includes('ايه') ? '💻' : <GraduationCap className="w-8 h-8 opacity-60" />}
                  </div>
                  <p className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedDoctor.includes('ايه') 
                      ? 'السكاشن العملية (د/ آية) - جاري التجهيز' 
                      : content.lecturesSection.emptyTitle}
                  </p>
                  <p className="text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {selectedDoctor.includes('ايه') 
                      ? 'سيتم رفع وإتاحة السكاشن العملية مع كافة ملخصاتها واختباراتها الذكية هنا فور تسليمها 🌸' 
                      : content.lecturesSection.emptySubtitle}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3 sm:gap-5">
                  {displayedLectures.map((lec) => {
                    const isReady = lec.is_ready !== undefined ? lec.is_ready : (lec.status === 'completed' && (lec.study_resources_count || lec.assets_count) > 0);
                    const resourceCount = lec.study_resources_count !== undefined ? lec.study_resources_count : lec.assets_count;
                      return (
                        <div
                          key={lec.id}
                          onClick={isReady ? () => router.push(`/lecture?id=${lec.id}`) : undefined}
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: isReady ? 'var(--border-subtle)' : 'var(--border-prominent)',
                          }}
                          className={`lecture-card p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between shadow-sm relative overflow-hidden ${
                            isReady 
                              ? 'cursor-pointer group hover:border-cyan-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' 
                              : 'opacity-85 select-none'
                          }`}
                        >
                          {/* Realistic 3D Metallic Staple Pin for Ready Lectures */}
                          {isReady && (
                            <StaplePin3D
                              isGirls={isGirls}
                              className="absolute top-2 left-2 sm:top-3 sm:left-3 group-hover:scale-110 group-hover:-translate-y-0.5"
                            />
                          )}
                          <div className="mb-4">
                            <div className="lecture-card-header-inner gap-2.5 sm:gap-4">
                              <div
                                style={{
                                  backgroundColor: isReady 
                                    ? (isGirls 
                                        ? (isDark ? 'rgba(255, 101, 132, 0.2)' : '#FFE4EC') 
                                        : (isDark ? `${activeSubjectGlow}25` : 'var(--accent-primary)'))
                                    : 'var(--bg-surface)',
                                  color: isReady 
                                    ? (isGirls 
                                        ? (isDark ? '#FF87A2' : '#C46D82') 
                                        : (isDark ? activeSubjectGlow : '#ffffff'))
                                    : 'var(--text-muted)',
                                  borderColor: isReady 
                                    ? (isGirls 
                                        ? (isDark ? 'rgba(255, 101, 132, 0.4)' : '#F2CBD5') 
                                        : `${activeSubjectGlow}50`) 
                                    : 'var(--border-subtle)',
                                }}
                                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-xl shrink-0 border shadow-md"
                              >
                                {isGirls ? `🌸 ${lec.lecture_num}` : lec.lecture_num}
                              </div>
                              <div className="min-w-0 flex-1 w-full space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  {lec.doctor && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold border whitespace-nowrap"
                                      style={{
                                        backgroundColor: lec.doctor.includes('مروة') ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                        borderColor: lec.doctor.includes('مروة') ? 'rgba(236, 72, 153, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                                        color: lec.doctor.includes('مروة') ? '#ec4899' : '#3b82f6',
                                      }}
                                    >
                                      {lec.doctor.includes('مروة') ? '👩‍🏫' : '👨‍🏫'} {lec.doctor} {isGirls ? '🌸' : ''}
                                    </span>
                                  )}
                                  {(() => {
                                    const mInfo = cohortMomentum[lec.id] || (cohortMomentum as any)[String(lec.id)];
                                    const badge = mInfo?.badge || mInfo?.badge_text;
                                    if (!badge) return null;
                                    return (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border whitespace-nowrap animate-pulse"
                                        style={{
                                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(254, 243, 199, 0.9)',
                                          borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.5)',
                                          color: isDark ? '#FBBF24' : '#B45309',
                                        }}
                                        title={`نشاط طلاب الدفعة: ${mInfo.weekly_activity_count} تفاعل هذا الأسبوع`}
                                      >
                                        {badge}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <h4 className="font-extrabold text-sm sm:text-xl transition-colors group-hover:text-cyan-500 dark:group-hover:text-cyan-400 break-words leading-snug" style={{ color: 'var(--text-primary)' }}>
                                  {lec.title}
                                </h4>
                                <p className="text-xs sm:text-sm font-medium mt-1 break-words leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                  {isReady 
                                    ? (resourceCount >= 5 
                                        ? (isGirls ? 'المحاضرة مكتملة بجميع المصادر 🎀✨' : 'المحاضرة مكتملة بجميع مصادر المذاكرة (5/5)')
                                        : (isGirls ? `متاح ${resourceCount} من 5 مصادر للمذاكرة 🌸` : `متاح ${resourceCount} من 5 مصادر للمذاكرة`))
                                    : (isGirls ? 'قيد المعالجة السحابية بروقان ⏳' : 'قيد المعالجة السحابية')}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                              <span 
                                className={`flex items-center gap-1 transition-opacity ${lec.has_audio ? 'text-cyan-500 dark:text-cyan-400 font-bold opacity-100' : 'opacity-30'}`}
                                title={lec.has_audio ? 'ريكورد صوتي متاح' : 'الريكورد قيد التجهيز'}
                              >
                                <Headphones className="w-4 h-4" />
                                <span className="hidden sm:inline">{isGirls ? 'ريكورد 🌸' : 'ريكورد'}</span>
                              </span>

                              <span 
                                className={`flex items-center gap-1 transition-opacity ${lec.has_video ? 'text-purple-500 dark:text-purple-400 font-bold opacity-100' : 'opacity-30'}`}
                                title={lec.has_video ? 'فيديو توضيحي متاح' : 'الفيديو قيد التجهيز'}
                              >
                                <Video className="w-4 h-4" />
                                <span className="hidden sm:inline">فيديو</span>
                              </span>

                              <span 
                                className={`flex items-center gap-1 transition-opacity ${lec.has_quiz ? 'text-amber-500 dark:text-amber-400 font-bold opacity-100' : 'opacity-30'}`}
                                title={lec.has_quiz ? 'كويز تفاعلي متاح' : 'الكويز قيد التجهيز'}
                              >
                                <HelpCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">كويز</span>
                              </span>

                              <span 
                                className={`flex items-center gap-1 transition-opacity ${lec.has_guide ? 'text-emerald-500 dark:text-emerald-400 font-bold opacity-100' : 'opacity-30'}`}
                                title={lec.has_guide ? 'دليل دراسي متاح' : 'الدليل قيد التجهيز'}
                              >
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline">زتونة</span>
                              </span>

                              <span 
                                className={`flex items-center gap-1 transition-opacity ${lec.has_flashcards ? 'text-pink-500 dark:text-pink-400 font-bold opacity-100' : 'opacity-30'}`}
                                title={lec.has_flashcards ? 'بطاقات استذكار متاحة' : 'البطاقات قيد التجهيز'}
                              >
                                <Layers className="w-4 h-4" />
                                <span className="hidden sm:inline">كروت</span>
                              </span>

                              <span 
                                className="mr-1 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                                style={{
                                  backgroundColor: isReady ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                                  borderColor: isReady ? 'var(--border-prominent)' : 'var(--border-subtle)',
                                  color: isReady ? 'var(--accent-primary)' : 'var(--text-muted)'
                                }}
                              >
                                {resourceCount > 0 ? `${resourceCount}/5 مصادر` : 'قيد الإنتاج'}
                              </span>
                            </div>

                            <Link
                              href={isReady ? `/lecture?id=${lec.id}` : '#'}
                              onClick={(e) => {
                                if (!isReady) e.preventDefault();
                              }}
                              style={{
                                backgroundColor: isReady ? 'var(--accent-primary)' : 'var(--bg-surface)',
                                color: isReady ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-muted)',
                                borderColor: 'var(--border-subtle)',
                              }}
                              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                                isReady ? 'hover:opacity-95 cursor-pointer shadow-cyan-500/20' : 'opacity-70 cursor-not-allowed'
                              }`}
                            >
                              {isReady ? <Play className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                              <span>{isReady ? (isGirls ? 'افتحي المحاضرة 🎀' : 'افتح المحاضرة') : (isGirls ? 'بتتجهز يا شطورة ⏳' : 'قيد التجهيز')}</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          );
        })()}
      </main>


      {/* Academic Footer with subtle Admin Link */}
      <footer
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
        className="mt-16 border-t py-8 px-4 text-center transition-colors"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{content.footer.copyright}</p>
            <p className="mt-0.5">{content.footer.description}</p>
          </div>

          {/* Developer Credits Pill */}
          <div className="flex items-center justify-center my-2 sm:my-0">
            <DeveloperCreditsPill
              isGirls={isGirls}
              onClick={() => setIsDevCreditsOpen(true)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all opacity-60 hover:opacity-100 hover:border-blue-400"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <Lock className="w-3 h-3" />
              <span>{content.footer.adminPortalLink}</span>
            </Link>
          </div>
        </div>
      </footer>

      {/* Phase 1 & 2 Modals */}
      <QuickMicroSessionModal
        isOpen={isMicroSessionOpen}
        onClose={() => setIsMicroSessionOpen(false)}
      />
      <EthicalWrapUpModal
        isOpen={isWrapUpOpen}
        onClose={() => setIsWrapUpOpen(false)}
      />
      <MistakeNotebookModal
        isOpen={isMistakeNotebookOpen}
        onClose={() => setIsMistakeNotebookOpen(false)}
      />

      {/* Mobile Drawer Navigation with Background Scroll Lock */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        isGirls={isGirls}
        isDark={isDark}
        onOpenMistakeNotebook={() => setIsMistakeNotebookOpen(true)}
        onOpenMicroSession={() => setIsMicroSessionOpen(true)}
        onOpenWrapUp={() => setIsWrapUpOpen(true)}
        onOpenDevCredits={() => setIsDevCreditsOpen(true)}
        onOpenEditProfile={() => setIsWelcomeModalOpen(true)}
        onOpenHurdles={() => setIsHurdlesModalOpen(true)}
        onOpenExamBuilder={() => setIsExamBuilderOpen(true)}
        onOpenFormulaSheet={() => setIsFormulaSheetOpen(true)}
        onOpenRecoveryPlanner={() => setIsRecoveryPlannerOpen(true)}
        onOpenFocusAmbience={() => setIsFocusAmbienceOpen(true)}
        onOpenMathScratchpad={() => setIsMathScratchpadOpen(true)}
        onOpenStudentBinder={() => setIsStudentBinderOpen(true)}
      />

      {/* Developer Credits Modal */}
      <DeveloperCreditsModal
        isOpen={isDevCreditsOpen}
        onClose={() => setIsDevCreditsOpen(false)}
        isGirls={isGirls}
      />

      {/* First-Visit / Edit Student Profile Modal */}
      <WelcomeStudentModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        isInitialOnboarding={!studentName}
      />

      {/* Cohort Hurdles Modal (Feature 1: Exam Trap Radar) */}
      <CohortHurdlesModal
        isOpen={isHurdlesModalOpen}
        onClose={() => setIsHurdlesModalOpen(false)}
        isDark={isDark}
      />

      {/* Feature 2: Custom Exam Builder & Formula Sheet Modals */}
      <CustomExamBuilderModal
        isOpen={isExamBuilderOpen}
        onClose={() => setIsExamBuilderOpen(false)}
        activeSubject={activeSubject}
        subjectLectures={displayedLectures}
        isDark={isDark}
        isGirls={isGirls}
      />
      <FormulaSheetModal
        isOpen={isFormulaSheetOpen}
        onClose={() => setIsFormulaSheetOpen(false)}
        activeSubject={activeSubject}
        subjectLectures={displayedLectures}
        isDark={isDark}
        isGirls={isGirls}
      />

      {/* Feature 3: Automated Recovery Planner Modal */}
      <RecoveryPlannerModal
        isOpen={isRecoveryPlannerOpen}
        onClose={() => setIsRecoveryPlannerOpen(false)}
        activeSubject={activeSubject}
        subjectLectures={displayedLectures}
        isDark={isDark}
        isGirls={isGirls}
      />

      {/* Feature 4: Focus Ambience & Pomodoro Modal */}
      <FocusAmbienceModal
        isOpen={isFocusAmbienceOpen}
        onClose={() => setIsFocusAmbienceOpen(false)}
        isDark={isDark}
        isGirls={isGirls}
      />

      {/* Feature 4: Math Scratchpad & Scientific Calculator Modal */}
      <MathScratchpadModal
        isOpen={isMathScratchpadOpen}
        onClose={() => setIsMathScratchpadOpen(false)}
        isDark={isDark}
      />

      {/* Feature 4: Personal Student Binder Modal */}
      <StudentBinderModal
        isOpen={isStudentBinderOpen}
        onClose={() => setIsStudentBinderOpen(false)}
        isDark={isDark}
        isGirls={isGirls}
      />
    </div>
  );
}
