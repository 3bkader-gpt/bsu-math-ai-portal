/**
 * Automated Recovery Planner Engine & Workload Distribution ("Clear My Backlog")
 * 
 * Provides client-side pacing algorithms, bin-packing task allocation,
 * LocalStorage persistence, and milestone reward contracts (+50 XP Backlog Crusher).
 */

export type StudyPacingMode = 'fast' | 'standard' | 'deep';
export type StudyTaskType = 'guide' | 'audio' | 'video' | 'quiz';

export interface StudyTaskItem {
  id: string;
  lectureId: number;
  lectureNum: number;
  lectureTitle: string;
  subjectId: number;
  subjectName: string;
  taskType: StudyTaskType;
  taskTitle: string;
  taskDescription: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string;
}

export interface DailyPlanBlock {
  dayNumber: number;
  title: string;
  targetMinutes: number;
  tasks: StudyTaskItem[];
  isDayCompleted: boolean;
  isXpClaimed: boolean;
}

export interface RecoveryPlan {
  id: string;
  createdAt: string;
  targetDays: number;
  dailyMinutesBudget: number;
  pacingMode: StudyPacingMode;
  subjectId?: number;
  subjectName?: string;
  days: DailyPlanBlock[];
  totalLectures: number;
  totalTasks: number;
  completedTasksCount: number;
  totalXpClaimed: number;
  isFullyCompleted: boolean;
}

export interface PacingModeInfo {
  id: StudyPacingMode;
  title: string;
  subtitle: string;
  minutesPerLecture: number;
  icon: string;
  badge: string;
  description: string;
}

export const PACING_MODES: Record<StudyPacingMode, PacingModeInfo> = {
  fast: {
    id: 'fast',
    title: 'المسار السريع المنقذ (ميدترم)',
    subtitle: '18 دقيقة لكل محاضرة',
    minutesPerLecture: 18,
    icon: '⚡',
    badge: 'الأسرع زمناً',
    description: 'قراءة ملخص الزتونة (10 د) + حل كويز المحاضرة للتثبيت السريع (8 د). مثالي لطوارئ الامتحانات.',
  },
  standard: {
    id: 'standard',
    title: 'المسار المتوازن (بودكاست وكويز)',
    subtitle: '33 دقيقة لكل محاضرة',
    minutesPerLecture: 33,
    icon: '🎧',
    badge: 'موصى به',
    description: 'سماع البودكاست الصوتي للمحاضرة (25 د) + حل الكويز (8 د). ممتاز للمذاكرة بالسمع مع الفهم العميق.',
  },
  deep: {
    id: 'deep',
    title: 'المسار الشامل (تأسيس عميق)',
    subtitle: '48 دقيقة لكل محاضرة',
    minutesPerLecture: 48,
    icon: '🎯',
    badge: 'أعلى درجات الفهم',
    description: 'مشاهدة الفيديو (30 د) + قراءة الزتونة (10 د) + حل الكويز (8 د). للمذاكرة الشاملة بدون ثغرات.',
  },
};

export const STORAGE_KEY_PLAN = 'bsu_recovery_plan_v1';
export const DAY_COMPLETION_XP_REWARD = 50;

/**
 * Builds task items for a single lecture according to chosen pacing mode
 */
function createLectureTasks(
  lecture: { id: number; lecture_num: number; title: string; subjectId?: number; subjectName?: string },
  mode: StudyPacingMode
): StudyTaskItem[] {
  const sId = lecture.subjectId || 0;
  const sName = lecture.subjectName || 'المقرر الدراسي';
  const lNum = lecture.lecture_num;
  const lTitle = lecture.title;

  if (mode === 'fast') {
    return [
      {
        id: `plan_task_${lecture.id}_guide`,
        lectureId: lecture.id,
        lectureNum: lNum,
        lectureTitle: lTitle,
        subjectId: sId,
        subjectName: sName,
        taskType: 'guide',
        taskTitle: `قراءة زتونة المحاضرة ${lNum}`,
        taskDescription: `مراجعة الملخص الذهبي وقوانين: ${lTitle}`,
        estimatedMinutes: 10,
        completed: false,
      },
      {
        id: `plan_task_${lecture.id}_quiz`,
        lectureId: lecture.id,
        lectureNum: lNum,
        lectureTitle: lTitle,
        subjectId: sId,
        subjectName: sName,
        taskType: 'quiz',
        taskTitle: `حل كويز المحاضرة ${lNum}`,
        taskDescription: `اختبار الفهم وتثبيت النقاط الأساسية لـ: ${lTitle}`,
        estimatedMinutes: 8,
        completed: false,
      },
    ];
  }

  if (mode === 'standard') {
    return [
      {
        id: `plan_task_${lecture.id}_audio`,
        lectureId: lecture.id,
        lectureNum: lNum,
        lectureTitle: lTitle,
        subjectId: sId,
        subjectName: sName,
        taskType: 'audio',
        taskTitle: `الاستماع لبودكاست المحاضرة ${lNum}`,
        taskDescription: `شرح صوتي مبسّط ومركّز لـ: ${lTitle}`,
        estimatedMinutes: 25,
        completed: false,
      },
      {
        id: `plan_task_${lecture.id}_quiz`,
        lectureId: lecture.id,
        lectureNum: lNum,
        lectureTitle: lTitle,
        subjectId: sId,
        subjectName: sName,
        taskType: 'quiz',
        taskTitle: `حل كويز المحاضرة ${lNum}`,
        taskDescription: `تأكيد الاستيعاب وحل الأسئلة التطبيقية لـ: ${lTitle}`,
        estimatedMinutes: 8,
        completed: false,
      },
    ];
  }

  // deep mode
  return [
    {
      id: `plan_task_${lecture.id}_video`,
      lectureId: lecture.id,
      lectureNum: lNum,
      lectureTitle: lTitle,
      subjectId: sId,
      subjectName: sName,
      taskType: 'video',
      taskTitle: `مشاهدة فيديو وتطبيقات المحاضرة ${lNum}`,
      taskDescription: `متابعة الشرح التفاعلي والأمثلة لـ: ${lTitle}`,
      estimatedMinutes: 30,
      completed: false,
    },
    {
      id: `plan_task_${lecture.id}_guide`,
      lectureId: lecture.id,
      lectureNum: lNum,
      lectureTitle: lTitle,
      subjectId: sId,
      subjectName: sName,
      taskType: 'guide',
      taskTitle: `دراسة ملخص وقوانين المحاضرة ${lNum}`,
      taskDescription: `تثبيت الرموز والنظريات الأساسية لـ: ${lTitle}`,
      estimatedMinutes: 10,
      completed: false,
    },
    {
      id: `plan_task_${lecture.id}_quiz`,
      lectureId: lecture.id,
      lectureNum: lNum,
      lectureTitle: lTitle,
      subjectId: sId,
      subjectName: sName,
      taskType: 'quiz',
      taskTitle: `حل كويز المحاضرة ${lNum}`,
      taskDescription: `التطبيق العملي وحل تدريبات: ${lTitle}`,
      estimatedMinutes: 8,
      completed: false,
    },
  ];
}

/**
 * Generates an optimized recovery plan distributing backlog lectures across D days.
 */
export function generateRecoveryPlan(params: {
  uncompletedLectures: Array<{ id: number; lecture_num: number; title: string; subjectId?: number; subjectName?: string }>;
  targetDays: number;
  dailyMinutesBudget: number;
  pacingMode: StudyPacingMode;
  subjectId?: number;
  subjectName?: string;
}): RecoveryPlan {
  const { uncompletedLectures, targetDays, dailyMinutesBudget, pacingMode, subjectId, subjectName } = params;

  // 1. Sort lectures by lecture_num ascending so fundamentals are covered first
  const sorted = [...uncompletedLectures].sort((a, b) => a.lecture_num - b.lecture_num);

  // 2. Flatten into individual study tasks
  const allTasks: StudyTaskItem[] = [];
  for (const lec of sorted) {
    allTasks.push(...createLectureTasks(lec, pacingMode));
  }

  const safeDaysCount = Math.max(2, Math.min(14, targetDays));
  const days: DailyPlanBlock[] = [];

  for (let i = 1; i <= safeDaysCount; i++) {
    days.push({
      dayNumber: i,
      title: `اليوم ${i}`,
      targetMinutes: 0,
      tasks: [],
      isDayCompleted: false,
      isXpClaimed: false,
    });
  }

  // 3. Bin-pack tasks evenly across the target days
  // Group tasks by lecture so tasks belonging to the same lecture stay together where possible
  const lectureTaskGroups: Record<number, StudyTaskItem[]> = {};
  for (const task of allTasks) {
    if (!lectureTaskGroups[task.lectureId]) {
      lectureTaskGroups[task.lectureId] = [];
    }
    lectureTaskGroups[task.lectureId].push(task);
  }

  let currentDayIdx = 0;
  for (const group of Object.values(lectureTaskGroups)) {
    const groupMinutes = group.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    // If adding this lecture to current day exceeds dailyMinutesBudget by >20% and we haven't reached the last day
    const currentDayTime = days[currentDayIdx].targetMinutes;
    if (currentDayTime + groupMinutes > dailyMinutesBudget * 1.2 && currentDayIdx < safeDaysCount - 1) {
      currentDayIdx++;
    }

    days[currentDayIdx].tasks.push(...group);
    days[currentDayIdx].targetMinutes += groupMinutes;
  }

  // Filter out any trailing empty days if lectures were few
  const activeDays = days.filter(d => d.tasks.length > 0);
  if (activeDays.length === 0 && days.length > 0) {
    activeDays.push(days[0]);
  }

  const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const plan: RecoveryPlan = {
    id: planId,
    createdAt: new Date().toISOString(),
    targetDays: activeDays.length,
    dailyMinutesBudget,
    pacingMode,
    subjectId,
    subjectName,
    days: activeDays,
    totalLectures: sorted.length,
    totalTasks: allTasks.length,
    completedTasksCount: 0,
    totalXpClaimed: 0,
    isFullyCompleted: false,
  };

  return plan;
}

/**
 * Loads currently active recovery plan from LocalStorage
 */
export function loadSavedRecoveryPlan(): RecoveryPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAN);
    if (!raw) return null;
    return JSON.parse(raw) as RecoveryPlan;
  } catch {
    return null;
  }
}

/**
 * Saves or updates recovery plan in LocalStorage
 */
export function saveRecoveryPlan(plan: RecoveryPlan): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
  } catch (err) {
    console.error('Failed to save recovery plan to LocalStorage:', err);
  }
}

/**
 * Deletes existing recovery plan
 */
export function deleteSavedRecoveryPlan(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_PLAN);
  } catch {}
}

/**
 * Toggles task completion status, auto-checks day completion, and claims +50 XP
 */
export function togglePlanTask(
  plan: RecoveryPlan,
  taskId: string
): { updatedPlan: RecoveryPlan; dayJustCompleted: boolean; xpAwarded: number } {
  let dayJustCompleted = false;
  let xpAwarded = 0;

  let totalCompleted = 0;

  const nextDays = plan.days.map(day => {
    let dayTasksModified = false;

    const nextTasks = day.tasks.map(task => {
      if (task.id === taskId) {
        dayTasksModified = true;
        const nextComp = !task.completed;
        return {
          ...task,
          completed: nextComp,
          completedAt: nextComp ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    const allTasksDone = nextTasks.length > 0 && nextTasks.every(t => t.completed);
    totalCompleted += nextTasks.filter(t => t.completed).length;

    // Check if this day just achieved 100% completion
    let nextXpClaimed = day.isXpClaimed;
    if (allTasksDone && !day.isXpClaimed) {
      dayJustCompleted = true;
      nextXpClaimed = true;
      xpAwarded += DAY_COMPLETION_XP_REWARD;
    }

    return {
      ...day,
      tasks: nextTasks,
      isDayCompleted: allTasksDone,
      isXpClaimed: nextXpClaimed,
    };
  });

  const isFullyCompleted = totalCompleted >= plan.totalTasks && plan.totalTasks > 0;

  const updatedPlan: RecoveryPlan = {
    ...plan,
    days: nextDays,
    completedTasksCount: totalCompleted,
    totalXpClaimed: plan.totalXpClaimed + xpAwarded,
    isFullyCompleted,
  };

  saveRecoveryPlan(updatedPlan);

  return { updatedPlan, dayJustCompleted, xpAwarded };
}

/**
 * Exports plan as structured Arabic text ready for WhatsApp sharing
 */
export function formatPlanForWhatsApp(plan: RecoveryPlan): string {
  const dateStr = new Date(plan.createdAt).toLocaleDateString('ar-EG');
  const scopeStr = plan.subjectName ? `مقرر ${plan.subjectName}` : 'جميع المواد المتراكمة';
  const modeInfo = PACING_MODES[plan.pacingMode];

  let text = `🚀 *خطة إنقاذ وسد التراكمات - منصة بني سويف للرياضيات*\n`;
  text += `📅 تم التوليف بتاريخ: ${dateStr}\n`;
  text += `🎯 النطاق: ${scopeStr} (${plan.totalLectures} محاضرات متراكمة)\n`;
  text += `⚡ المسار: ${modeInfo.title} (${plan.dailyMinutesBudget} دقيقة يومياً)\n`;
  text += `⏱️ المدة الإجمالية: ${plan.targetDays} أيام دراسية\n\n`;
  text += `───────────────────\n`;

  plan.days.forEach(day => {
    const statusEmoji = day.isDayCompleted ? '✅' : '⏳';
    text += `${statusEmoji} *${day.title}* (المطلوب: ${day.targetMinutes} دقيقة):\n`;
    day.tasks.forEach(task => {
      const mark = task.completed ? '☑️' : '▫️';
      text += `  ${mark} ${task.taskTitle} [${task.estimatedMinutes} د]\n`;
    });
    text += `\n`;
  });

  text += `───────────────────\n`;
  text += `💪 كل يوم تخلصه بتاخد +50 XP في المنصة! استعن بالله ولا تعجز.`;

  return text;
}
