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
  Clock
} from 'lucide-react';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import { 
  getDirectSupabaseSubjects, 
  getDirectSupabaseLectures, 
  getDirectSupabaseBundle 
} from '@/lib/supabase';

interface Subject {
  id: number;
  name: string;
  has_prompt: boolean;
  lecture_count: number;
  doctors?: string[];
  canonicalDoctor?: string;
  icon?: string;
}

export interface CanonicalCourse {
  canonicalName: string;
  doctor: string;
  icon: string;
  aliases: string[];
  fallbackId: number;
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
  telegram_message_id?: number | null;
  content_text?: string | null;
  stream_url: string;
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

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Build Unified 12 Courses from Backend + Canonical Registry
  const mergeSubjects = (backendSubjects: any[]): Subject[] => {
    return CANONICAL_COURSES.map((course) => {
      // Find matching backend subject by aliases or fallbackId
      const found = backendSubjects.find(
        (b) =>
          course.aliases.some((a) => a.trim().toLowerCase() === (b.name || '').trim().toLowerCase()) ||
          b.id === course.fallbackId
      );

      const doctorsList = found?.doctors && found.doctors.length > 0 
        ? found.doctors 
        : (course.doctor.includes('+') ? course.doctor.split('+').map((d: string) => d.trim()) : [course.doctor]);

      return {
        id: found?.id ?? course.fallbackId,
        name: course.canonicalName,
        has_prompt: found?.has_prompt ?? true,
        lecture_count: found?.lecture_count ?? 0,
        doctors: doctorsList,
        canonicalDoctor: course.doctor,
        icon: course.icon,
      };
    });
  };

  // 1. Fetch Subjects on Mount (Supabase Edge First <100ms)
  useEffect(() => {
    getDirectSupabaseSubjects()
      .then(data => {
        const unified = mergeSubjects(data);
        setSubjects(unified);
        const diff = unified.find((s) => s.name === 'هندسة تفاضلية');
        if (diff) {
          setActiveSubjectId(diff.id);
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
            const diff = unified.find((s) => s.name === 'هندسة تفاضلية');
            if (diff) {
              setActiveSubjectId(diff.id);
            } else if (unified.length > 0) {
              setActiveSubjectId(unified[0].id);
            }
          })
          .catch(apiErr => {
            console.error('All subjects fetch failed, using offline canonical:', apiErr);
            const fallbackUnified = mergeSubjects([]);
            setSubjects(fallbackUnified);
            setActiveSubjectId(fallbackUnified[0].id);
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
        questions.push({
          number: qNum,
          question: questionBody || `السؤال رقم ${qNum}`,
          options,
          correctIndex,
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

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter subjects by search (name, canonical doctor, or doctor track)
  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.canonicalDoctor && s.canonicalDoctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.doctors && s.doctors.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const audioAsset = activeBundle?.assets.find(a => a.asset_type === 'audio');
  const videoAsset = activeBundle?.assets.find(a => a.asset_type === 'video');
  const isAudioReady = Boolean(audioAsset && (audioAsset.has_telegram || audioAsset.telegram_message_id));
  const isVideoReady = Boolean(videoAsset && (videoAsset.has_telegram || videoAsset.telegram_message_id));


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
                <span className="sm:hidden">تربية بني سويف • تانية رياضيات</span>
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
        
        {/* Subjects Grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                {isGirls && <span className="text-2xl">🌸</span>}
                <span>مواد الترم الأول ({filteredSubjects.length} مواد معتمدة)</span>
              </h3>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                {isGirls ? 'اختاري المادة واستمتعي بالمحاضرات والشرح والزتونة 🎀' : 'اختار المادة وتصفح المحاضرات والشرح والملخصات'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,155px),1fr))] gap-3 sm:gap-4">
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
                      ? (isDark ? `0 0 25px ${activeGlowColor}33, var(--card-shadow-hover)` : `0 0 20px ${activeGlowColor}22, var(--card-shadow-hover)`)
                      : 'var(--card-shadow)',
                  }}
                  className={`relative p-4 sm:p-5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer group ${
                    isActive 
                      ? 'ring-2 scale-[1.02]' 
                      : 'hover:scale-[1.01]'
                  }`}
                >
                  {/* Active sticker tag: Girls or Boys */}
                  {isActive && (
                    <div className="absolute -top-2.5 right-3 z-10">
                      <span
                        className="text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 tracking-wide"
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
                    <div className="relative w-12 h-12 mb-3">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-xl shadow-sm transition-transform duration-200 group-hover:scale-105 select-none leading-none ${
                          isDark ? activeDarkBadge : activeLightBadge
                        }`}
                      >
                        <span className="flex items-center justify-center">{sub.icon || sub.name.slice(0, 2)}</span>
                      </div>

                      {/* Floating Charm Sticker (Girls only) */}
                      {isGirls && activeCharm && (
                        <div
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border shadow-sm flex items-center justify-center text-[11px] select-none leading-none pointer-events-none"
                          style={{
                            backgroundColor: isDark ? '#28162F' : '#FFFFFF',
                            borderColor: isDark ? `${activeGlowColor}80` : '#F2CBD5',
                          }}
                        >
                          {activeCharm}
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-sm sm:text-base line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {sub.name}
                    </h4>
                    {sub.canonicalDoctor && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md mt-1.5 truncate max-w-full border"
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
                  <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span 
                      className="font-semibold" 
                      style={{ color: activeGlowColor }}
                    >
                      {activeBadgeTag}
                    </span>
                    <ChevronLeft className="w-4 h-4 opacity-70 transition-transform group-hover:-translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Subject Lectures */}
        {(() => {
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)',
            }}
            className="w-full max-w-4xl max-w-full h-[94dvh] sm:h-auto sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl border sm:border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 mx-auto"
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

            {/* Modal Navigation Tabs (Horizontal Touch Swipe) */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:p-3 border-b overflow-x-auto no-scrollbar text-xs sm:text-sm font-bold shrink-0"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <button
                onClick={() => setActiveTab('audio')}
                style={{
                  backgroundColor: activeTab === 'audio' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'audio' ? (isGirls && isDark ? '#0D0811' : (!isGirls && isDark ? '#0B0F14' : '#ffffff')) : 'var(--text-secondary)',
                }}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
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
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
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
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
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
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
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
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>{isGirls ? '🪞 فلاش كاردز' : 'كروت المراجعة'} ({flashcards.length})</span>
              </button>
            </div>

            {/* Modal Body Panels */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              
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
                <div className="max-w-3xl mx-auto py-2">
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
