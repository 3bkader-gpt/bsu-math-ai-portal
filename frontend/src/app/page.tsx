'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import 'katex/dist/katex.min.css';
import MathRenderer from '@/components/MathRenderer';
import StudyGuideViewer from '@/components/StudyGuideViewer';
import FlashcardsViewer from '@/components/FlashcardsViewer';
import ThemeToggle from '@/components/ThemeToggle';
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
  Pause, 
  RotateCcw, 
  RotateCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  Lock, 
  ChevronLeft,
  X,
  Lightbulb,
  Award,
  BookMarked,
  Clock,
  Download,
  Loader2
} from 'lucide-react';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import { 
  getDirectSupabaseSubjects, 
  getDirectSupabaseLectures, 
  getDirectSupabaseBundle 
} from '@/lib/supabase';
import { 
  AcademicSubject, 
  CanonicalCourse 
} from '@/types/academic';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

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
    doctor: 'د/ ايمان',
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

interface LectureAsset {
  id: number;
  asset_type: string;
  title: string;
  file_size_bytes?: number | null;
  has_telegram: boolean;
  telegram_file_id?: string | null;
  telegram_message_id?: number | null;
  content_text?: string | null;
  stream_url: string;
  is_available?: boolean;
}

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

interface LectureBundle {
  id?: number;
  lecture_id?: number;
  lecture_num: number;
  title: string;
  doctor?: string | null;
  subject_name?: string;
  assets: LectureAsset[];
}

interface QuizQuestion {
  number: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

interface Flashcard {
  question: string;
  answer: string;
}

const isAssetStorageAvailable = (a: LectureAsset): boolean => {
  if (typeof a.is_available === 'boolean') {
    return a.is_available;
  }
  return Boolean(a.has_telegram || a.telegram_file_id || a.telegram_message_id);
};

interface OriginalPdfInfo {
  id: number;
  isBook: boolean;
  badgeText: string;
  badgeEmoji: string;
  title: string;
  subtitle: string;
  formattedSize: string;
  downloadUrl: string;
  suggestedFilename: string;
}

const getOriginalPdfDetails = (pdf: any, lectureNum?: number): OriginalPdfInfo => {
  const rawTitle = (pdf.title || '').trim();
  const isBook = /كتاب/i.test(rawTitle);

  const sizeMb = pdf.file_size_bytes
    ? (pdf.file_size_bytes / (1024 * 1024)).toFixed(1)
    : null;
  const sizeKb = pdf.file_size_bytes && (!sizeMb || parseFloat(sizeMb) < 0.5)
    ? Math.round(pdf.file_size_bytes / 1024)
    : null;
  const formattedSize = sizeMb && parseFloat(sizeMb) >= 0.5 ? `${sizeMb} ميجا` : (sizeKb ? `${sizeKb} ك.ب` : '');

  const downloadUrl = (pdf.stream_url || `/api/stream/${pdf.id}`).includes('?')
    ? `${pdf.stream_url || `/api/stream/${pdf.id}`}&download=true`
    : `${pdf.stream_url || `/api/stream/${pdf.id}`}?download=true`;

  if (isBook) {
    const bookTopic = rawTitle
      .replace(/\.pdf$/i, '')
      .replace(/^كتاب\s*[-–—:]\s*/i, '')
      .trim();
    const suggestedFilename = lectureNum
      ? `المحاضرة ${lectureNum} - جزء الكتاب (${bookTopic || 'المقرر'}).pdf`
      : `جزء الكتاب - ${bookTopic || 'المقرر'}.pdf`;

    return {
      id: pdf.id,
      isBook: true,
      badgeText: 'من الكتاب المقرر',
      badgeEmoji: '📚',
      title: 'جزء المحاضرة من الكتاب',
      subtitle: bookTopic || 'المحتوى المعتمد من الكتاب الدراسي',
      formattedSize,
      downloadUrl,
      suggestedFilename,
    };
  } else {
    const suggestedFilename = lectureNum
      ? `المحاضرة ${lectureNum} - كشكول المحاضرة (بخط اليد).pdf`
      : `كشكول المحاضرة (بخط اليد).pdf`;

    return {
      id: pdf.id,
      isBook: false,
      badgeText: 'بخط اليد',
      badgeEmoji: '✍️',
      title: 'كشكول المحاضرة (بخط اليد)',
      subtitle: 'الشرح والتدوين الأصلي أثناء المحاضرة',
      formattedSize,
      downloadUrl,
      suggestedFilename,
    };
  }
};

export default function Home() {
  const [currentPersona, setCurrentPersona] = useState<'boys' | 'girls'>('boys');
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const p = (localStorage.getItem('bsu_portal_persona') as 'boys' | 'girls') || 'boys';
      const m = (localStorage.getItem('bsu_portal_mode') as 'light' | 'dark') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setCurrentPersona(p);
      setCurrentMode(m);
    } catch {}

    const handleThemeChange = (e: any) => {
      if (e.detail?.persona) setCurrentPersona(e.detail.persona);
      if (e.detail?.mode) setCurrentMode(e.detail.mode);
    };

    window.addEventListener('bsu_theme_changed', handleThemeChange);
    return () => window.removeEventListener('bsu_theme_changed', handleThemeChange);
  }, []);

  const isGirls = currentPersona === 'girls';
  const isDark = currentMode === 'dark';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('الكل');
  const [subjectLectures, setSubjectLectures] = useState<Lecture[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Lecture Bundle Modal
  const [activeBundle, setActiveBundle] = useState<LectureBundle | null>(null);
  const [isLoadingBundle, setIsLoadingBundle] = useState(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'quiz' | 'guide' | 'flashcards'>('audio');

  // Quiz Engine State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState<number | null>(null);

  // Study Guide & Flashcards Content
  const [guideText, setGuideText] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadingAssetId, setDownloadingAssetId] = useState<number | string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Freeze background page scroll completely when lecture modal is open
  useEffect(() => {
    if (activeBundle) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [activeBundle]);

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

  // 1. Fetch Subjects on Mount (Supabase Edge First <100ms)
  useEffect(() => {
    getDirectSupabaseSubjects()
      .then(data => {
        const unified = mergeSubjects(data);
        setSubjects(unified);
        const term1 = unified.filter(s => (s.semester ?? 1) === 1);
        const diff = term1.find((s) => s.name === 'هندسة تفاضلية');
        if (diff) {
          setActiveSubjectId(diff.id);
        } else if (term1.length > 0) {
          setActiveSubjectId(term1[0].id);
        } else if (unified.length > 0) {
          setActiveSubjectId(unified[0].id);
        }
      })
      .catch(err => {
        console.warn('Supabase edge subjects fetch failed, falling back to tunnel:', err);
        fetch(getApiUrl('/api/subjects'))
          .then(res => res.json())
          .then(data => {
            const unified = mergeSubjects(data);
            setSubjects(unified);
            const term1 = unified.filter(s => (s.semester ?? 1) === 1);
            const diff = term1.find((s) => s.name === 'هندسة تفاضلية');
            if (diff) {
              setActiveSubjectId(diff.id);
            } else if (term1.length > 0) {
              setActiveSubjectId(term1[0].id);
            } else if (unified.length > 0) {
              setActiveSubjectId(unified[0].id);
            }
          })
          .catch(apiErr => {
            console.error('All subjects fetch failed, using offline canonical:', apiErr);
            const fallbackUnified = mergeSubjects([]);
            setSubjects(fallbackUnified);
            const term1 = fallbackUnified.filter(s => (s.semester ?? 1) === 1);
            if (term1.length > 0) {
              setActiveSubjectId(term1[0].id);
            } else if (fallbackUnified.length > 0) {
              setActiveSubjectId(fallbackUnified[0].id);
            }
          });
      });
  }, []);

  // 2. Fetch Subject Lectures when activeSubjectId changes (Supabase Edge First)
  useEffect(() => {
    if (!activeSubjectId) return;
    const currentSubj = subjects.find(s => s.id === activeSubjectId);
    if (currentSubj?.doctors && currentSubj.doctors.length > 1) {
      setSelectedDoctor(currentSubj.doctors[0]);
    } else {
      setSelectedDoctor('الكل');
    }
    setIsLoadingLectures(true);

    getDirectSupabaseLectures(activeSubjectId)
      .then(data => setSubjectLectures(Array.isArray(data) ? data : []))
      .catch(err => {
        console.warn('Direct Supabase lectures failed, falling back to tunnel:', err);
        fetch(getApiUrl(`/api/subjects/${activeSubjectId}/lectures`))
          .then(res => (res.ok ? res.json() : []))
          .then(data => setSubjectLectures(Array.isArray(data) ? data : []))
          .catch(() => setSubjectLectures([]));
      })
      .finally(() => setIsLoadingLectures(false));
  }, [activeSubjectId, subjects]);


  // Robust Quiz Parser
  const parseQuizMarkdown = (md: string): QuizQuestion[] => {
    const questions: QuizQuestion[] = [];
    const sections = md.split(/(?=^##+\s+Question\s+\d+)/m);

    for (const sec of sections) {
      const trimmed = sec.trim();
      if (!trimmed.startsWith('##')) continue;

      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      const headerLine = lines[0];
      const matchNum = headerLine.match(/\d+/);
      const qNum = matchNum ? parseInt(matchNum[0]) : questions.length + 1;

      let questionLines: string[] = [];
      const options: string[] = [];
      let correctIndex = 0;
      let hint = '';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('- [ ]') || line.startsWith('- [x]') || line.startsWith('* [ ]') || line.startsWith('* [x]')) {
          const isCorrect = line.includes('[x]');
          const optText = line.replace(/^[-*]\s*\[[ x]\]\s*/, '').trim();
          if (isCorrect) correctIndex = options.length;
          options.push(optText);
        } else if (line.startsWith('**Hint:**') || line.startsWith('> Hint:') || line.startsWith('Hint:')) {
          hint = line.replace(/^\*\*Hint:\*\*|^>\s*Hint:|^Hint:\s*/i, '').trim();
        } else if (options.length === 0) {
          questionLines.push(line);
        }
      }

      const questionBody = questionLines.join(' ').trim();

      if (options.length > 0) {
        // Dynamic Shuffle: Randomize options to eliminate positional bias (where option A is always correct)
        const items = options.map((opt, idx) => ({ opt, isCorrect: idx === correctIndex }));
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }

        questions.push({
          number: qNum,
          question: questionBody || `السؤال رقم ${qNum}`,
          options: items.map(it => it.opt),
          correctIndex: items.findIndex(it => it.isCorrect),
          hint
        });
      }
    }

    return questions;
  };

  // Robust Flashcards Parser
  const parseFlashcardsMarkdown = (md: string): Flashcard[] => {
    const cards: Flashcard[] = [];
    const cleanContent = (str: string) => {
      try {
        const match = str.match(/'content':\s*'([^']+)'/);
        if (match) return match[1];
        const matchDbl = str.match(/"content":\s*"([^"]+)"/);
        if (matchDbl) return matchDbl[1];
        return str.replace(/['"{}\[\]]/g, '').trim();
      } catch {
        return str;
      }
    };

    const sections = md.split(/(?=^##+\s+Card\s+\d+)/m);
    for (const sec of sections) {
      if (!sec.trim().startsWith('##')) continue;
      const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
      let question = '';
      let answer = '';

      for (const line of lines) {
        if (line.startsWith('**Q:**')) {
          question = cleanContent(line.replace('**Q:**', ''));
        } else if (line.startsWith('**A:**')) {
          answer = cleanContent(line.replace('**A:**', ''));
        }
      }

      if (question && answer) {
        cards.push({ question, answer });
      }
    }
    return cards;
  };

  // 3. Open Lecture Modal and fetch bundle details (Supabase Edge First)
  const openLecture = async (lectureId: number) => {
    setIsLoadingBundle(true);
    setIsPlaying(false);
    setActiveTab('audio');
    setUserAnswers({});
    setShowHints({});
    setScore(null);
    setQuizQuestions([]);
    setGuideText('');
    setFlashcards([]);
    setIsGeneratingPdf(false);
    setPdfError(null);

    try {
      let bundle: any = null;
      try {
        bundle = await getDirectSupabaseBundle(lectureId, getApiBaseUrl());
      } catch (err) {
        console.warn('Direct Supabase bundle fetch failed, falling back to tunnel:', err);
        const res = await fetch(getApiUrl(`/api/lectures/${lectureId}`));
        if (res.ok) bundle = await res.json();
      }

      if (bundle && bundle.assets) {
        setActiveBundle(bundle);

        // Instant Parse if content_text is cached directly in Supabase
        const quizAsset = bundle.assets.find((a: any) => a.asset_type === 'quiz_md');
        if (quizAsset) {
          if (quizAsset.content_text) {
            setQuizQuestions(parseQuizMarkdown(quizAsset.content_text));
          } else if (quizAsset.stream_url) {
            fetch(getApiUrl(quizAsset.stream_url))
              .then(r => r.text())
              .then(text => setQuizQuestions(parseQuizMarkdown(text)))
              .catch(console.error);
          }
        }

        const guideAsset = bundle.assets.find((a: any) => a.asset_type === 'study_guide_md');
        if (guideAsset) {
          if (guideAsset.content_text) {
            setGuideText(guideAsset.content_text);
          } else if (guideAsset.stream_url) {
            fetch(getApiUrl(guideAsset.stream_url))
              .then(r => r.text())
              .then(text => setGuideText(text))
              .catch(console.error);
          }
        }

        const cardsAsset = bundle.assets.find((a: any) => a.asset_type === 'flashcards_md');
        if (cardsAsset) {
          if (cardsAsset.content_text) {
            setFlashcards(parseFlashcardsMarkdown(cardsAsset.content_text));
          } else if (cardsAsset.stream_url) {
            fetch(getApiUrl(cardsAsset.stream_url))
              .then(r => r.text())
              .then(text => setFlashcards(parseFlashcardsMarkdown(text)))
              .catch(console.error);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching lecture bundle:', e);
    } finally {
      setIsLoadingBundle(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const seekRelative = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
  };

  const handleSpeedChange = (speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleDownloadFile = async (url: string, fallbackFilename: string, assetIdentifier: number | string) => {
    if (downloadingAssetId !== null) return;
    setDownloadingAssetId(assetIdentifier);
    setPdfError(null);
    try {
      const fullUrl = getApiUrl(url);
      const res = await fetch(fullUrl);
      if (!res.ok) {
        let errorMsg = 'تعذر تحميل الملف حالياً. يرجى المحاولة لاحقاً.';
        try {
          const errData = await res.json();
          if (errData?.detail) errorMsg = errData.detail;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      let filename = fallbackFilename;
      const disposition = res.headers.get('Content-Disposition');
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
          try {
            filename = decodeURIComponent(utf8Match[1]);
          } catch (_) {}
        } else {
          const basicMatch = disposition.match(/filename="([^"]+)"/i);
          if (basicMatch && basicMatch[1]) {
            filename = basicMatch[1];
          }
        }
      }

      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }

      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Keep blob URL alive for 60 seconds so browser download manager finishes saving without revoking early
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          window.URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }, 60000);
    } catch (err: any) {
      console.error('File download error:', err);
      // Fallback: trigger direct window open
      try {
        const directUrl = getApiUrl(url);
        window.open(directUrl, '_blank', 'noopener,noreferrer');
      } catch (_) {
        setPdfError(err.message || 'حدث خطأ أثناء تحميل الملف');
      }
    } finally {
      setDownloadingAssetId(null);
    }
  };

  const handleDownloadStudyGuidePdf = () => {
    if (!studyGuideAsset || downloadingAssetId !== null) return;
    const defaultName = activeBundle
      ? `المحاضرة ${activeBundle.lecture_num} - ملخص المذاكرة والزتونة.pdf`
      : `study_guide_${studyGuideAsset.id}.pdf`;
    handleDownloadFile(`/api/study-guides/${studyGuideAsset.id}/pdf`, defaultName, 'study-guide');
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter subjects by selected semester and search query (name, canonical doctor, or doctor track)
  const semesterSubjects = subjects.filter(s => (s.semester ?? 1) === selectedSemester);
  const filteredSubjects = semesterSubjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.canonicalDoctor && s.canonicalDoctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.doctors && s.doctors.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const audioAsset = activeBundle?.assets.find(a => a.asset_type === 'audio');
  const videoAsset = activeBundle?.assets.find(a => a.asset_type === 'video');
  const isAudioReady = Boolean(audioAsset && (audioAsset.has_telegram || audioAsset.telegram_message_id));
  const isVideoReady = Boolean(videoAsset && (videoAsset.has_telegram || videoAsset.telegram_message_id));
  const originalPdfAssets = (activeBundle?.assets || []).filter(
    (a) =>
      (a.asset_type === 'original_pdf' || a.asset_type === 'pdf') &&
      isAssetStorageAvailable(a)
  );
  const sortedOriginalPdfs = [...originalPdfAssets].sort((a, b) => {
    const isBookA = /كتاب/i.test(a.title || '');
    const isBookB = /كتاب/i.test(b.title || '');
    if (!isBookA && isBookB) return -1;
    if (isBookA && !isBookB) return 1;
    return 0;
  });
  const studyGuideAsset = (activeBundle?.assets || []).find(
    (a) => a.asset_type === 'study_guide_md'
  );
  const isGuideReady = Boolean(
    studyGuideAsset && (studyGuideAsset.content_text?.trim() || guideText.trim())
  );


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
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
      className="min-h-screen flex flex-col transition-colors duration-200"
    >
      
      {/* Top Academic Header */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--card-shadow)',
        }}
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[4rem] sm:min-h-[5rem] py-2.5 flex items-center justify-between gap-2.5 sm:gap-4">
          
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div
              style={{
                backgroundColor: isGirls 
                  ? (isDark ? 'rgba(255, 101, 132, 0.2)' : '#FFE4EC') 
                  : (isDark ? 'rgba(45, 212, 191, 0.15)' : '#E6F4F1'),
                borderColor: isGirls 
                  ? (isDark ? 'rgba(255, 101, 132, 0.4)' : '#F2CBD5') 
                  : (isDark ? 'rgba(45, 212, 191, 0.35)' : '#B2DFDB'),
              }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center shadow-sm shrink-0"
            >
              {isGirls ? (
                <span className="text-xl sm:text-2xl">🎀</span>
              ) : (
                <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: 'var(--accent-primary)' }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-xl tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                  {isGirls ? 'منصة المنهج 🎀' : 'منصة المنهج'}
                </h1>
                <span
                  style={{
                    backgroundColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.15)' : '#FFF0F3') : (isDark ? 'rgba(45, 212, 191, 0.15)' : '#E6F4F1'),
                    borderColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.35)' : '#F4D7DE') : (isDark ? 'rgba(45, 212, 191, 0.35)' : '#B2DFDB'),
                    color: isGirls ? (isDark ? '#FFA0B5' : '#C46D82') : (isDark ? '#2DD4BF' : '#184E4E'),
                  }}
                  className="hidden md:inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full border shrink-0"
                >
                  {isGirls ? "🎀 You're Just A Baby Girl" : 'نسخة الشباب'}
                </span>
              </div>
              <p className="text-[11px] sm:text-sm font-medium mt-0.5 leading-snug whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                <span className="xs:hidden">تربية بني سويف • رياضيات</span>
                <span className="hidden xs:inline sm:hidden">تربية بني سويف • تانية رياضيات</span>
                <span className="hidden sm:inline">{isGirls ? 'كلية التربية • الفرقة الثانية • شعبة رياضيات 🌸' : 'كلية التربية • الفرقة الثانية • شعبة رياضيات'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <section
        style={{ borderColor: 'var(--border-subtle)' }}
        className="relative overflow-hidden pt-6 pb-8 sm:pt-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b"
      >
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4 sm:space-y-6">
          {isGirls && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: isDark ? 'rgba(255, 101, 132, 0.35)' : '#F4D7DE',
                color: 'var(--accent-primary)',
                boxShadow: 'var(--card-shadow)',
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full border text-[11px] sm:text-sm font-bold shadow-sm max-w-full flex-wrap justify-center"
            >
              <span className="text-sm">🎀</span>
              <span>مساحتك الرايقة وكل الدلع ليكي • You&apos;re Just A Baby Girl ✨</span>
            </div>
          )}

          <h2
            className="fluid-h1 font-black tracking-tight leading-snug max-w-4xl mx-auto"
            style={{ color: 'var(--text-primary)' }}
          >
            {isGirls
              ? 'محاضرات الرياضة مشروحة بروقان.. كويزات ونوتس كيوت تظبطلك المذاكرة 🌸'
              : 'محاضرات الرياضة مشروحة باحتراف.. ريكوردات وفيديوهات وشرح لكل تفصيلة'}
          </h2>

          <p
            className="fluid-body max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isGirls
              ? 'شرح هادي ومبسط يفهمك كل مسألة خطوة بخطوة، مع كويزات كيوت وكروت ونوتس تلملك المنهج وإنتي رايقة ومرتاحة خالص 🎀✨'
              : 'شرح هندسي عميق يفهمك أصل القوانين خطوة بخطوة، مع كويزات وكروت مراجعة وزتونة تلملك المنهج في وقت قياسي'}
          </p>

          <div className="max-w-md mx-auto relative pt-1 sm:pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isGirls ? 'ابحثي عن أي مادة أو دكتور... 🌸 (مثلاً: د/ سيد، هندسة تفاضلية، د/ مروة...)' : 'ابحث عن أي مادة أو دكتور... (مثلاً: د/ سيد، هندسة تفاضلية، د/ حسين...)'}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: isGirls ? (isDark ? 'rgba(255, 101, 132, 0.35)' : '#F2CBD5') : 'var(--border-prominent)',
                color: 'var(--text-primary)',
              }}
              className="w-full pr-11 pl-4 py-3 sm:py-4 rounded-2xl text-sm sm:text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute right-4 top-[20px] sm:top-[26px] pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        
        {/* Subjects Grid & Semester Selector */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                {isGirls && <span className="text-2xl">🌸</span>}
                <span>
                  {selectedSemester === 1 ? 'مواد الترم الأول' : 'مواد الترم الثاني'} ({filteredSubjects.length} {filteredSubjects.length === 1 ? 'مادة' : 'مواد'})
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
              className="inline-flex items-center p-1 rounded-2xl border self-start sm:self-auto shadow-sm"
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
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <span>الترم الأول</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
                  {subjects.filter(s => (s.semester ?? 1) === 1).length}
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
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <span>الترم الثاني</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
                  {subjects.filter(s => (s.semester ?? 1) === 2).length}
                </span>
              </button>
            </div>
          </div>

          {filteredSubjects.length === 0 ? (
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
                  ? 'لم يتم العثور على مقررات مطابقة للبحث'
                  : selectedSemester === 2 
                    ? 'مقررات الترم الثاني قيد الإعداد والتجهيز'
                    : 'لا توجد مقررات دراسية متاحة حالياً'}
              </h4>
              <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {searchQuery
                  ? 'يرجى تجربة كلمات بحث أخرى أو التأكد من اختيار الترم الصحيح أعلاه.'
                  : selectedSemester === 2
                    ? 'سيتم إدراج المحاضرات والملخصات ومصادر الذكاء الاصطناعي للفصل الدراسي الثاني قريباً فور اعتمادها.'
                    : 'يرجى مراجعة لوحة الإدارة لإضافة المقررات الدراسية.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Mobile Swipe Hint */}
              <div className="flex md:hidden items-center justify-between text-xs font-semibold px-1 mb-2.5" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <span>اسحب المقررات أفقياً</span>
                  <span className="text-[11px] opacity-75">↔</span>
                </span>
                <span className="text-[11px] opacity-80">{filteredSubjects.length} مادة</span>
              </div>

              <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] overflow-x-auto md:overflow-x-visible overscroll-x-contain touch-pan-x snap-x snap-mandatory gap-2.5 pb-2.5 pt-1 md:py-0 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rail-courses-mobile">
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
                      className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer group w-[138px] xs:w-[150px] sm:w-[165px] md:w-auto shrink-0 snap-start ${
                        isActive 
                          ? 'ring-2 ring-cyan-500/40' 
                          : 'sm:hover:scale-[1.01]'
                      }`}
                    >
                      {/* Active sticker tag: Girls or Boys */}
                      {isActive && (
                        <div className="absolute -top-2 right-2.5 z-10">
                          <span
                            className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 tracking-wide"
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
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border shadow-sm flex items-center justify-center text-[9px] select-none leading-none pointer-events-none"
                              style={{
                                backgroundColor: isDark ? '#28162F' : '#FFFFFF',
                                borderColor: isDark ? `${activeGlowColor}80` : '#F2CBD5',
                              }}
                            >
                              {activeCharm}
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {sub.name}
                        </h4>
                        {sub.canonicalDoctor && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md mt-1 truncate max-w-full border"
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
                      <div className="mt-2.5 flex items-center justify-between text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span 
                          className="font-semibold truncate max-w-[85px] sm:max-w-none text-[10px] sm:text-xs" 
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
              className="p-6 sm:p-8 rounded-3xl border transition-colors"
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3">
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: activeSubjectGlow }}>
                        {isGirls ? '🌸 المادة اللي اخترتيها يا شطورة' : 'المقرر المختار'}
                      </span>
                      {activeSubject?.canonicalDoctor && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
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
                    <h3 className="text-2xl sm:text-3xl font-black mt-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <span>{activeSubject?.name || content.lecturesSection.defaultPrompt}</span>
                      {isGirls && <span className="text-xl">✨</span>}
                    </h3>
                  </div>
                </div>
                <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  {isGirls && <span>☕</span>}
                  <span>متاح {displayedLectures.length} محاضرات</span>
                  {isGirls && <span>بروقان</span>}
                </div>
              </div>

              {/* Doctor / Professor Tracks Switcher */}
              {activeSubject?.doctors && activeSubject.doctors.length > 1 && (
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                  {activeSubject.doctors.map((doc) => {
                    const isSelected = selectedDoctor === doc;
                    const count = subjectLectures.filter(l => l.doctor === doc).length;
                    return (
                      <button
                        key={doc}
                        type="button"
                        onClick={() => setSelectedDoctor(doc)}
                        className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          color: isSelected ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)'
                        }}
                      >
                        <span>{doc.includes('مروة') ? '👩‍🏫' : '👨‍🏫'}</span>
                        <span>{doc}</span>
                        <span className="opacity-70 text-xs font-mono">({count})</span>
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
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <div
                    style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  >
                    <GraduationCap className="w-8 h-8 opacity-60" />
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{content.lecturesSection.emptyTitle}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{content.lecturesSection.emptySubtitle}</p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4 sm:gap-5">
                  {displayedLectures.map((lec) => {
                    const isReady = lec.is_ready !== undefined ? lec.is_ready : (lec.status === 'completed' && (lec.study_resources_count || lec.assets_count) > 0);
                    const resourceCount = lec.study_resources_count !== undefined ? lec.study_resources_count : lec.assets_count;
                      return (
                        <div
                          key={lec.id}
                          onClick={isReady ? () => openLecture(lec.id) : undefined}
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: isReady ? 'var(--border-subtle)' : 'var(--border-prominent)',
                          }}
                          className={`p-6 rounded-3xl border transition-all flex flex-col justify-between shadow-sm ${
                            isReady 
                              ? 'cursor-pointer group hover:border-cyan-500 hover:shadow-md' 
                              : 'opacity-85 select-none'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-start gap-4">
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
                                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border shadow-md"
                              >
                                {isGirls ? `🌸 ${lec.lecture_num}` : lec.lecture_num}
                              </div>
                              <div>
                                {lec.doctor && (
                                  <div className="mb-1.5">
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border"
                                      style={{
                                        backgroundColor: lec.doctor.includes('مروة') ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                        borderColor: lec.doctor.includes('مروة') ? 'rgba(236, 72, 153, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                                        color: lec.doctor.includes('مروة') ? '#ec4899' : '#3b82f6',
                                      }}
                                    >
                                      {lec.doctor.includes('مروة') ? '👩‍🏫' : '👨‍🏫'} {lec.doctor} {isGirls ? '🌸' : ''}
                                    </span>
                                  </div>
                                )}
                                <h4 className="font-extrabold text-lg sm:text-xl transition-colors group-hover:text-cyan-500 dark:group-hover:text-cyan-400" style={{ color: 'var(--text-primary)' }}>
                                  {lec.title}
                                </h4>
                                <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
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
                                title={lec.has_audio ? 'بودكاست صوتي متاح' : 'البودكاست قيد التجهيز'}
                              >
                                <Headphones className="w-4 h-4" />
                                <span className="hidden sm:inline">{isGirls ? 'بودكاست 🌸' : 'بودكاست'}</span>
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
                                className="mr-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                                style={{
                                  backgroundColor: isReady ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                                  borderColor: isReady ? 'var(--border-prominent)' : 'var(--border-subtle)',
                                  color: isReady ? 'var(--accent-primary)' : 'var(--text-muted)'
                                }}
                              >
                                {resourceCount > 0 ? `${resourceCount}/5 مصادر` : 'قيد الإنتاج'}
                              </span>
                            </div>

                            <button
                              disabled={!isReady}
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
                            </button>
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

      {/* Complete Lecture Modal */}
      {activeBundle && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveBundle(null);
              if (audioRef.current) audioRef.current.pause();
            }
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
            className="w-full max-w-4xl max-w-full h-[94dvh] sm:h-auto sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl border sm:border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 mx-auto overscroll-contain"
          >
            {/* Mobile Sheet Drag Indicator */}
            <div className="w-12 h-1 bg-slate-400/30 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0"></div>
            
            {/* Modal Header */}
            <div
              className="px-4 py-3 sm:p-6 border-b flex items-center justify-between gap-3 shrink-0"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff'),
                  }}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base shadow-sm shrink-0"
                >
                  {isGirls ? `🌸 ${activeBundle.lecture_num}` : activeBundle.lecture_num}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--accent-primary)' }}>
                      {activeBundle.subject_name}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {isGirls ? 'جاهزة ومية مية 🎀' : 'المحاضرة متاحة'}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-2xl font-black mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeBundle.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveBundle(null);
                  if (audioRef.current) audioRef.current.pause();
                }}
                className="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800/80 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                style={{ color: 'var(--text-primary)' }}
                aria-label={content.modal.closeButtonAria}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original PDF Download Section (Handwritten Notes & Textbook Excerpt) */}
            {sortedOriginalPdfs.length > 0 && (
              <div
                className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs sm:text-sm shrink-0 transition-colors shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                    }}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      <span>ملفات المحاضرة الأصلية المعتمدة</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {sortedOriginalPdfs.length} {sortedOriginalPdfs.length === 1 ? 'ملف' : 'ملفات'}
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                      المصادر الرسمية المرفوعة للمحاضرة (الكشكول بخط اليد ومن الكتاب)
                    </div>
                  </div>
                </div>

                <div className="flex items-stretch sm:items-center gap-2 flex-wrap">
                  {sortedOriginalPdfs.map((pdf) => {
                    const info = getOriginalPdfDetails(pdf, activeBundle.lecture_num);
                    const isDownloading = downloadingAssetId === pdf.id;
                    return (
                      <button
                        key={pdf.id}
                        type="button"
                        onClick={() => handleDownloadFile(info.downloadUrl, info.suggestedFilename, pdf.id)}
                        disabled={downloadingAssetId !== null}
                        className={`flex-1 sm:flex-initial inline-flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
                          info.isBook
                            ? 'hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-100'
                            : 'hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-100'
                        }`}
                        title={`تحميل ${info.title} (${info.subtitle})`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">{info.badgeEmoji}</span>
                          <div className="flex flex-col text-right">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                info.isBook
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                              }`}>
                                {info.badgeText}
                              </span>
                              <span className="font-bold text-xs truncate max-w-[140px] sm:max-w-[200px]">
                                {info.title}
                              </span>
                            </div>
                            {info.subtitle && info.isBook && (
                              <span className="text-[10px] opacity-75 truncate max-w-[180px] sm:max-w-[220px]">
                                {info.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pl-0.5 shrink-0">
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <>
                              {info.formattedSize && (
                                <span className="text-[10px] font-mono opacity-65">
                                  ({info.formattedSize})
                                </span>
                              )}
                              <Download className="w-3.5 h-3.5 opacity-80 shrink-0" />
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Navigation Tabs (Horizontal Touch Swipe) */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:p-3 border-b overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x text-xs sm:text-sm font-bold shrink-0"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <button
                onClick={() => setActiveTab('audio')}
                style={{
                  backgroundColor: activeTab === 'audio' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'audio' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
              >
                <Headphones className="w-4 h-4" />
                <span>{isGirls ? '🌸 بودكاست روقان' : 'بودكاست الشرح'}</span>
              </button>

              <button
                onClick={() => setActiveTab('video')}
                style={{
                  backgroundColor: activeTab === 'video' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'video' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>{isGirls ? '🎬 فيديو الشرح' : 'فيديو الشرح'}</span>
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                style={{
                  backgroundColor: activeTab === 'quiz' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'quiz' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{isGirls ? '🧁 اختبري شطارتك' : 'كويز المحاضرة'} ({quizQuestions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                style={{
                  backgroundColor: activeTab === 'guide' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'guide' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{isGirls ? '🎀 النوتس والزتونة' : 'الدليل والزتونة'}</span>
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                style={{
                  backgroundColor: activeTab === 'flashcards' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'flashcards' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2.5 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>{isGirls ? '🪞 فلاش كاردز' : 'كروت المراجعة'} ({flashcards.length})</span>
              </button>
            </div>

            {/* Modal Body Panels */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 overscroll-contain touch-pan-y">
              
              {/* TAB 1: AUDIO PODCAST PLAYER */}
              {activeTab === 'audio' && (
                <div className="space-y-5 max-w-2xl mx-auto py-2 sm:py-4">
                  {isAudioReady && audioAsset ? (
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                        boxShadow: 'var(--card-shadow)',
                      }}
                      className="p-5 sm:p-10 rounded-2xl sm:rounded-3xl border text-center space-y-5 sm:space-y-6"
                    >
                      <audio
                        ref={audioRef}
                        src={getApiUrl(audioAsset.stream_url)}
                        onTimeUpdate={() => {
                          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                        }}
                        onLoadedMetadata={() => {
                          if (audioRef.current) setDuration(audioRef.current.duration);
                        }}
                        onEnded={() => setIsPlaying(false)}
                        onError={(e) => {
                          console.error("Audio playback error:", e);
                          fetch(getApiUrl('/api/diagnostics/client-log'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              level: 'ERROR',
                              message: `Audio playback error for asset ${audioAsset.id}`,
                              context: { lectureId: activeBundle.id, streamUrl: audioAsset.stream_url }
                            })
                          }).catch(() => {});
                        }}
                      />

                      <div
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: '#ffffff',
                        }}
                        className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full flex items-center justify-center shadow-xl"
                      >
                        <Headphones className="w-10 h-10 sm:w-14 sm:h-14" />
                      </div>

                      <div>
                        <h4 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                          {audioAsset.title}
                        </h4>
                        <p className="text-sm font-medium mt-1.5" style={{ color: 'var(--text-muted)' }}>
                          {content.audioTab.descriptionFormat.replace('{size}', (((audioAsset.file_size_bytes || 0) / (1024*1024)).toFixed(1)))}
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCurrentTime(val);
                            if (audioRef.current) audioRef.current.currentTime = val;
                          }}
                          className="w-full accent-blue-600 cursor-pointer h-2.5 rounded-lg"
                        />
                        <div className="flex justify-between text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-6">
                        <button
                          onClick={() => seekRelative(-10)}
                          title={content.audioTab.rewindTitle}
                          className="p-3.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <RotateCcw className="w-6 h-6" />
                        </button>

                        <button
                          onClick={togglePlay}
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: '#ffffff',
                          }}
                          className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 translate-x-0.5" />}
                        </button>

                        <button
                          onClick={() => seekRelative(10)}
                          title={content.audioTab.forwardTitle}
                          className="p-3.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <RotateCw className="w-6 h-6" />
                        </button>
                      </div>

                      <div
                        className="pt-5 border-t flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{content.audioTab.speedLabel}</span>
                        {[1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSpeedChange(s)}
                            style={{
                              backgroundColor: playbackSpeed === s ? 'var(--accent-primary)' : 'var(--bg-surface)',
                              color: playbackSpeed === s ? '#ffffff' : 'var(--text-secondary)',
                              borderColor: 'var(--border-subtle)',
                            }}
                            className="px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer"
                          >
                            {s}x
                          </button>
                        ))}
                      </div>

                      {audioAsset.telegram_message_id && (
                        <div className="pt-4 flex justify-center">
                          <a
                            href={`https://t.me/c/4453609138/${audioAsset.telegram_message_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: '#229ED9',
                              color: '#ffffff',
                            }}
                          >
                            <span>فتح واستماع في تطبيق تليجرام ✈️</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                      <div 
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border shadow-sm"
                        style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                      >
                        <Headphones className="w-8 h-8 opacity-40 text-cyan-500 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
                          بودكاست الشرح قيد المعالجة السحابية ⏳
                        </h4>
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          يتم تسجيل ومزامنة الصوت لهذه المحاضرة على السحابة. يمكنك حالياً دراسة محتوى المحاضرة كاملاً عبر الكويز التفاعلي والدليل والزتونة.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => setActiveTab('quiz')}
                          className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm text-white"
                          style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                        >
                          كويز المحاضرة 🎯
                        </button>
                        <button
                          onClick={() => setActiveTab('guide')}
                          className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                          الدليل الدراسي والزتونة 📖
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VIDEO EXPLAINER PLAYER */}
              {activeTab === 'video' && (
                <div className="space-y-4">
                  {isVideoReady && videoAsset ? (
                    <div
                      style={{
                        backgroundColor: '#000000',
                        borderColor: 'var(--border-subtle)',
                        boxShadow: 'var(--card-shadow)',
                      }}
                      className="rounded-3xl overflow-hidden border"
                    >
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={getApiUrl(videoAsset.stream_url)}
                        className="w-full max-h-[500px]"
                        onError={(e) => {
                          console.error("Video playback error:", e);
                          fetch(getApiUrl('/api/diagnostics/client-log'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              level: 'ERROR',
                              message: `Video playback error for asset ${videoAsset.id}`,
                              context: { lectureId: activeBundle.id, streamUrl: videoAsset.stream_url }
                            })
                          }).catch(() => {});
                        }}
                      >
                        {content.videoTab.unsupported}
                      </video>
                      <div
                        className="p-4 flex items-center justify-between text-xs font-medium"
                        style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}
                      >
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{videoAsset.title}</span>
                        <span>{content.videoTab.fileSizeFormat.replace('{size}', (((videoAsset.file_size_bytes || 0) / (1024*1024)).toFixed(1)))}</span>
                      </div>

                      {videoAsset.telegram_message_id && (
                        <div className="p-3 bg-black/40 flex justify-center border-t border-white/5">
                          <a
                            href={`https://t.me/c/4453609138/${videoAsset.telegram_message_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: '#229ED9',
                              color: '#ffffff',
                            }}
                          >
                            <span>مشاهدة وتحميل في تطبيق تليجرام 🎬</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                      <div 
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border shadow-sm"
                        style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
                      >
                        <Video className="w-8 h-8 opacity-40 text-rose-500 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
                          فيديو الشرح التفاعلي قيد المعالجة السحابية ⏳
                        </h4>
                        <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          يتم إنتاج ورندرة الفيديو التفاعلي لهذه المحاضرة سحابياً. يمكنك الاستفادة الآن من الكويز والدليل والبطاقات التعليمية المكتملة.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => setActiveTab('quiz')}
                          className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm text-white"
                          style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                        >
                          كويز المحاضرة 🎯
                        </button>
                        <button
                          onClick={() => setActiveTab('guide')}
                          className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        >
                          الدليل الدراسي والزتونة 📖
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* TAB 3: ROBUST INTERACTIVE QUIZ ENGINE WITH KATEX */}
              {activeTab === 'quiz' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {quizQuestions.length === 0 ? (
                    <div className="text-center py-16 space-y-3" style={{ color: 'var(--text-muted)' }}>
                      <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40 animate-pulse" />
                      <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isLoadingBundle ? 'جاري تجهيز وتحميل أسئلة الكويز...' : 'لم يتم العثور على أسئلة لهذا الكويز حالياً'}
                      </p>
                      {!isLoadingBundle && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => {
                              if (activeBundle && typeof activeBundle.lecture_id === 'number') {
                                openLecture(activeBundle.lecture_id);
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                            style={{
                              backgroundColor: 'var(--accent-primary)',
                              borderColor: 'var(--accent-primary)',
                              color: '#ffffff'
                            }}
                          >
                            إعادة المحاولة 🔄
                          </button>
                          <button
                            onClick={() => setActiveTab('guide')}
                            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            الانتقال للدليل والزتونة 📖
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Quiz Progress & Score Header */}
                      <div
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          boxShadow: 'var(--card-shadow)',
                        }}
                        className="p-6 rounded-3xl border space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              style={{
                                backgroundColor: 'var(--bg-surface-elevated)',
                                borderColor: 'var(--border-prominent)',
                                color: 'var(--accent-primary)',
                              }}
                              className="w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg shadow-sm"
                            >
                              {quizQuestions.length}
                            </div>
                            <div>
                              <h4 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>
                                {content.quizTab.title}
                              </h4>
                              <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {content.quizTab.progressFormat.replace('{solved}', Object.keys(userAnswers).length.toString()).replace('{total}', quizQuestions.length.toString())}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {score !== null && (
                              <div
                                style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  borderColor: 'var(--accent-emerald)',
                                  color: 'var(--accent-emerald)',
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-sm shadow-sm"
                              >
                                <Award className="w-5 h-5" />
                                <span>{content.quizTab.scoreFormat.replace('{score}', score.toString()).replace('{total}', quizQuestions.length.toString()).replace('{percent}', Math.round((score / quizQuestions.length) * 100).toString())}</span>
                              </div>
                            )}

                            {Object.keys(userAnswers).length > 0 && (
                              <button
                                onClick={() => {
                                  setUserAnswers({});
                                  setShowHints({});
                                  setScore(null);
                                  // Reshuffle options for an engaging retry challenge
                                  setQuizQuestions(prev => prev.map(q => {
                                    const items = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctIndex }));
                                    for (let i = items.length - 1; i > 0; i--) {
                                      const j = Math.floor(Math.random() * (i + 1));
                                      [items[i], items[j]] = [items[j], items[i]];
                                    }
                                    return {
                                      ...q,
                                      options: items.map(it => it.opt),
                                      correctIndex: items.findIndex(it => it.isCorrect)
                                    };
                                  }));
                                }}
                                style={{
                                  backgroundColor: 'var(--bg-surface-elevated)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--text-secondary)',
                                }}
                                className="px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer hover:border-blue-400"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{content.quizTab.retryButton}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div
                          className="w-full h-2.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
                        >
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              backgroundColor: 'var(--accent-primary)',
                              width: `${(Object.keys(userAnswers).length / quizQuestions.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Question Cards */}
                      {quizQuestions.map((q, qIdx) => {
                        const selectedOpt = userAnswers[qIdx];
                        const isAnswered = selectedOpt !== undefined;
                        const optionLabels = ['أ', 'ب', 'ج', 'د'];

                        return (
                          <div
                            key={qIdx}
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: isAnswered
                                ? selectedOpt === q.correctIndex
                                  ? 'var(--accent-emerald)'
                                  : 'var(--accent-rose)'
                                : 'var(--border-subtle)',
                              boxShadow: 'var(--card-shadow)',
                            }}
                            className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all space-y-4 sm:space-y-6"
                          >
                            {/* Question Header */}
                            <div
                              className="flex items-center justify-between gap-2 pb-3 sm:pb-4 border-b"
                              style={{ borderColor: 'var(--border-subtle)' }}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  style={{
                                    backgroundColor: 'var(--bg-surface-elevated)',
                                    borderColor: 'var(--border-prominent)',
                                    color: 'var(--accent-primary)',
                                  }}
                                  className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-bold tracking-wide shadow-sm"
                                >
                                  {content.quizTab.questionHeaderFormat.replace('{number}', q.number.toString()).replace('{total}', quizQuestions.length.toString())}
                                </span>
                                  {isAnswered && (
                                    <span
                                      style={{
                                        backgroundColor: selectedOpt === q.correctIndex ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                        color: selectedOpt === q.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                      }}
                                      className="px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold"
                                    >
                                      {selectedOpt === q.correctIndex 
                                        ? (isGirls ? 'شطورة يا بطلة! إجابة صحيحة 🎀✨' : 'إجابة صحيحة، أحسنت!') 
                                        : (isGirls ? 'حاولي تاني يا شطورة، كل غلطة بتعلمنا 🌸' : 'إجابة غير صحيحة.. راجع التلميح وحاول تاني')}
                                    </span>
                                  )}
                              </div>

                              {q.hint && (
                                <button
                                  type="button"
                                  onClick={() => setShowHints(prev => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                                  className="text-xs sm:text-sm hover:underline flex items-center gap-1.5 transition-colors font-bold cursor-pointer"
                                  style={{ color: 'var(--accent-amber)' }}
                                >
                                  <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span>{showHints[qIdx] ? content.quizTab.hideHint : content.quizTab.showHint}</span>
                                </button>
                              )}
                            </div>

                            {/* Question Statement Body with Large Bold Typography */}
                            <div
                              className="text-lg sm:text-2xl font-extrabold leading-relaxed"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <MathRenderer text={q.question} />
                            </div>

                            {/* Hint Dropdown */}
                            {showHints[qIdx] && q.hint && (
                              <div
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                  borderColor: 'var(--accent-amber)',
                                }}
                                className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border text-sm sm:text-base leading-relaxed flex items-start gap-3 animate-in fade-in"
                              >
                                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="flex-1 font-bold" style={{ color: 'var(--text-primary)' }}>
                                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{content.quizTab.hintPrefix}</span>
                                  <MathRenderer text={q.hint} />
                                </div>
                              </div>
                            )}

                            {/* Options List */}
                            <div className="space-y-3 pt-1">
                              {q.options.map((opt, optIdx) => {
                                const isSelected = selectedOpt === optIdx;
                                const isCorrect = optIdx === q.correctIndex;

                                let optStyle: React.CSSProperties = {
                                  backgroundColor: 'var(--bg-surface-elevated)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--text-primary)',
                                };

                                if (isAnswered) {
                                  if (isCorrect) {
                                    optStyle = {
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                      borderColor: 'var(--accent-emerald)',
                                      color: 'var(--text-primary)',
                                    };
                                  } else if (isSelected) {
                                    optStyle = {
                                      backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                      borderColor: 'var(--accent-rose)',
                                      color: 'var(--text-primary)',
                                    };
                                  } else {
                                    optStyle = {
                                      backgroundColor: 'var(--bg-surface)',
                                      borderColor: 'var(--border-subtle)',
                                      color: 'var(--text-muted)',
                                      opacity: 0.5,
                                    };
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={isAnswered}
                                    onClick={() => {
                                      const next = { ...userAnswers, [qIdx]: optIdx };
                                      setUserAnswers(next);
                                      let correctCount = 0;
                                      Object.entries(next).forEach(([idx, chosen]) => {
                                        if (quizQuestions[parseInt(idx)]?.correctIndex === chosen) {
                                          correctCount++;
                                        }
                                      });
                                      setScore(correctCount);
                                    }}
                                    style={optStyle}
                                    className="w-full min-h-[52px] sm:min-h-[62px] p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-right transition-all flex items-center justify-between gap-3 text-sm sm:text-lg leading-relaxed cursor-pointer shadow-sm hover:border-blue-400 active:scale-[0.99]"
                                  >
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 overflow-x-auto no-scrollbar py-0.5">
                                      <span
                                        style={{
                                          backgroundColor: isAnswered && isCorrect ? 'var(--accent-emerald)' : isAnswered && isSelected ? 'var(--accent-rose)' : 'var(--bg-surface)',
                                          borderColor: 'var(--border-prominent)',
                                          color: isAnswered && (isCorrect || isSelected) ? '#ffffff' : 'var(--text-primary)',
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 border shadow-sm"
                                      >
                                        {optionLabels[optIdx] || optIdx + 1}
                                      </span>
                                      <div className="flex-1 text-right font-bold text-sm sm:text-lg">
                                        <MathRenderer text={opt} />
                                      </div>
                                    </div>

                                    {isAnswered && isCorrect && (
                                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                                    )}
                                    {isAnswered && isSelected && !isCorrect && (
                                      <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Explanation Card upon answering */}
                            {isAnswered && (
                              <div
                                style={{
                                  backgroundColor: 'var(--bg-surface-elevated)',
                                  borderColor: 'var(--border-prominent)',
                                }}
                                className="p-5 sm:p-6 rounded-2xl border text-sm sm:text-base leading-relaxed space-y-2 animate-in fade-in shadow-sm"
                              >
                                <div className="font-extrabold flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                                  <Sparkles className="w-5 h-5" />
                                  <span>{content.quizTab.explanationTitle}</span>
                                </div>
                                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                  {q.hint ? (
                                    <MathRenderer text={q.hint} />
                                  ) : (
                                    <span>{content.quizTab.defaultExplanationFormat.replace('{letter}', optionLabels[q.correctIndex])}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FORMATTED STUDY GUIDE WITH KATEX */}
              {activeTab === 'guide' && (
                <div className="max-w-3xl mx-auto py-2 space-y-4">
                  {isGuideReady && (
                    <div
                      className="p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors shadow-sm"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            ملخص المحاضرة للمذاكرة والطباعة (PDF)
                          </div>
                          <div className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                            نسخة منسقة تشمل كافة القوانين والشروحات والأمثلة المحلولة
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleDownloadStudyGuidePdf}
                          disabled={isGeneratingPdf}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer hover:border-blue-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-prominent)',
                            color: 'var(--accent-primary)',
                          }}
                          title="تحميل ملخص المحاضرة بصيغة PDF"
                        >
                          {downloadingAssetId === 'study-guide' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
                              <span>جاري تجهيز وتحميل الملخص...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                              <span>تحميل الملخص PDF</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {sortedOriginalPdfs.length > 0 && (
                    <div
                      className="p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors shadow-sm"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                          }}
                        >
                          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            ملفات المحاضرة الأصلية المعتمدة
                          </div>
                          <div className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                            تحميل كشكول المحاضرة بخط اليد وجزء المحاضرة من الكتاب المقرر
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {sortedOriginalPdfs.map((pdf) => {
                          const info = getOriginalPdfDetails(pdf, activeBundle.lecture_num);
                          const isDownloading = downloadingAssetId === pdf.id;
                          return (
                            <button
                              key={pdf.id}
                              type="button"
                              onClick={() => handleDownloadFile(info.downloadUrl, info.suggestedFilename, pdf.id)}
                              disabled={downloadingAssetId !== null}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
                                info.isBook
                                  ? 'hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-100'
                                  : 'hover:border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-100'
                              }`}
                              title={`تحميل ${info.title}`}
                            >
                              <span>{info.badgeEmoji}</span>
                              <span>{info.title}</span>
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <>
                                  {info.formattedSize && (
                                    <span className="text-[10px] opacity-75 font-mono">
                                      ({info.formattedSize})
                                    </span>
                                  )}
                                  <Download className="w-3.5 h-3.5 opacity-80 shrink-0" />
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pdfError && (
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center justify-between gap-2">
                      <span>{pdfError}</span>
                      <button
                        type="button"
                        onClick={() => setPdfError(null)}
                        className="text-xs underline hover:no-underline font-bold"
                      >
                        إغلاق
                      </button>
                    </div>
                  )}

                  <StudyGuideViewer content={guideText} />
                </div>
              )}

              {/* TAB 5: FLASHCARDS VIEWER WITH 3D FLIP */}
              {activeTab === 'flashcards' && (
                <div className="py-2">
                  <FlashcardsViewer cards={flashcards} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
