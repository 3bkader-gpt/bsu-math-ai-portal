'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import katex from 'katex';
import MathRenderer from '@/components/MathRenderer';

type PersonaId = 'boys' | 'girls';
type ModeId = 'light' | 'dark';

interface ThemeDefinition {
  id: string;
  persona: PersonaId;
  mode: ModeId;
  nameArabic: string;
  nameEnglish: string;
  tagline: string;
  description: string;
  badge: string;
  vibe: string;
  colors: {
    bg: string;
    surface: string;
    primary: string;
    text: string;
    accent: string;
    border: string;
    mathCardBg: string;
    mathCardBorder: string;
    mathFormulaColor: string;
    buttonText: string;
    tagBg: string;
    tagText: string;
  };
}

const DUAL_THEMES: Record<string, ThemeDefinition> = {
  'girls-light': {
    id: 'girls-light',
    persona: 'girls',
    mode: 'light',
    nameArabic: 'نسخة البنات • كوزي روز ولاتيه الشوفان (نهاري)',
    nameEnglish: 'Girls Edition • Cozy Dusty Rose & Oat Milk',
    tagline: 'ستايل نوتس الآيباد والهايلايتر الباستيل، هادئ ومريح ويخطف القلب',
    description: 'الأقرب لقلوب البنات وروح الـ Studygram. درجات الروز البودري الهادئ (Dusty Rose #C46D82) مع حليب الشوفان الدافئ (#FAF5F0) ونصوص نبيتي عميقة جداً تجعل قراءة معادلات الرياضيات تجربة كيوت ومريحة نفسياً للأعصاب.',
    badge: '🎀 نسخة البنات (نهاري)',
    vibe: 'نوتس GoodNotes • هايلايتر باستيل • قهوة دافئة • روقان بناتي',
    colors: {
      bg: '#FAF5F0',
      surface: '#FFFFFF',
      primary: '#C46D82',
      text: '#381D26',
      accent: '#F7B299',
      border: '#F4D7DE',
      mathCardBg: '#FFF7F9',
      mathCardBorder: '#F2CBD5',
      mathFormulaColor: '#381D26',
      buttonText: '#FFFFFF',
      tagBg: '#FFF0F3',
      tagText: '#C46D82',
    },
  },
  'girls-dark': {
    id: 'girls-dark',
    persona: 'girls',
    mode: 'dark',
    nameArabic: 'نسخة البنات • ميدنايت بيري & روز مخملي (ليلي)',
    nameEnglish: 'Girls Edition • Midnight Blackberry & Glowing Rose',
    tagline: 'مذاكرة آخر الليل بنور الأباجورة الخافت، شاشة دافئة مبهرة ومريحة للعين',
    description: 'دارك مود بناتي استثنائي: ليس مجرد أسود باهت، بل درجة التوت الأسود المخملي العميق (#150F16) مع كروت مخملية ناعمة (#211422) وأزرار بلون الروز المتوهج (#E5839C) ونصوص بلون الكشمير الكريمي (#FCEEF2). راحة كاملة لعينيكي أثناء سهرات المذاكرة.',
    badge: '🌙 نسخة البنات (ليلي)',
    vibe: 'سهرات المذاكرة • أباجورة دافئة • شاي توت • راحة بصرية فائقة',
    colors: {
      bg: '#150F16',
      surface: '#211422',
      primary: '#E5839C',
      text: '#FCEEF2',
      accent: '#F9B39F',
      border: '#3E233B',
      mathCardBg: '#2A192A',
      mathCardBorder: '#4E2A49',
      mathFormulaColor: '#FDE2E8',
      buttonText: '#150F16',
      tagBg: '#341A2E',
      tagText: '#E5839C',
    },
  },
  'boys-light': {
    id: 'boys-light',
    persona: 'boys',
    mode: 'light',
    nameArabic: 'نسخة الشباب • كلاسيك أكاديميك & تيل (نهاري)',
    nameEnglish: 'Boys Edition • Oxford Forest Teal & Warm Paper',
    tagline: 'فخامة مكتبات أوكسفورد، وقار أكاديمي وتركيز مطلق',
    description: 'النسخة الشبابية الأكاديمية: ورق كلاسيكي فخم بلون الفانيليا اللاتيه المريحة للعين (#F5EFE1)، مع نصوص وأزرار بلون الأخضر التيل الغامق الوقور (#184E4E) ولمسات خشبية وذهبية عتيقة (#C8963E). مظهر رصين يعطي هيبة وتركيزاً كاملاً لمسائل الرياضيات.',
    badge: '⚡ نسخة الشباب (نهاري)',
    vibe: 'مكتبات عريقة • ورق كلاسيكي • وقار أكاديمي • تركيز عالي',
    colors: {
      bg: '#F5EFE1',
      surface: '#FFFFFF',
      primary: '#184E4E',
      text: '#162828',
      accent: '#C8963E',
      border: '#E3D7C1',
      mathCardBg: '#FAF5EA',
      mathCardBorder: '#D9C8AC',
      mathFormulaColor: '#184E4E',
      buttonText: '#FFFFFF',
      tagBg: '#FAF6ED',
      tagText: '#184E4E',
    },
  },
  'boys-dark': {
    id: 'boys-dark',
    persona: 'boys',
    mode: 'dark',
    nameArabic: 'نسخة الشباب • ستيلث تيتانيوم & زمردي تكنو (ليلي)',
    nameEnglish: 'Boys Edition • Stealth Obsidian & Cyber Emerald',
    tagline: 'ستايل المبرمجين وعشاق الرياضيات، تركيز عميق وفخامة تقنية',
    description: 'دارك مود شبابي احترافي: سواد الفضاء السحيق (#0B0F14) مع كروت تيتانيوم داكنة مقصوصة بدقة (#131922) وتحديدات تقنية، مع أزرار ولمسات بلون الزمردي السيبراني المضيء (#2DD4BF) والسماوي التكنولوجي (#38BDF8). بدون أي إجهاد للعين في سهرات المذاكرة الطويلة.',
    badge: '🌙 نسخة الشباب (ليلي)',
    vibe: 'ستيلث دارك • كود وماتريكس • فخامة تكنولوجية • تركيز ليلي فائق',
    colors: {
      bg: '#0B0F14',
      surface: '#131922',
      primary: '#2DD4BF',
      text: '#F1F5F9',
      accent: '#38BDF8',
      border: '#1E2B3A',
      mathCardBg: '#0E1724',
      mathCardBorder: '#1E3A5F',
      mathFormulaColor: '#5EEAD4',
      buttonText: '#0B0F14',
      tagBg: '#0D2625',
      tagText: '#2DD4BF',
    },
  },
};

// Real 12 subjects of Beni-Suef Faculty of Education (Math Division, 2nd Year, 1st Term)
interface SubjectItem {
  id: string;
  name: string;
  doctor: string;
  icon: string;
  isSpecial?: boolean;
}

const REAL_SUBJECTS: SubjectItem[] = [
  { id: 'diff-geom', name: 'هندسة تفاضلية', doctor: 'د/ سيد', icon: '📐' },
  { id: 'num-logic', name: 'مقدمة في نظرية العدد والمنطق', doctor: 'د/ محمد حسين', icon: '🔢' },
  { id: 'diff-eq', name: 'معادلات تفاضلية', doctor: 'د/ حسين', icon: '∫' },
  { id: 'stat-2', name: 'استاتيكا (٢)', doctor: 'د/ ايه', icon: '⚖️' },
  { id: 'dyn-2', name: 'ديناميكا (٢)', doctor: 'د/ مروة ذكري', icon: '🚀' },
  { id: 'elec-mag', name: 'كهربية ومغناطيسية وتيار متردد', doctor: 'د/ حسن سيد', icon: '⚡' },
  { id: 'phys-lab', name: 'عملي فيزياء', doctor: 'د/ سيد', icon: '🔬' },
  { id: 'ent-edu', name: 'التعليم وريادة الأعمال', doctor: 'د/ مروة + د/ وليد', icon: '💼', isSpecial: true },
  { id: 'micro-teach', name: 'تدريس مصغر', doctor: 'د/ عبدالرحمن برعي', icon: '🎓' },
  { id: 'edu-tech', name: 'تكنولوجيا التعليم', doctor: 'د/ ايمان', icon: '💻' },
  { id: 'km', name: 'إدارة المعرفة', doctor: 'د/ عزام', icon: '📚' },
  { id: 'math-phil', name: 'فلسفة وتاريخ الرياضيات', doctor: 'د/ طه ابراهيم', icon: '🏛️' },
];

export default function DesignLabPage() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('boys');
  const [selectedMode, setSelectedMode] = useState<ModeId>('dark');
  const [viewLayout, setViewLayout] = useState<'single' | 'quad'>('single');
  const [deviceFrame, setDeviceFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('diff-geom');
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isFlippedCard, setIsFlippedCard] = useState<boolean>(false);

  const activeThemeKey = `${selectedPersona}-${selectedMode}`;
  const activeTheme = DUAL_THEMES[activeThemeKey] || DUAL_THEMES['boys-dark'];
  const activeSubject = REAL_SUBJECTS.find((s) => s.id === selectedSubjectId) || REAL_SUBJECTS[0];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* 1. TOP DUAL-EDITION CONTROL BAR */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
          >
            ← العودة للمنصة
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              🧪 مختبر التصميم المزدوج <span className="text-xs font-mono font-normal text-teal-400 bg-teal-950/60 border border-teal-800/50 px-2 py-0.5 rounded-full">DUAL EDITION LAB</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              نسختين مخصصتين بالكامل: شبابي وبناتي مع دعم الدارك مود واللايت مود لكل منهما 🎨
            </p>
          </div>
        </div>

        {/* View Mode & Device Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Layout toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
            <button
              onClick={() => setViewLayout('single')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                viewLayout === 'single'
                  ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              عرض منفرد
            </button>
            <button
              onClick={() => setViewLayout('quad')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                viewLayout === 'quad'
                  ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              مقارنة الرباعية (4 في 1)
            </button>
          </div>

          {/* Device toggle (only in single mode) */}
          {viewLayout === 'single' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
              <button
                onClick={() => setDeviceFrame('desktop')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  deviceFrame === 'desktop'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🖥️</span>
                <span className="hidden md:inline">شاشة كمبيوتر</span>
              </button>
              <button
                onClick={() => setDeviceFrame('mobile')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  deviceFrame === 'mobile'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📱</span>
                <span className="hidden md:inline">موبايل</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. THE MASTER DUAL-EDITION & DARK/LIGHT SWITCHER */}
      {viewLayout === 'single' && (
        <div className="bg-[#0e1422] border-b border-slate-800 px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            {/* Persona Switcher (Boys vs Girls) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">اختر النسخة:</span>
              <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 shadow-inner">
                <button
                  onClick={() => setSelectedPersona('boys')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    selectedPersona === 'boys'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-950'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm">👨‍🎓</span>
                  <span>نسخة الشباب (Boys Edition)</span>
                </button>
                <button
                  onClick={() => setSelectedPersona('girls')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    selectedPersona === 'girls'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-950'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span className="text-sm">👩‍🎓</span>
                  <span>نسخة البنات (Girls Edition)</span>
                </button>
              </div>
            </div>

            {/* Mode Switcher (Light vs Dark) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">نمط الإضاءة:</span>
              <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 shadow-inner">
                <button
                  onClick={() => setSelectedMode('light')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    selectedMode === 'light'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span>☀️</span>
                  <span>نهاري (Light Mode)</span>
                </button>
                <button
                  onClick={() => setSelectedMode('dark')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    selectedMode === 'dark'
                      ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span>🌙</span>
                  <span>ليلي (Dark Mode)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-start">
        {viewLayout === 'single' ? (
          <div className="w-full max-w-7xl flex flex-col items-center gap-6">
            {/* Active Theme Info Card */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                      selectedPersona === 'girls'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : 'bg-teal-950/60 text-teal-300 border-teal-800/60'
                    }`}
                  >
                    {activeTheme.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeTheme.nameEnglish}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                  <span>{activeTheme.nameArabic}</span>
                </h2>
                <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                  {activeTheme.description}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 font-medium">
                  <span className="text-amber-400">✦ الأجواء:</span>
                  <span>{activeTheme.vibe}</span>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex flex-row md:flex-col items-start gap-2 bg-slate-950/90 p-4 rounded-2xl border border-slate-800/80 min-w-[210px] shrink-0">
                <div className="text-[11px] font-bold text-slate-400 mb-0.5">لوحة الألوان المعتمدة:</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.bg }} title={`الخلفية: ${activeTheme.colors.bg}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.primary }} title={`الرئيسي: ${activeTheme.colors.primary}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.surface }} title={`الكروت: ${activeTheme.colors.surface}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.accent }} title={`التمييز: ${activeTheme.colors.accent}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.text }} title={`النصوص: ${activeTheme.colors.text}`} />
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  Primary: {activeTheme.colors.primary}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Background: {activeTheme.colors.bg}
                </div>
              </div>
            </div>

            {/* 12 Subjects Selector Bar */}
            <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 shadow">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <span>📚 مواد الفرقة الثانية الـ 12 وأسماء الدكاترة:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (انقر لاختبار ظهور المادة)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  12 مقرر دراسي معتمد
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {REAL_SUBJECTS.map((sub) => {
                  const isSelected = selectedSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubjectId(sub.id);
                        setSelectedQuizAnswer(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 border ${
                        isSelected
                          ? selectedPersona === 'girls'
                            ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
                            : 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-950'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/70'
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.name}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        ({sub.doctor})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Interactive Screen Preview */}
            <div
              className={`w-full transition-all duration-300 flex justify-center ${
                deviceFrame === 'mobile' ? 'max-w-[420px]' : 'max-w-6xl'
              }`}
            >
              <div
                className={`w-full overflow-hidden transition-all duration-300 shadow-2xl ${
                  deviceFrame === 'mobile'
                    ? 'rounded-[40px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
                    : 'rounded-3xl border border-slate-700/80 shadow-2xl'
                }`}
              >
                {/* Mobile Camera notch mock */}
                {deviceFrame === 'mobile' && (
                  <div className="w-full bg-slate-800 h-6 flex items-center justify-center">
                    <div className="w-24 h-3.5 bg-black rounded-b-xl" />
                  </div>
                )}

                {/* THE LIVE THEMED PORTAL SCREEN */}
                <RenderPortalScreen
                  theme={activeTheme}
                  subject={activeSubject}
                  selectedQuizAnswer={selectedQuizAnswer}
                  setSelectedQuizAnswer={setSelectedQuizAnswer}
                  isPlayingAudio={isPlayingAudio}
                  setIsPlayingAudio={setIsPlayingAudio}
                  isFlippedCard={isFlippedCard}
                  setIsFlippedCard={setIsFlippedCard}
                  isMobile={deviceFrame === 'mobile'}
                />
              </div>
            </div>
          </div>
        ) : (
          /* 4-WAY QUAD MATRIX COMPARISON: BOYS LIGHT, BOYS DARK, GIRLS LIGHT, GIRLS DARK */
          <div className="w-full max-w-7xl flex flex-col gap-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                مقارنة رباعية شاملة: النسخة الشبابية والبناتية (نهاري وليلي)
              </h2>
              <p className="text-sm text-slate-300 max-w-3xl mx-auto">
                شاهد الأربع حالات جنباً إلى جنب بنفس بيانات المنهج الحقيقية ومعادلات د/ سيد، لتتأكد من إبهار جميع الطلاب والطالبات ليلاً ونهاراً!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {(Object.keys(DUAL_THEMES) as Array<keyof typeof DUAL_THEMES>).map((key) => {
                const theme = DUAL_THEMES[key];
                return (
                  <div
                    key={theme.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            theme.persona === 'girls'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                              : 'bg-teal-950/80 text-teal-300 border-teal-800/60'
                          }`}
                        >
                          {theme.badge}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1">
                          {theme.nameArabic}
                        </h3>
                        <p className="text-xs text-slate-400">{theme.tagline}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPersona(theme.persona);
                          setSelectedMode(theme.mode);
                          setViewLayout('single');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl text-white transition whitespace-nowrap shadow ${
                          theme.persona === 'girls'
                            ? 'bg-rose-600 hover:bg-rose-500'
                            : 'bg-teal-600 hover:bg-teal-500'
                        }`}
                      >
                        تكبير الشاشة ⤢
                      </button>
                    </div>

                    {/* Scaled Mini Screen */}
                    <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner">
                      <RenderPortalScreen
                        theme={theme}
                        subject={activeSubject}
                        selectedQuizAnswer={selectedQuizAnswer}
                        setSelectedQuizAnswer={setSelectedQuizAnswer}
                        isPlayingAudio={isPlayingAudio}
                        setIsPlayingAudio={setIsPlayingAudio}
                        isFlippedCard={isFlippedCard}
                        setIsFlippedCard={setIsFlippedCard}
                        isMobile={true}
                        compact={true}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ========================================================================= */
/* COMPONENT: RENDER THEMED PORTAL SCREEN                                    */
/* Renders the actual academic content with the chosen design language rules */
/* ========================================================================= */

interface RenderPortalScreenProps {
  theme: ThemeDefinition;
  subject: SubjectItem;
  selectedQuizAnswer: number | null;
  setSelectedQuizAnswer: (ans: number) => void;
  isPlayingAudio: boolean;
  setIsPlayingAudio: React.Dispatch<React.SetStateAction<boolean>>;
  isFlippedCard: boolean;
  setIsFlippedCard: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile?: boolean;
  compact?: boolean;
}

function RenderPortalScreen({
  theme,
  subject,
  selectedQuizAnswer,
  setSelectedQuizAnswer,
  isPlayingAudio,
  setIsPlayingAudio,
  isFlippedCard,
  setIsFlippedCard,
  isMobile = false,
  compact = false,
}: RenderPortalScreenProps) {
  const isDark = theme.mode === 'dark';
  const isGirls = theme.persona === 'girls';

  const containerBgStyle: React.CSSProperties = {
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    ['--math-formula-color' as any]: theme.colors.mathFormulaColor,
    ['--text-primary' as any]: theme.colors.text,
    ['--text-secondary' as any]: isDark ? '#CBD5E1' : '#334155',
    backgroundImage: isGirls
      ? isDark
        ? `radial-gradient(#3E233B 0.8px, transparent 0.8px)`
        : `radial-gradient(#E8B4C0 0.8px, transparent 0.8px), radial-gradient(#F7D3BC 0.8px, #FAF5F0 0.8px)`
      : isDark
      ? `radial-gradient(#1E2B3A 0.8px, transparent 0.8px)`
      : `radial-gradient(#184E4E 0.65px, transparent 0.65px)`,
    backgroundSize: isGirls ? '24px 24px' : '18px 18px',
    backgroundPosition: '0 0, 12px 12px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    boxShadow: isDark
      ? `0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 15px ${theme.colors.border}40`
      : isGirls
      ? `0 10px 25px -4px rgba(196, 109, 130, 0.12), 0 2px 6px rgba(0,0,0,0.02)`
      : `0 8px 24px -4px rgba(24, 78, 78, 0.08), 0 2px 6px rgba(0,0,0,0.02)`,
    borderRadius: isGirls ? '1.5rem' : '1.25rem',
    ['--math-formula-color' as any]: theme.colors.mathFormulaColor,
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    backgroundColor: theme.colors.primary,
    color: theme.colors.buttonText,
    borderRadius: isGirls ? '9999px' : '0.875rem',
    boxShadow: `0 4px 14px ${theme.colors.primary}55`,
    fontWeight: '700',
  };

  const mathCardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.mathCardBg,
    borderColor: theme.colors.mathCardBorder,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderRadius: '1.25rem',
    color: theme.colors.mathFormulaColor,
    ['--math-formula-color' as any]: theme.colors.mathFormulaColor,
    ['--math-block-bg' as any]: theme.colors.mathCardBg,
    ['--math-block-border' as any]: theme.colors.mathCardBorder,
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderBottom: `1.5px solid ${theme.colors.border}`,
    boxShadow: isDark
      ? '0 2px 12px rgba(0, 0, 0, 0.3)'
      : `0 2px 10px ${theme.colors.primary}10`,
    color: theme.colors.text,
  };

  return (
    <div
      dir="rtl"
      style={containerBgStyle}
      className={`${isDark ? 'dark' : ''} min-h-full w-full font-sans transition-colors duration-200 ${
        compact ? 'p-3 text-xs' : 'p-4 sm:p-7'
      }`}
    >
      {/* 1. REAL FACULTY HEADER */}
      <header
        style={headerStyle}
        className={`w-full flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-2xl transition shadow-sm`}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.buttonText,
            }}
            className={`w-9 h-9 flex items-center justify-center font-black ${
              isGirls ? 'rounded-2xl shadow-sm text-sm' : 'rounded-xl text-sm'
            }`}
          >
            {isGirls ? (isDark ? '🌙' : '🎀') : isDark ? '⚡' : '🏛️'}
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">
              جامعة بني سويف • كلية التربية (عام)
            </div>
            <div className="text-[11px] opacity-75 font-medium">
              الفرقة الثانية (الترم الأول) • شعبة رياضيات
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            style={{
              backgroundColor: theme.colors.tagBg,
              color: theme.colors.tagText,
              borderColor: `${theme.colors.primary}33`,
            }}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
          >
            {theme.badge}
          </span>
        </div>
      </header>

      {/* 2. REAL SUBJECT HERO CARD (WITH AUTHENTIC DOCTOR NAME & ASSET BADGES) */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.buttonText,
              }}
              className={`text-[11px] font-bold px-2.5 py-0.5 ${
                isGirls ? 'rounded-full' : 'rounded-lg'
              }`}
            >
              {subject.name}
            </span>
            <span className="text-xs opacity-75">المحاضرة 1</span>
          </div>
          <span
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            }}
            className="text-xs font-bold px-2.5 py-0.5 rounded-lg"
          >
            أستاذ المادة: {subject.doctor}
          </span>
        </div>

        <h3
          className={`font-black ${
            compact ? 'text-sm' : 'text-base sm:text-lg'
          } mb-1`}
        >
          {subject.id === 'diff-geom'
            ? 'مفهوم المنحنى في الفضاء وطول القوس (Curvature & Arc Length)'
            : `محتوى ومحاضرات ${subject.name} مع ${subject.doctor}`}
        </h3>
        <p className="text-sm font-semibold leading-relaxed mb-4 opacity-95">
          {subject.id === 'diff-geom'
            ? 'دراسة المعادلات البارامترية، التعبير المتجهي للمنحنيات في الفضاء ثلاثي الأبعاد، وحساب طول القوس وتفاضل البارامتر u مقابل طول القوس s مع د/ سيد.'
            : `الملخصات الشاملة، الأسئلة التدريبية والبودكاست الصوتي لمادة ${subject.name} تحت إشراف ${subject.doctor}.`}
        </p>

        {/* AUTHENTIC ASSET BADGES */}
        <div
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          className="flex flex-wrap items-center gap-2 pt-2 border-t"
        >
          <div
            style={{
              backgroundColor: theme.colors.tagBg,
              color: theme.colors.tagText,
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold"
          >
            <span>🎙️</span>
            <span>بودكاست كامل (29:40 دقيقة)</span>
          </div>
          <div
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium opacity-85"
          >
            <span>🎬</span>
            <span>فيديو شرح مرئي</span>
          </div>
          <div
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium opacity-85"
          >
            <span>📝</span>
            <span>كويز تفاعلي (10 أسئلة)</span>
          </div>
          <div
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium opacity-85"
          >
            <span>💡</span>
            <span>20 بطاقة مراجعة</span>
          </div>
          <div
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium opacity-85"
          >
            <span>📖</span>
            <span>دليل دراسي PDF</span>
          </div>
        </div>
      </div>

      {/* 3. MULTIMODAL AUDIO PLAYER (PODCAST - EXACT 29:40 MIN) */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {isGirls ? (isDark ? '🌙' : '🌸') : isDark ? '🎧' : '🎙️'}
            </span>
            <div>
              <div className="text-xs font-bold">
                بودكاست الشرح الصوتي بالعامية المصرية • {subject.doctor}
              </div>
              <div className="text-[10px] opacity-70">
                حوار تفاعلي ذكي لتبسيط المنحنيات والفرق بين المشتقة بالنسبة لـ u وطول القوس s (29:40 دقيقة)
              </div>
            </div>
          </div>
          <span
            style={{
              backgroundColor: theme.colors.tagBg,
              color: theme.colors.tagText,
              borderColor: `${theme.colors.primary}33`,
            }}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
          >
            {isGirls ? '🌸 حوار بالعامية' : '🇪🇬 صوت استوديو طبيعي'}
          </span>
        </div>

        {/* Player controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            style={buttonPrimaryStyle}
            className={`w-10 h-10 flex items-center justify-center text-sm transition-transform active:scale-95 shrink-0`}
          >
            {isPlayingAudio ? '⏸' : '▶'}
          </button>

          <div className="flex-1 space-y-1">
            <div
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }}
              className="w-full h-2 cursor-pointer rounded-full overflow-hidden"
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: isPlayingAudio ? '42%' : '14%',
                  backgroundColor: theme.colors.primary,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono opacity-70">
              <span>{isPlayingAudio ? '12:28' : '04:15'}</span>
              <span>29:40</span>
            </div>
          </div>

          <span
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            }}
            className="text-[11px] font-mono px-2 py-1 rounded opacity-80"
          >
            1.25x
          </span>
        </div>
      </div>

      {/* 4. REAL MATHEMATICAL TYPOGRAPHY & KATEX BLOCK (FROM STUDY GUIDE) */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-sm font-black flex items-center gap-1.5 text-inherit">
            <span>📐</span>
            <span>قوانين المحاضرة الأساسية (Arc Length & Differential Notation)</span>
          </h4>
          <span className="text-xs font-mono opacity-70">LaTeX KaTeX</span>
        </div>

        <p className="text-sm sm:text-[15px] font-bold leading-relaxed mb-3 text-inherit">
          <MathRenderer text={String.raw`حساب طول القوس $s$ لمنحنى فضائي معرّف بالمتجه $r(u)$ ومعدل تغيره:`} />
        </p>

        {/* The Math Box */}
        <div style={mathCardStyle} className="p-4 my-2 text-center transition">
          <div
            dir="ltr"
            className="py-1 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(
                String.raw`s = \int_{a}^{u} |\dot{r}(u)| \, du, \quad \dot{s} = \frac{ds}{du} = |\dot{r}| = \sqrt{\dot{x}^2 + \dot{y}^2 + \dot{z}^2}`,
                { displayMode: true, throwOnError: false, output: 'html' }
              ),
            }}
          />
          <div
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
            className="text-xs sm:text-sm font-bold opacity-100 mt-3 pt-2.5 border-t text-inherit leading-relaxed"
          >
            <MathRenderer
              text={String.raw`اتفاق الترميز: $\dot{r} = \frac{dr}{du}$ (تفاضل بالنسبة للبارامتر $u$)، بينما $r' = \frac{dr}{ds}$ (تفاضل بالنسبة لطول القوس $s$).`}
            />
          </div>
        </div>
      </div>

      {/* 5. REAL INTERACTIVE QUIZ CARD (QUESTION 2 FROM QUIZ.MD) */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex items-center justify-between mb-2.5">
          <span
            style={{
              backgroundColor: theme.colors.tagBg,
              color: theme.colors.tagText,
            }}
            className="text-xs font-bold px-2.5 py-0.5 rounded-md"
          >
            سؤال حقيقي من كويز المادة (Question 2)
          </span>
          <span className="text-xs font-mono opacity-70">درجة: 1.0</span>
        </div>

        <p className="text-sm sm:text-base font-extrabold leading-relaxed mb-3.5 text-inherit">
          <MathRenderer
            text={String.raw`في دراسة المنحنيات في الفراغ، إيه الفرق الأساسي بين استخدام النقطة فوق المتجه $\dot{r}$ والشرطة $r'$؟`}
          />
        </p>

        {/* Options */}
        <div className="space-y-2.5">
          {[
            {
              id: 0,
              text: String.raw`$\dot{r}$ تعبر عن المشتقة بالنسبة للبارامتر $u$، بينما $r'$ تعبر عن المشتقة بالنسبة لطول القوس $s$.`,
              isCorrect: true,
            },
            {
              id: 1,
              text: String.raw`$\dot{r}$ تعبر عن المشتقة الثانية، بينما $r'$ تعبر عن المشتقة الأولى.`,
              isCorrect: false,
            },
            {
              id: 2,
              text: String.raw`$\dot{r}$ تعبر عن التفاضل بالنسبة لطول القوس $s$، بينما $r'$ تعبر عن التفاضل بالنسبة للبارامتر $u$.`,
              isCorrect: false,
            },
          ].map((opt) => {
            const isSelected = selectedQuizAnswer === opt.id;
            let optStyle: React.CSSProperties = {};

            if (isSelected) {
              if (opt.isCorrect) {
                optStyle = {
                  backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                  borderColor: isDark ? '#10B981' : '#059669',
                  color: isDark ? '#A7F3D0' : '#065F46',
                };
              } else {
                optStyle = {
                  backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                  borderColor: '#DC2626',
                  color: isDark ? '#FECACA' : '#991B1B',
                };
              }
            } else {
              optStyle = {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: theme.colors.border,
              };
            }

            return (
              <button
                key={opt.id}
                onClick={() => setSelectedQuizAnswer(opt.id)}
                style={optStyle}
                className={`w-full text-right p-3 text-xs sm:text-sm font-bold transition flex items-center justify-between border ${
                  isGirls ? 'rounded-2xl' : 'rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    style={{
                      borderColor:
                        isSelected && opt.isCorrect
                          ? '#10B981'
                          : `${theme.colors.primary}60`,
                      color:
                        isSelected && opt.isCorrect ? '#FFFFFF' : theme.colors.primary,
                      backgroundColor:
                        isSelected && opt.isCorrect ? '#10B981' : 'transparent',
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black border shrink-0"
                  >
                    {opt.id === 0 ? 'أ' : opt.id === 1 ? 'ب' : 'ج'}
                  </span>
                  <span className="leading-relaxed">
                    <MathRenderer text={opt.text} />
                  </span>
                </div>
                {isSelected && (
                  <span className="text-xs font-black whitespace-nowrap mr-2">
                    {opt.isCorrect ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedQuizAnswer !== null && (
          <div
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }}
            className="mt-3 p-3 rounded-xl text-xs sm:text-sm font-semibold opacity-100 leading-relaxed text-inherit"
          >
            <MathRenderer
              text={String.raw`💡 **تلميح المنهج:** النقطة فوق المتجه $\dot{r}$ مخصصة لاشتقاق المتغير البارامتري $u$ (أو $t$)، بينما الشرطة $r'$ محجوزة حصراً لطول القوس $s$.`}
            />
          </div>
        )}
      </div>

      {/* 6. REAL FLASHCARD TACTILE WIDGET (CARD 1 & 2 FROM FLASHCARDS.MD) */}
      <div
        onClick={() => setIsFlippedCard(!isFlippedCard)}
        style={cardStyle}
        className={`p-4 sm:p-5 cursor-pointer transition select-none text-center`}
      >
        <div className="text-xs font-bold opacity-75 mb-1.5">
          {isGirls
            ? '🎀 بطاقة استذكار كيوت (انقري للقلب ومعرفة الإجابة) 🔄'
            : '⚡ بطاقة استذكار ذكية (انقر للقلب ومعرفة الإجابة) 🔄'}
        </div>
        {!isFlippedCard ? (
          <div className="py-2.5">
            <div className="text-xs font-bold mb-1.5 opacity-80">السؤال (الوجه الأمامي):</div>
            <div className="text-sm sm:text-base font-extrabold text-inherit leading-relaxed">
              ما هو تعريف الهندسة التفاضلية وما الفرق بين المحلية والشاملة؟
            </div>
            <div className="text-xs opacity-70 mt-2 font-medium">
              (انقر هنا لرؤية إجابة الدكتور النموذجية)
            </div>
          </div>
        ) : (
          <div className="py-2.5">
            <div
              style={{ color: isDark ? '#34D399' : '#059669' }}
              className="text-xs sm:text-sm font-black mb-1.5"
            >
              الإجابة النموذجية (د/ سيد):
            </div>
            <div className="text-xs sm:text-sm font-bold leading-relaxed text-inherit">
              هي فرع يهدف لدراسة خواص المنحنيات والسطوح بالتفاضل والتكامل.
              <br />
              <strong style={{ color: theme.colors.primary }}>المحلية:</strong> تدرس الخواص في جوار نقطة معينة.
              <br />
              <strong style={{ color: isDark ? '#34D399' : '#059669' }}>الشاملة:</strong> تدرس الخواص الكلية للمنحنيات والسطوح ككل.
            </div>
          </div>
        )}
      </div>

      {/* 7. ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-2.5 mt-5">
        <button
          style={buttonPrimaryStyle}
          className={`flex-1 py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-1.5`}
        >
          <span>{isGirls ? '🎀' : '📥'}</span>
          <span>تحميل الدليل الدراسي للمحاضرة (PDF)</span>
        </button>
        <button
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderColor: theme.colors.border,
            color: theme.colors.text,
            borderRadius: isGirls ? '9999px' : '0.875rem',
          }}
          className={`py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-1.5 border`}
        >
          <span>🎬</span>
          <span>فيديو الشرح المرئي</span>
        </button>
      </div>
    </div>
  );
}
