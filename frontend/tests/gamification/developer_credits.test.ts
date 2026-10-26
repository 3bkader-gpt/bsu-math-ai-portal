import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Artisan Developer Credits Integration', () => {
  const modalPath = path.resolve(__dirname, '../../src/components/DeveloperCreditsModal.tsx');
  const pillPath = path.resolve(__dirname, '../../src/components/DeveloperCreditsPill.tsx');
  const drawerPath = path.resolve(__dirname, '../../src/components/MobileNavDrawer.tsx');
  const homePagePath = path.resolve(__dirname, '../../src/app/page.tsx');
  const lecturePagePath = path.resolve(__dirname, '../../src/app/lecture/page.tsx');

  describe('DeveloperCreditsModal Component', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf8');

    it('contains exact developer identity: عبقادر', () => {
      expect(modalCode).toContain('عبقادر');
      expect(modalCode).toContain('مطور ومصمم المنصة');
      expect(modalCode).toContain('كلية التربية • تانية رياضيات وذكاء اصطناعي');
    });

    it('contains exact verified Instagram profile URL and handle', () => {
      expect(modalCode).toContain('https://www.instagram.com/3_bkader/');
      expect(modalCode).toContain('@3_bkader');
    });

    it('contains exact verified GitHub profile URL and handle', () => {
      expect(modalCode).toContain('https://github.com/3bkader-gpt');
      expect(modalCode).toContain('3bkader-gpt');
    });

    it('implements landscape safety and scroll guards', () => {
      expect(modalCode).toContain('max-h-[92dvh]');
      expect(modalCode).toContain('overflow-y-auto');
      expect(modalCode).toContain('overscroll-contain');
    });

    it('supports keyboard Escape and backdrop dismissal', () => {
      expect(modalCode).toContain("e.key === 'Escape'");
      expect(modalCode).toContain('e.target === e.currentTarget');
      expect(modalCode).toContain('onClose()');
    });

    it('has interactive cheer with localStorage persistence', () => {
      expect(modalCode).toContain('bsu_dev_cheers');
      expect(modalCode).toContain('bsu_dev_user_cheered');
    });
  });

  describe('DeveloperCreditsPill Component', () => {
    const pillCode = fs.readFileSync(pillPath, 'utf8');

    it('renders developer name and variants', () => {
      expect(pillCode).toContain('عبقادر');
      expect(pillCode).toContain('variant === \'drawer\'');
      expect(pillCode).toContain('بطاقة المطور');
    });
  });

  describe('Mobile Navigation Drawer Integration', () => {
    const drawerCode = fs.readFileSync(drawerPath, 'utf8');

    it('has onOpenDevCredits prop in interface and triggers it', () => {
      expect(drawerCode).toContain('onOpenDevCredits?: () => void;');
      expect(drawerCode).toContain('onOpenDevCredits');
      expect(drawerCode).toContain('variant="drawer"');
    });
  });

  describe('Page Integrations (Home & Lecture)', () => {
    const homeCode = fs.readFileSync(homePagePath, 'utf8');
    const lectureCode = fs.readFileSync(lecturePagePath, 'utf8');

    it('Home page embeds DeveloperCreditsPill, Modal, and Drawer hook', () => {
      expect(homeCode).toContain('DeveloperCreditsPill');
      expect(homeCode).toContain('DeveloperCreditsModal');
      expect(homeCode).toContain('isDevCreditsOpen');
      expect(homeCode).toContain('onOpenDevCredits={() => setIsDevCreditsOpen(true)}');
    });

    it('Lecture page embeds DeveloperCreditsPill, Modal, and Drawer hook', () => {
      expect(lectureCode).toContain('DeveloperCreditsPill');
      expect(lectureCode).toContain('DeveloperCreditsModal');
      expect(lectureCode).toContain('isDevCreditsOpen');
      expect(lectureCode).toContain('onOpenDevCredits={() => setIsDevCreditsOpen(true)}');
    });
  });
});
