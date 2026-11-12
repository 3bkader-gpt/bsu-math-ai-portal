'use client';

import React from 'react';
import {
  QuickMicroSessionModal,
  EthicalWrapUpModal,
  MistakeNotebookModal,
} from '@/modules/gamification/ui';
import CohortHurdlesModal from '@/components/CohortHurdlesModal';
import CustomExamBuilderModal from '@/components/CustomExamBuilderModal';
import FormulaSheetModal from '@/components/FormulaSheetModal';
import RecoveryPlannerModal from '@/components/RecoveryPlannerModal';
import FocusAmbienceModal from '@/components/FocusAmbienceModal';
import MathScratchpadModal from '@/components/MathScratchpadModal';
import StudentBinderModal from '@/components/StudentBinderModal';
import { AcademicSubject } from '@/types/academic';
import { PortalLectureItem } from '@/hooks/usePortalCatalog';

interface PortalModalsHostProps {
  activeSubject?: AcademicSubject;
  displayedLectures: PortalLectureItem[];
  isDark: boolean;
  isGirls: boolean;
  isMicroSessionOpen: boolean;
  setIsMicroSessionOpen: (v: boolean) => void;
  isWrapUpOpen: boolean;
  setIsWrapUpOpen: (v: boolean) => void;
  isMistakeNotebookOpen: boolean;
  setIsMistakeNotebookOpen: (v: boolean) => void;
  isHurdlesModalOpen: boolean;
  setIsHurdlesModalOpen: (v: boolean) => void;
  isExamBuilderOpen: boolean;
  setIsExamBuilderOpen: (v: boolean) => void;
  isFormulaSheetOpen: boolean;
  setIsFormulaSheetOpen: (v: boolean) => void;
  isRecoveryPlannerOpen: boolean;
  setIsRecoveryPlannerOpen: (v: boolean) => void;
  isFocusAmbienceOpen: boolean;
  setIsFocusAmbienceOpen: (v: boolean) => void;
  isMathScratchpadOpen: boolean;
  setIsMathScratchpadOpen: (v: boolean) => void;
  isStudentBinderOpen: boolean;
  setIsStudentBinderOpen: (v: boolean) => void;
}

export default function PortalModalsHost({
  activeSubject,
  displayedLectures,
  isDark,
  isGirls,
  isMicroSessionOpen,
  setIsMicroSessionOpen,
  isWrapUpOpen,
  setIsWrapUpOpen,
  isMistakeNotebookOpen,
  setIsMistakeNotebookOpen,
  isHurdlesModalOpen,
  setIsHurdlesModalOpen,
  isExamBuilderOpen,
  setIsExamBuilderOpen,
  isFormulaSheetOpen,
  setIsFormulaSheetOpen,
  isRecoveryPlannerOpen,
  setIsRecoveryPlannerOpen,
  isFocusAmbienceOpen,
  setIsFocusAmbienceOpen,
  isMathScratchpadOpen,
  setIsMathScratchpadOpen,
  isStudentBinderOpen,
  setIsStudentBinderOpen,
}: PortalModalsHostProps) {
  return (
    <>
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
      <CohortHurdlesModal
        isOpen={isHurdlesModalOpen}
        onClose={() => setIsHurdlesModalOpen(false)}
        isDark={isDark}
      />
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
      <RecoveryPlannerModal
        isOpen={isRecoveryPlannerOpen}
        onClose={() => setIsRecoveryPlannerOpen(false)}
        activeSubject={activeSubject}
        subjectLectures={displayedLectures}
        isDark={isDark}
        isGirls={isGirls}
      />
      <FocusAmbienceModal
        isOpen={isFocusAmbienceOpen}
        onClose={() => setIsFocusAmbienceOpen(false)}
        isDark={isDark}
        isGirls={isGirls}
      />
      <MathScratchpadModal
        isOpen={isMathScratchpadOpen}
        onClose={() => setIsMathScratchpadOpen(false)}
        isDark={isDark}
      />
      <StudentBinderModal
        isOpen={isStudentBinderOpen}
        onClose={() => setIsStudentBinderOpen(false)}
        isDark={isDark}
        isGirls={isGirls}
      />
    </>
  );
}
