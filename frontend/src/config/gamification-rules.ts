/**
 * Configuration for the BSU Math & AI Portal Gamification Engine.
 * All point thresholds, levels, badge criteria, and caps are defined here.
 */

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon identifier or emoji
  category: 'streak' | 'quiz' | 'media' | 'mastery';
  rarity: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export const GAMIFICATION_CONFIG = {
  timezone: 'Africa/Cairo',
  dailyXpCap: 400, // Maximum XP a student can earn in a single Cairo day (Anti-cheat)

  xp: {
    audioMilestone5Min: 5,
    audioCompleted: 25,
    videoMilestone5Min: 10,
    videoCompleted: 35,
    quizBaseCompleted: 10,
    quizMaxScoreBonus: 40,
    quizPerfectBonus: 25,
    flashcardFlip: 1,
    flashcardMaxPerDay: 20,
    flashcardDeckCompleted: 15,
    studyGuideDwell: 15,
    streakDailyBonusFactor: 10, // multiplied by min(streak, 7)
    maxStreakBonus: 70,
  },

  levelCurve: {
    baseDivisor: 60, // level = floor(sqrt(xp / 60)) + 1
    titles: [
      { minLevel: 1, maxLevel: 2, title: 'طالب طازة 🐣' },
      { minLevel: 3, maxLevel: 4, title: 'شغّال بروقان ☕' },
      { minLevel: 5, maxLevel: 6, title: 'دحيح صاعد 🚀' },
      { minLevel: 7, maxLevel: 9, title: 'وحش الرياضيات 🧠' },
      { minLevel: 10, maxLevel: 14, title: 'بروفيسور السكشن 🎓' },
      { minLevel: 15, maxLevel: Infinity, title: 'أسطورة الكلية 👑' },
    ],
  },

  badges: [
    {
      id: 'first_step',
      title: 'أول الغيث 💧',
      description: 'أكملت أول نشاط تعليمي على المنصة بنجاح!',
      icon: 'Sparkles',
      category: 'mastery',
      rarity: 'bronze',
    },
    {
      id: 'streak_3',
      title: 'ثبات المحارب 🔥',
      description: 'حافظت على سلسلة مذاكرة مستمرة لمدة 3 أيام متتالية!',
      icon: 'Flame',
      category: 'streak',
      rarity: 'bronze',
    },
    {
      id: 'streak_7',
      title: 'أسبوع ناري ⚡',
      description: '7 أيام متواصلة من الالتزام والمذاكرة بدون انقطاع!',
      icon: 'Zap',
      category: 'streak',
      rarity: 'silver',
    },
    {
      id: 'perfect_quiz',
      title: 'قنّاص الدرجات 🎯',
      description: 'قفلت كويز المحاضرة وجبت 100% من أول محاولة!',
      icon: 'Target',
      category: 'quiz',
      rarity: 'silver',
    },
    {
      id: 'night_owl',
      title: 'سهران مع فيرما 🌙',
      description: 'ذاكرت وأنجزت كويز بعد الساعة 10 بالليل!',
      icon: 'Moon',
      category: 'mastery',
      rarity: 'bronze',
    },
    {
      id: 'podcast_master',
      title: 'سمّيع الزتونة 🎧',
      description: 'سمعت 3 ريكوردات صوتية للمحاضرات كاملة للآخر!',
      icon: 'Headphones',
      category: 'media',
      rarity: 'silver',
    },
    {
      id: 'video_champion',
      title: 'رؤية ثاقبة 🎬',
      description: 'شاهدت 3 فيديوهات شرح تفاعلية بالكامل!',
      icon: 'Video',
      category: 'media',
      rarity: 'silver',
    },
    {
      id: 'deck_crusher',
      title: 'حوت الفلاش كاردز 🃏',
      description: 'أتقنت وقلبت 3 مجموعات بطاقات استذكار كاملة!',
      icon: 'Layers',
      category: 'mastery',
      rarity: 'silver',
    },
    {
      id: 'five_of_five',
      title: 'دحيح الدفعة 👑',
      description: 'ختمت محاضرة كاملة بجميع وسائطها 5/5!',
      icon: 'Award',
      category: 'mastery',
      rarity: 'gold',
    },
  ] as BadgeDefinition[],
} as const;

export type BadgeId = typeof GAMIFICATION_CONFIG.badges[number]['id'];
