'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import MathRenderer from '@/components/MathRenderer';

// Four curated design directions
type ThemeId = 'academic-teal' | 'bauhaus-brutalist' | 'neumorphic-clay' | 'solarized-terminal';

interface ThemeDefinition {
  id: ThemeId;
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
  };
}

const THEMES: ThemeDefinition[] = [
  {
    id: 'academic-teal',
    nameArabic: 'الأكاديمي الكلاسيكي (تيل وفانيليا)',
    nameEnglish: 'Classical Academic & Vanilla Latte',
    tagline: 'فخامة الورق الأكاديمي والسبورة الخضراء العريقة',
    description: 'أعظم اختيار للمذاكرة الطويلة. خلفية بلون الفانيليا اللاتيه المريحة جداً لعين الطالب، مع نصوص وأزرار بلون الأخضر التيل الغامق ولمسات خشبية دافئة تمنع إجهاد العين أثناء قراءة البراهين الرياضية.',
    badge: 'الاختيار المقترح والأكثر وقاراً 🌟',
    vibe: 'مكتبات جامعة أوكسفورد • ورق كتب كلاسيكي • وقار أكاديمي',
    colors: {
      bg: '#F5EFE1',
      surface: '#FFFFFF',
      primary: '#184E4E',
      text: '#1B2E2E',
      accent: '#C8963E',
      border: '#E3D7C1',
    },
  },
  {
    id: 'bauhaus-brutalist',
    nameArabic: 'باوهاوس / بروتاليزم هندسي',
    nameEnglish: 'Bauhaus Math & Neo-Brutalism',
    tagline: 'خطوط هندسية قوية، حواف حادة، وثقة معمارية',
    description: 'تصميم جريء جداً مستوحى من مدرسة الباوهاوس والتصميم الهندسي. إطارات سوداء صريحة، ظلال صلبة بارزة، وألوان أساسية (أزرق ملكي، أحمر صريح، وأصفر هندسي) تجعل المعادلات وكأنها مخطط معماري دقيق.',
    badge: 'الأجرأ والأكثر عصرية وتفرداً ⚡',
    vibe: 'مخططات معمارية • أدوات رسم هندسي • كونتراست فائق',
    colors: {
      bg: '#F4F0EA',
      surface: '#FFFFFF',
      primary: '#2563EB',
      text: '#000000',
      accent: '#FF3B30',
      border: '#000000',
    },
  },
  {
    id: 'neumorphic-clay',
    nameArabic: 'الصلصال الناعم (نيومورفيك مريح)',
    nameEnglish: 'Soft Neumorphic Clay',
    tagline: 'أسطح بارزة مصبوبة من الشاشة لتقليل توتر الرياضيات',
    description: 'أزرار وكروت كأنها منحوتة في صلصال رمادي أزرق ناعم بظلال ناعمة مزدوجة. ستايل هادئ للأعصاب يقلل من رهبة المعادلات الرياضية ويجعل التجربة لمسية ومريحة جداً على شاشات الموبايل.',
    badge: 'الأهدأ للأعصاب والتجربة اللمسية ☁️',
    vibe: 'صلصال رقمي • أزرار ناعمة • إزالة توتر الامتحانات',
    colors: {
      bg: '#E0E5EC',
      surface: '#E0E5EC',
      primary: '#394867',
      text: '#212A3E',
      accent: '#E36414',
      border: 'transparent',
    },
  },
  {
    id: 'solarized-terminal',
    nameArabic: 'المعمل التقني / سولارايزد هاكر',
    nameEnglish: 'Solarized Light Hacker Terminal',
    tagline: 'مستوحى من معامل علوم الحاسب وثيمات المبرمجين العالمية',
    description: 'مستوحى من ثيم Solarized الشهير لبيئات التطوير. شبكة مربعات هندسية خفيفة في الخلفية، وسوم تقنية بدقة المونوسبيس، وألوان سيان وماجينتا محسوبة علمياً لقراءة الكود والرياضيات دون أدنى تعب.',
    badge: 'طابع المبرمجين وعلماء الرياضيات 💻',
    vibe: 'معامل MIT • ترمينال تقني • كراسة رسم بياني',
    colors: {
      bg: '#FDF6E3',
      surface: '#EEE8D5',
      primary: '#268BD2',
      text: '#073642',
      accent: '#D33682',
      border: '#93A1A1',
    },
  },
];

export default function DesignLabPage() {
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>('academic-teal');
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');
  const [deviceFrame, setDeviceFrame] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isFlippedCard, setIsFlippedCard] = useState<boolean>(false);

  const activeTheme = THEMES.find((t) => t.id === activeThemeId) || THEMES[0];

  return (
    <div className="min-h-screen bg-[#111827] text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Laboratory Bar */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
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
              🧪 مختبر التصميم الفني <span className="text-xs font-mono font-normal text-teal-400 bg-teal-950/60 border border-teal-800/50 px-2 py-0.5 rounded-full">DESIGN LAB</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              استعراض حي وتفاعلي للـ 4 توجهات الفنية لمنصة رياضيات وحاسب بني سويف
            </p>
          </div>
        </div>

        {/* View Mode & Device Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Compare toggle */}
          <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'single'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              استعراض مفصل
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                viewMode === 'compare'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              مقارنة الـ 4 معاً (Grid)
            </button>
          </div>

          {/* Device Frame Toggle (in single mode) */}
          {viewMode === 'single' && (
            <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800">
              <button
                onClick={() => setDeviceFrame('desktop')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                  deviceFrame === 'desktop'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض شاشة لابتوب / كمبيوتر"
              >
                <span>🖥️</span>
                <span className="hidden md:inline">لابتوب</span>
              </button>
              <button
                onClick={() => setDeviceFrame('mobile')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                  deviceFrame === 'mobile'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض شاشة موبايل (Mobile View)"
              >
                <span>📱</span>
                <span className="hidden md:inline">موبايل</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Quick Theme Switcher Pills (in single mode) */}
      {viewMode === 'single' && (
        <div className="bg-[#0f172a] border-b border-slate-800 px-4 sm:px-8 py-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 max-w-7xl mx-auto">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap ml-2">
              اختر التصميم:
            </span>
            {THEMES.map((theme) => {
              const isSelected = activeThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setActiveThemeId(theme.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-300 border-teal-500 shadow-md shadow-teal-950'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/30 shadow-inner"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <span>{theme.nameArabic}</span>
                  {theme.id === 'academic-teal' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                      موصى به
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Showcase Body */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-start">
        {viewMode === 'single' ? (
          <div className="w-full max-w-7xl flex flex-col items-center gap-6">
            {/* Theme Info Box */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {activeTheme.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeTheme.nameEnglish}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {activeTheme.nameArabic}
                </h2>
                <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                  {activeTheme.description}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 font-medium">
                  <span className="text-amber-400">✦ الطابع العام:</span>
                  <span>{activeTheme.vibe}</span>
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex flex-row md:flex-col items-start gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 min-w-[190px]">
                <div className="text-[11px] font-bold text-slate-400 mb-0.5">لوحة الألوان الأساسية:</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.bg }} title={`الخلفية: ${activeTheme.colors.bg}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.primary }} title={`الرئيسي: ${activeTheme.colors.primary}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.surface }} title={`الكروت: ${activeTheme.colors.surface}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.accent }} title={`التمييز: ${activeTheme.colors.accent}`} />
                  <span className="w-6 h-6 rounded-md shadow border border-white/20" style={{ backgroundColor: activeTheme.colors.text }} title={`النصوص: ${activeTheme.colors.text}`} />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Primary: {activeTheme.colors.primary}
                </div>
              </div>
            </div>

            {/* Interactive Screen Preview */}
            <div
              className={`w-full transition-all duration-300 flex justify-center ${
                deviceFrame === 'mobile' ? 'max-w-[420px]' : 'max-w-6xl'
              }`}
            >
              <div
                className={`w-full overflow-hidden transition-all duration-300 shadow-2xl ${
                  deviceFrame === 'mobile'
                    ? 'rounded-[40px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
                    : 'rounded-2xl border border-slate-700/80'
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
          /* COMPARISON GRID VIEW: ALL 4 DESIGNS SIDE-BY-SIDE */
          <div className="w-full max-w-7xl flex flex-col gap-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                مقارنة بصرية شاملة بين الـ 4 توجهات الفنية
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl mx-auto">
                قارن بين درجات التباين، مظهر المعادلات الرياضية، شكل مشغل البودكاست والكويزات، لتختار الهوية البصرية النهائية لمنصتك.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-800/60">
                        {theme.badge}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">
                        {theme.nameArabic}
                      </h3>
                      <p className="text-xs text-slate-400">{theme.tagline}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveThemeId(theme.id);
                        setViewMode('single');
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition whitespace-nowrap shadow"
                    >
                      تكبير الشاشة ⤢
                    </button>
                  </div>

                  {/* Scaled Mini Screen */}
                  <div className="rounded-xl overflow-hidden border border-slate-700/60 shadow-inner">
                    <RenderPortalScreen
                      theme={theme}
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
              ))}
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
  selectedQuizAnswer,
  setSelectedQuizAnswer,
  isPlayingAudio,
  setIsPlayingAudio,
  isFlippedCard,
  setIsFlippedCard,
  isMobile = false,
  compact = false,
}: RenderPortalScreenProps) {
  // Styles based on theme ID
  const isTeal = theme.id === 'academic-teal';
  const isBauhaus = theme.id === 'bauhaus-brutalist';
  const isNeumorphic = theme.id === 'neumorphic-clay';
  const isSolarized = theme.id === 'solarized-terminal';

  // Dynamic style tokens
  let containerBgStyle = {};
  let cardStyle = {};
  let buttonPrimaryStyle = {};
  let mathCardStyle = {};
  let headerStyle = {};

  if (isTeal) {
    // Classical Academic: Warm Vanilla Latte + Forest Teal
    containerBgStyle = {
      backgroundColor: '#F5EFE1',
      color: '#162828',
      backgroundImage: `radial-gradient(#184E4E 0.65px, transparent 0.65px)`,
      backgroundSize: '16px 16px',
    };
    cardStyle = {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E3D7C1',
      boxShadow: '0 4px 20px -2px rgba(24, 78, 78, 0.08), 0 1px 3px rgba(0,0,0,0.03)',
      borderRadius: '1.25rem',
    };
    buttonPrimaryStyle = {
      backgroundColor: '#184E4E',
      color: '#FFFFFF',
      borderRadius: '0.875rem',
      boxShadow: '0 4px 12px rgba(24, 78, 78, 0.25)',
    };
    mathCardStyle = {
      backgroundColor: '#FAF5EA',
      border: '1px solid #D9C8AC',
      borderRadius: '1rem',
      color: '#184E4E',
    };
    headerStyle = {
      backgroundColor: '#FAF6ED',
      borderBottom: '1px solid #E3D7C1',
      color: '#162828',
    };
  } else if (isBauhaus) {
    // Bauhaus Brutalist: Bold black borders, solid drop shadows
    containerBgStyle = {
      backgroundColor: '#F4F0EA',
      color: '#000000',
    };
    cardStyle = {
      backgroundColor: '#FFFFFF',
      border: '3px solid #000000',
      boxShadow: '5px 5px 0px #000000',
      borderRadius: '0px',
    };
    buttonPrimaryStyle = {
      backgroundColor: '#2563EB',
      color: '#FFFFFF',
      border: '2px solid #000000',
      boxShadow: '3px 3px 0px #000000',
      borderRadius: '0px',
      fontWeight: '800',
    };
    mathCardStyle = {
      backgroundColor: '#FFFFFF',
      border: '2px solid #000000',
      boxShadow: '3px 3px 0px #000000',
      borderRadius: '0px',
      color: '#000000',
    };
    headerStyle = {
      backgroundColor: '#FFFFFF',
      borderBottom: '3px solid #000000',
      color: '#000000',
    };
  } else if (isNeumorphic) {
    // Soft Neumorphic: Dual soft drop & inset shadows
    containerBgStyle = {
      backgroundColor: '#E0E5EC',
      color: '#212A3E',
    };
    cardStyle = {
      backgroundColor: '#E0E5EC',
      boxShadow: '9px 9px 18px #bebebe, -9px -9px 18px #ffffff',
      borderRadius: '1.75rem',
      border: 'none',
    };
    buttonPrimaryStyle = {
      backgroundColor: '#E0E5EC',
      color: '#212A3E',
      boxShadow: '5px 5px 10px #bebebe, -5px -5px 10px #ffffff',
      borderRadius: '9999px',
      fontWeight: '700',
    };
    mathCardStyle = {
      backgroundColor: '#E0E5EC',
      boxShadow: 'inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff',
      borderRadius: '1.25rem',
      border: 'none',
      color: '#212A3E',
    };
    headerStyle = {
      backgroundColor: '#E0E5EC',
      boxShadow: '0 4px 10px #bebebe',
      color: '#212A3E',
    };
  } else {
    // Solarized Terminal: Warm cream + technical grid paper
    containerBgStyle = {
      backgroundColor: '#FDF6E3',
      color: '#073642',
      backgroundImage: `linear-gradient(to right, #EEE8D5 1px, transparent 1px), linear-gradient(to bottom, #EEE8D5 1px, transparent 1px)`,
      backgroundSize: '20px 20px',
    };
    cardStyle = {
      backgroundColor: '#EEE8D5',
      border: '1px solid #93A1A1',
      boxShadow: '0 2px 8px rgba(7, 54, 66, 0.06)',
      borderRadius: '0.75rem',
    };
    buttonPrimaryStyle = {
      backgroundColor: '#268BD2',
      color: '#FDF6E3',
      borderRadius: '0.5rem',
      fontWeight: '600',
    };
    mathCardStyle = {
      backgroundColor: '#FDF6E3',
      border: '1px solid #2AA198',
      borderRadius: '0.5rem',
      color: '#073642',
    };
    headerStyle = {
      backgroundColor: '#EEE8D5',
      borderBottom: '1px solid #93A1A1',
      color: '#073642',
    };
  }

  return (
    <div
      dir="rtl"
      style={containerBgStyle}
      className={`min-h-full w-full font-sans transition-colors duration-200 ${
        compact ? 'p-3 text-xs' : 'p-4 sm:p-7'
      }`}
    >
      {/* 1. PORTAL HEADER */}
      <header
        style={headerStyle}
        className={`w-full flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-2xl transition shadow-sm`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 flex items-center justify-center font-black ${
              isBauhaus
                ? 'bg-black text-white rounded-none border-2 border-black'
                : isNeumorphic
                ? 'bg-[#E0E5EC] rounded-full shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff] text-[#394867]'
                : isTeal
                ? 'bg-[#184E4E] text-[#F5EFE1] rounded-xl'
                : 'bg-[#268BD2] text-white rounded-lg font-mono'
            }`}
          >
            Σ
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">
              جامعة بني سويف • كلية العلوم
            </div>
            <div className="text-[11px] opacity-75">
              قسم الرياضيات وعلوم الحاسب
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSolarized ? (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[#2AA198] text-[#2AA198]">
              SYS::ONLINE
            </span>
          ) : isBauhaus ? (
            <span className="text-[10px] font-black bg-[#FFD700] text-black px-2 py-0.5 border border-black">
              LIVE 2026
            </span>
          ) : (
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                isTeal
                  ? 'bg-[#184E4E]/10 text-[#184E4E]'
                  : 'bg-[#394867]/10 text-[#394867]'
              }`}
            >
              الفرقة الثالثة
            </span>
          )}
        </div>
      </header>

      {/* 2. SUBJECT HERO CARD */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 ${
                isBauhaus
                  ? 'bg-[#FF3B30] text-white rounded-none border border-black'
                  : isTeal
                  ? 'bg-[#184E4E] text-[#F5EFE1] rounded-lg'
                  : isSolarized
                  ? 'bg-[#2AA198] text-white rounded font-mono'
                  : 'bg-[#394867] text-white rounded-full'
              }`}
            >
              هندسة تفاضلية
            </span>
            <span className="text-xs opacity-75">المحاضرة 1</span>
          </div>
          <span className="text-xs font-medium opacity-80">
            أ.د. أستاذ المادة
          </span>
        </div>

        <h3
          className={`font-black ${
            compact ? 'text-sm' : 'text-base sm:text-lg'
          } mb-1`}
        >
          مفهوم المنحنى في الفضاء وطول القوس (Curvature & Arc Length)
        </h3>
        <p className="text-xs opacity-80 leading-relaxed mb-3">
          دراسة الإحداثيات الطبيعية للمنحنيات الفضائية وثلاثي فرينيه-سيريه مع تطبيقات حساب الانحناء والالتواء.
        </p>

        {/* Progress bar */}
        <div className="w-full space-y-1">
          <div className="flex justify-between text-[11px] opacity-75 font-semibold">
            <span>نسبة الاستيعاب الموصى بها</span>
            <span>85%</span>
          </div>
          <div
            className={`w-full h-2 overflow-hidden ${
              isBauhaus
                ? 'bg-slate-200 border border-black rounded-none'
                : isNeumorphic
                ? 'bg-[#E0E5EC] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] rounded-full'
                : 'bg-black/10 rounded-full'
            }`}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: '85%',
                backgroundColor: isBauhaus
                  ? '#FFD700'
                  : isTeal
                  ? '#184E4E'
                  : isSolarized
                  ? '#268BD2'
                  : '#E36414',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. MULTIMODAL AUDIO PLAYER (PODCAST) */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙️</span>
            <div>
              <div className="text-xs font-bold">
                بودكاست الشرح الصوتي بالعامية المصرية
              </div>
              <div className="text-[10px] opacity-70">
                حوار تفاعلي ذكي بين طالبين لتبسيط المفاهيم الصعبة (29 دقيقة)
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 ${
              isTeal
                ? 'bg-[#C8963E]/20 text-[#8B6419] rounded-md border border-[#C8963E]/30'
                : isBauhaus
                ? 'bg-black text-white font-mono'
                : 'opacity-80'
            }`}
          >
            🇪🇬 صوت طبيعي
          </span>
        </div>

        {/* Player controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            style={buttonPrimaryStyle}
            className={`w-10 h-10 flex items-center justify-center text-sm transition-transform active:scale-95 shrink-0 ${
              isNeumorphic && isPlayingAudio
                ? 'shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff]'
                : ''
            }`}
          >
            {isPlayingAudio ? '⏸' : '▶'}
          </button>

          <div className="flex-1 space-y-1">
            <div
              className={`w-full h-2 cursor-pointer ${
                isBauhaus
                  ? 'bg-slate-200 border border-black rounded-none'
                  : isNeumorphic
                  ? 'bg-[#E0E5EC] shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff] rounded-full'
                  : 'bg-black/10 rounded-full'
              }`}
            >
              <div
                className="h-full"
                style={{
                  width: isPlayingAudio ? '42%' : '15%',
                  backgroundColor: isBauhaus
                    ? '#2563EB'
                    : isTeal
                    ? '#184E4E'
                    : isSolarized
                    ? '#2AA198'
                    : '#394867',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono opacity-70">
              <span>{isPlayingAudio ? '12:15' : '04:20'}</span>
              <span>29:40</span>
            </div>
          </div>

          <span
            className={`text-[11px] font-mono px-2 py-1 rounded ${
              isTeal
                ? 'bg-[#FAF6EC] border border-[#E3D7C1]'
                : isBauhaus
                ? 'border border-black bg-white'
                : 'opacity-80'
            }`}
          >
            1.25x
          </span>
        </div>
      </div>

      {/* 4. MATHEMATICAL TYPOGRAPHY & KATEX BLOCK */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-extrabold flex items-center gap-1.5">
            <span>📐</span>
            <span>القوانين والمعادلات الأساسية (Frenet-Serret Formulas)</span>
          </h4>
          <span className="text-[10px] font-mono opacity-60">LaTeX KaTeX</span>
        </div>

        <p className="text-xs opacity-80 leading-relaxed mb-2">
          <MathRenderer text="لكل منحنى فضائي أملس معرّف بدلالة طول القوس $s$، ترتبط متجهات الوحدة الثلاثة بالمشتقات:" />
        </p>

        {/* The Math Box */}
        <div style={mathCardStyle} className="p-3 my-2 text-center transition">
          <MathRenderer
            block={true}
            text={
              "\\frac{d\\mathbf{T}}{ds} = \\kappa \\mathbf{N}, \\quad \\frac{d\\mathbf{N}}{ds} = -\\kappa \\mathbf{T} + \\tau \\mathbf{B}, \\quad \\frac{d\\mathbf{B}}{ds} = -\\tau \\mathbf{N}"
            }
          />
          <div className="text-[11px] font-semibold opacity-85 mt-2">
            <MathRenderer text="حيث $\kappa$ يمثل الانحناء (Curvature) و $\tau$ يمثل الالتواء (Torsion)." />
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE QUIZ CARD */}
      <div style={cardStyle} className="p-4 sm:p-5 mb-5 transition">
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 ${
              isBauhaus
                ? 'bg-[#FFD700] text-black border border-black'
                : isTeal
                ? 'bg-[#C8963E]/15 text-[#8B6419] rounded-md'
                : 'opacity-80'
            }`}
          >
            سؤال تدريبي سريع (MCQ)
          </span>
          <span className="text-[10px] font-mono opacity-60">درجة: 1.0</span>
        </div>

        <p className="text-xs font-bold leading-relaxed mb-3">
          <MathRenderer text="ما هو الشرط الضروري والكافي لكي يكون المنحنى الفضائي $\alpha(s)$ منحنى مستوياً (Planar Curve) تماماً؟" />
        </p>

        {/* Options */}
        <div className="space-y-2">
          {[
            { id: 0, text: 'أن يكون الانحناء منعدماً دائماً: $\\kappa(s) = 0$', isCorrect: false },
            { id: 1, text: 'أن يكون الالتواء منعدماً في كل نقطة: $\\tau(s) = 0$', isCorrect: true },
            { id: 2, text: 'أن يكون طول المماس ثابتاً: $\\|\\mathbf{T}\\| = 2$', isCorrect: false },
          ].map((opt) => {
            const isSelected = selectedQuizAnswer === opt.id;
            let optStyle = {};

            if (isSelected) {
              if (opt.isCorrect) {
                optStyle = {
                  backgroundColor: isBauhaus ? '#DCFCE7' : isTeal ? '#E8F5E9' : '#D1FAE5',
                  borderColor: isBauhaus ? '#000000' : '#2E7D32',
                  color: '#1B5E20',
                };
              } else {
                optStyle = {
                  backgroundColor: isBauhaus ? '#FEE2E2' : '#FFEBEE',
                  borderColor: '#C62828',
                  color: '#B71C1C',
                };
              }
            } else {
              optStyle = {
                backgroundColor: isTeal ? '#FAF6EC' : isBauhaus ? '#FFFFFF' : isNeumorphic ? '#E0E5EC' : '#FDF6E3',
                borderColor: isBauhaus ? '#000000' : isTeal ? '#E3D7C1' : 'transparent',
              };
            }

            return (
              <button
                key={opt.id}
                onClick={() => setSelectedQuizAnswer(opt.id)}
                style={optStyle}
                className={`w-full text-right p-2.5 text-xs font-medium transition flex items-center justify-between ${
                  isBauhaus
                    ? 'border-2 shadow-[2px_2px_0px_#000] rounded-none'
                    : isNeumorphic
                    ? 'rounded-xl shadow-[3px_3px_6px_#bebebe,-3px_-3px_6px_#ffffff]'
                    : isTeal
                    ? 'border rounded-xl'
                    : 'border rounded-lg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                      isSelected && opt.isCorrect
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-black/30'
                    }`}
                  >
                    {opt.id === 0 ? 'أ' : opt.id === 1 ? 'ب' : 'ج'}
                  </span>
                  <span>
                    <MathRenderer text={opt.text} />
                  </span>
                </div>
                {isSelected && (
                  <span className="text-xs font-bold">
                    {opt.isCorrect ? '✅ صحيح' : '❌ خطأ'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. FLASHCARD TACTILE WIDGET */}
      <div
        onClick={() => setIsFlippedCard(!isFlippedCard)}
        style={cardStyle}
        className={`p-4 sm:p-5 cursor-pointer transition select-none text-center ${
          isBauhaus ? 'hover:translate-x-0.5 hover:translate-y-0.5' : ''
        }`}
      >
        <div className="text-[10px] font-bold opacity-60 mb-1">
          بطاقة استذكار سريعة (انقر للقلب) 🔄
        </div>
        {!isFlippedCard ? (
          <div className="py-2">
            <div className="text-xs font-bold mb-1">السؤال (الوجه الأمامي):</div>
            <div className="text-xs font-medium">
              <MathRenderer text="ما هو تعريف متجه الوحدة العمودي الأساسي $\mathbf{N}(s)$؟" />
            </div>
          </div>
        ) : (
          <div className="py-2 animate-fadeIn">
            <div className="text-xs font-bold mb-1 text-emerald-700">الإجابة (الوجه الخلفي):</div>
            <div className="text-xs font-medium">
              هو المتجه العمودي الناتج عن اشتقاق المماس مقسوماً على الانحناء:
              <br />
              <MathRenderer text={"$\\mathbf{N}(s) = \\frac{\\mathbf{T}'(s)}{\\kappa(s)}$"} />
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
          <span>📥</span>
          <span>تحميل الدليل الدراسي (PDF)</span>
        </button>
        <button
          className={`py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            isBauhaus
              ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
              : isTeal
              ? 'bg-[#FAF6EC] text-[#184E4E] border border-[#E3D7C1] rounded-xl hover:bg-[#F2E8D5]'
              : isNeumorphic
              ? 'bg-[#E0E5EC] shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] rounded-full text-[#394867]'
              : 'border border-[#93A1A1] rounded-lg'
          }`}
        >
          <span>🎬</span>
          <span>فيديو الشرح</span>
        </button>
      </div>
    </div>
  );
}
