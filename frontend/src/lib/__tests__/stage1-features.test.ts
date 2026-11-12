import { describe, it, expect, beforeEach } from 'vitest';
import { parseMindMapJson, countMindMapNodes } from '../lecture-utils';
import {
  buildStudyHeatmapGrid,
  getHeatmapIntensityLevel,
} from '@/modules/gamification/core/heatmap';
import {
  generateRecoveryPlan,
  reconcileRecoveryPlanWithEvent,
  mapAppEventToTaskType,
  DAY_COMPLETION_XP_REWARD,
} from '../studyPlanner';

describe('Stage 1 Feature 1.1: MindMapViewer JSON Parser', () => {
  it('parses valid hierarchical mind_map_json strings and counts nodes accurately', () => {
    const raw = JSON.stringify({
      name: 'الهندسة التفاضلية ومتجهات الوحدة',
      children: [
        {
          name: 'متجهات الوحدة الرئيسية',
          children: [
            { name: 'متجه المماس (t)', children: [{ name: "القانون: t = r' / s'" }] },
            { name: 'متجه العمودي الرئيسي (n)' },
          ],
        },
      ],
    });

    const tree = parseMindMapJson(raw);
    expect(tree).not.toBeNull();
    expect(tree?.name).toBe('الهندسة التفاضلية ومتجهات الوحدة');
    expect(tree?.children.length).toBe(1);
    expect(tree?.children[0].children.length).toBe(2);
    expect(countMindMapNodes(tree)).toBe(5);
  });

  it('handles null, empty, or malformed JSON gracefully without throwing', () => {
    expect(parseMindMapJson(null)).toBeNull();
    expect(parseMindMapJson(undefined)).toBeNull();
    expect(parseMindMapJson('')).toBeNull();
    expect(parseMindMapJson('{invalid json')).toBeNull();
    expect(parseMindMapJson({})).toBeNull();
    expect(countMindMapNodes(null)).toBe(0);
  });

  it('normalizes array roots and respects maxDepth bounds', () => {
    const rawArray = [
      { name: 'الفرع الأول', children: ['نقطة أ', 'نقطة ب'] },
      { name: 'الفرع الثاني', children: [] },
    ];
    const tree = parseMindMapJson(rawArray, 2);
    expect(tree).not.toBeNull();
    expect(tree?.children.length).toBe(2);
    expect(tree?.children[0].children.length).toBe(2);
    expect(tree?.children[0].children[0].name).toBe('نقطة أ');
  });
});

describe('Stage 1 Feature 1.2: 16-Week Study Heatmap Engine', () => {
  it('classifies daily activity into 5 intensity levels (0..4)', () => {
    expect(getHeatmapIntensityLevel(0, 0, 0)).toBe(0);
    expect(getHeatmapIntensityLevel(15, 1, 120)).toBe(1);
    expect(getHeatmapIntensityLevel(50, 2, 300)).toBe(2);
    expect(getHeatmapIntensityLevel(120, 4, 600)).toBe(3);
    expect(getHeatmapIntensityLevel(250, 7, 1200)).toBe(4);
  });

  it('builds a 16-week (112-day) grid and aggregates active days and XP', () => {
    const rows = [
      { day: '2026-11-12', xp_earned: 220, items_completed: 6, seconds_active: 1800 },
      { day: '2026-11-10', xp_earned: 45, items_completed: 2, seconds_active: 600 },
      { day: '2026-10-01', xp_earned: 15, items_completed: 1, seconds_active: 300 },
    ];

    const grid = buildStudyHeatmapGrid(rows, {
      weeksCount: 16,
      referenceDate: '2026-11-12',
    });

    expect(grid.totalDays).toBe(112);
    expect(grid.weeks.length).toBe(16);
    expect(grid.weeks.every((w) => w.days.length === 7)).toBe(true);
    expect(grid.activeDaysCount).toBe(3);
    expect(grid.totalXpInWindow).toBe(280);
    expect(grid.totalItemsInWindow).toBe(9);
    expect(grid.peakDayXp).toBe(220);

    const lastWeek = grid.weeks[15];
    const todayCell = lastWeek.days[6];
    expect(todayCell.date).toBe('2026-11-12');
    expect(todayCell.isToday).toBe(true);
    expect(todayCell.intensity).toBe(4);
  });
});

describe('Stage 1 Feature 1.4: Self-Ticking Recovery Plan Reconciler', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('maps app events to StudyTaskType accurately', () => {
    expect(mapAppEventToTaskType('study_guide.read')).toBe('guide');
    expect(mapAppEventToTaskType('quiz.finished')).toBe('quiz');
    expect(mapAppEventToTaskType('media.completed', 'audio')).toBe('audio');
    expect(mapAppEventToTaskType('media.completed', 'video')).toBe('video');
    expect(mapAppEventToTaskType('lecture.completed')).toBe('all');
    expect(mapAppEventToTaskType('flashcard.flipped')).toBeNull();
  });

  it('auto-ticks matching tasks, awards +50 XP once when a day completes, and stays idempotent', () => {
    const plan = generateRecoveryPlan({
      uncompletedLectures: [
        { id: 101, lecture_num: 1, title: 'محاضرة المتجهات', subjectId: 1, subjectName: 'هندسة' },
      ],
      targetDays: 1,
      dailyMinutesBudget: 60,
      pacingMode: 'fast', // generates 'guide' + 'quiz' for lecture 101 on Day 1
    });

    expect(plan.days.length).toBe(1);
    expect(plan.days[0].tasks.length).toBe(2);

    // 1. Complete study guide for lecture 101
    const step1 = reconcileRecoveryPlanWithEvent(plan, {
      type: 'study_guide.read',
      lectureId: 101,
    });
    expect(step1.matchedTasks.length).toBe(1);
    expect(step1.matchedTasks[0].taskType).toBe('guide');
    expect(step1.dayJustCompleted).toBe(false);
    expect(step1.xpAwarded).toBe(0);
    expect(step1.updatedPlan?.completedTasksCount).toBe(1);

    // 2. Duplicate study_guide.read event for same lecture should be a no-op
    const duplicateStep = reconcileRecoveryPlanWithEvent(step1.updatedPlan, {
      type: 'study_guide.read',
      lectureId: 101,
    });
    expect(duplicateStep.matchedTasks.length).toBe(0);
    expect(duplicateStep.xpAwarded).toBe(0);

    // 3. Complete quiz for lecture 101 -> finishes Day 1 and awards +50 XP
    const step2 = reconcileRecoveryPlanWithEvent(step1.updatedPlan, {
      type: 'quiz.finished',
      lectureId: 101,
    });
    expect(step2.matchedTasks.length).toBe(1);
    expect(step2.matchedTasks[0].taskType).toBe('quiz');
    expect(step2.dayJustCompleted).toBe(true);
    expect(step2.xpAwarded).toBe(DAY_COMPLETION_XP_REWARD);
    expect(step2.updatedPlan?.isFullyCompleted).toBe(true);
    expect(step2.updatedPlan?.totalXpClaimed).toBe(DAY_COMPLETION_XP_REWARD);
  });
});
