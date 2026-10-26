import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Zero-Friction Student Onboarding & AI Context System', () => {
  const profileLibPath = path.resolve(__dirname, '../../src/lib/studentProfile.ts');
  const modalPath = path.resolve(__dirname, '../../src/components/WelcomeStudentModal.tsx');
  const drawerPath = path.resolve(__dirname, '../../src/components/MobileNavDrawer.tsx');
  const homePagePath = path.resolve(__dirname, '../../src/app/page.tsx');
  const lecturePagePath = path.resolve(__dirname, '../../src/app/lecture/page.tsx');

  describe('studentProfile lib & AI Tutor Context', () => {
    const code = fs.readFileSync(profileLibPath, 'utf8');

    it('exports key profile persistence functions', () => {
      expect(code).toContain('getStudentProfileLocal');
      expect(code).toContain('saveStudentProfileLocal');
      expect(code).toContain('shouldPromptOnboarding');
      expect(code).toContain('getStudentContextForAI');
    });

    it('prepares rich context for AI Private Tutor API', () => {
      expect(code).toContain('StudentAIContext');
      expect(code).toContain('recordedMistakesCount');
      expect(code).toContain('recentMistakeTopics');
      expect(code).toContain('lastVisitedLectureId');
      expect(code).toContain('streakDays');
    });

    it('uses standard localStorage keys and custom broadcast event', () => {
      expect(code).toContain('bsu_portal_student_nickname');
      expect(code).toContain('bsu_student_has_onboarded_v1');
      expect(code).toContain('bsu-student-profile-updated');
    });
  });

  describe('WelcomeStudentModal Component', () => {
    const code = fs.readFileSync(modalPath, 'utf8');

    it('contains name prompt, validation, and welcoming title', () => {
      expect(code).toContain('منور في منصة تانية رياضيات! 📐✨');
      expect(code).toContain('اسمك بالكامل أو اسم الشهرة');
      expect(code).toContain('الاسم يجب أن يحتوي على حرفين على الأقل');
    });

    it('includes gender persona customization', () => {
      expect(code).toContain('طالب (شباب)');
      expect(code).toContain('طالبة (بنات)');
    });

    it('teases the upcoming AI Private Tutor feature', () => {
      expect(code).toContain('تمهيد لمدرس الذكاء الاصطناعي الخصوصي ⚡');
      expect(code).toContain('المدرس الذكي هيتابع نقاط ضعفك');
    });

    it('allows guest skip during first visit', () => {
      expect(code).toContain('الدخول كزائر مؤقتاً');
    });
  });

  describe('MobileNavDrawer Integration', () => {
    const code = fs.readFileSync(drawerPath, 'utf8');

    it('renders student profile card with edit profile trigger', () => {
      expect(code).toContain('Student Profile Card');
      expect(code).toContain('onOpenEditProfile');
      expect(code).toContain('تعديل ✏️');
    });
  });

  describe('Home Page Integration', () => {
    const code = fs.readFileSync(homePagePath, 'utf8');

    it('renders WelcomeStudentModal and personalizes hero greeting', () => {
      expect(code).toContain('WelcomeStudentModal');
      expect(code).toContain('shouldPromptOnboarding()');
      expect(code).toContain('صباح النشاط');
      expect(code).toContain('isWelcomeModalOpen');
    });

    it('displays personalized name badge in the header', () => {
      expect(code).toContain('تعديل اسمك وهويتك في المنصة');
      expect(code).toContain('studentName');
    });
  });

  describe('Lecture Page Integration', () => {
    const code = fs.readFileSync(lecturePagePath, 'utf8');

    it('embeds WelcomeStudentModal and passes onOpenEditProfile to drawer', () => {
      expect(code).toContain('WelcomeStudentModal');
      expect(code).toContain('onOpenEditProfile');
    });
  });
});
