'use client';

import React, { useState, useEffect, useRef } from 'react';
import MathRenderer from './MathRenderer';
import { ChevronRight, ChevronLeft, RotateCcw, Sparkles, Layers } from 'lucide-react';
import contentData from '@/data/content.json';
import PaperClip3D from './PaperClip3D';

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardsViewerProps {
  cards: Flashcard[];
  onCardFlipped?: (cardIndex: number) => void;
}

export function RawFlashcardsViewer({ cards, onCardFlipped }: FlashcardsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGirls, setIsGirls] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  useEffect(() => {
    setIsGirls(document.documentElement.getAttribute('data-persona') === 'girls');
    const handlePersonaChange = () => {
      setIsGirls(document.documentElement.getAttribute('data-persona') === 'girls');
    };
    window.addEventListener('bsu_theme_changed', handlePersonaChange);
    return () => window.removeEventListener('bsu_theme_changed', handlePersonaChange);
  }, []);

  const toggleFlip = () => {
    setIsFlipped((prev) => {
      const next = !prev;
      if (next && onCardFlipped) {
        onCardFlipped(currentIndex);
      }
      return next;
    });
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      isSwipingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;
    if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy)) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartXRef.current;
    const dy = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.1) {
      // Horizontal swipe detected
      if (dx < 0) {
        // Swiped left (in RTL: next card)
        handleNext();
      } else {
        // Swiped right (in RTL: previous card)
        handlePrev();
      }
    }
  };

  const handleCardClick = () => {
    if (isSwipingRef.current) {
      isSwipingRef.current = false;
      return;
    }
    toggleFlip();
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards?.length]);

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <span className="text-base font-semibold">{contentData.flashcardsTab.empty}</span>
      </div>
    );
  }

  const currentCard = cards[currentIndex];


  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Top Header & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-2.5">
          <span
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-prominent)',
              color: 'var(--accent-primary)',
            }}
            className="w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm shadow-sm"
          >
            {currentIndex + 1}
          </span>
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {contentData.flashcardsTab.progressFormat.replace('{total}', String(cards.length))}
          </span>
        </div>

        <div
          className="flex-1 max-w-[176px] min-w-[50px] h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              backgroundColor: 'var(--accent-primary)',
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
            }}
          />
        </div>

        <button
          onClick={() => {
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          className="hover:underline flex items-center gap-1.5 transition-colors font-medium text-xs sm:text-sm cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{contentData.flashcardsTab.restartButton}</span>
        </button>
      </div>

      {/* Interactive 3D Physics Card with Deck Stacking */}
      <div className="flashcard-3d-scene w-full pb-10 pt-2 px-3 sm:px-6">
        <div
          id="flashcard-card-box"
          onClick={handleCardClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="card-deck-stack w-full min-h-[280px] sm:min-h-[350px] rounded-2xl sm:rounded-3xl cursor-pointer select-none group transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99] touch-pan-y"
        >
          <div
            className={`flashcard-3d-card w-full min-h-[280px] sm:min-h-[350px] ${
              isFlipped ? 'is-flipped' : ''
            }`}
          >
            {/* FRONT FACE (Question) */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--card-shadow)',
              }}
              className="flashcard-face w-full min-h-[280px] sm:min-h-[350px] rounded-2xl sm:rounded-3xl p-5 sm:p-10 border flex flex-col justify-between relative overflow-visible"
            >
              {/* 3D Metallic Paperclip clipping top edge of flashcard */}
              <PaperClip3D
                isGirls={isGirls}
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 group-hover:-translate-y-1 group-hover:scale-105"
              />

              {/* Header */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-prominent)',
                    color: 'var(--accent-primary)',
                  }}
                  className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-bold border flex items-center gap-1.5 sm:gap-2 shadow-xs text-xs shrink-0 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{contentData.flashcardsTab.questionBadge}</span>
                  <span className="sm:hidden">سؤال</span>
                </span>

                <span
                  className="group-hover:opacity-100 opacity-70 transition-opacity flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 shrink-0 whitespace-nowrap"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span className="hidden sm:inline">{contentData.flashcardsTab.tapToFlip}</span>
                  <span className="sm:hidden">اقلب الكارت</span>
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-300 group-hover:rotate-45" />
                </span>
              </div>

              {/* Card Body */}
              <div className="py-6 sm:py-10 text-center my-auto">
                <div
                  className="text-base sm:text-2xl font-bold leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <MathRenderer text={currentCard.question} />
                </div>
              </div>

              {/* Footer */}
              <div
                className="text-center text-xs sm:text-sm pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span className="font-medium">{contentData.flashcardsTab.frontHint}</span>
                <span className="text-xs hidden sm:inline">{contentData.flashcardsTab.navigationHelp}</span>
              </div>
            </div>

            {/* BACK FACE (Answer) */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--accent-emerald)',
                boxShadow: 'var(--card-shadow)',
              }}
              className="flashcard-face flashcard-face-back absolute inset-0 w-full min-h-[280px] sm:min-h-[350px] rounded-2xl sm:rounded-3xl p-5 sm:p-10 border flex flex-col justify-between overflow-visible"
            >
              {/* 3D Metallic Paperclip on flipped back face */}
              <PaperClip3D
                isGirls={isGirls}
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 group-hover:-translate-y-1 group-hover:scale-105"
              />

              {/* Header */}
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'var(--accent-emerald)',
                    color: 'var(--accent-emerald)',
                  }}
                  className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-bold border flex items-center gap-1.5 sm:gap-2 shadow-xs text-xs shrink-0 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{contentData.flashcardsTab.answerBadge}</span>
                  <span className="sm:hidden">إجابة</span>
                </span>

                <span
                  className="group-hover:opacity-100 opacity-70 transition-opacity flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">{contentData.flashcardsTab.tapToFlip}</span>
                  <span className="sm:hidden">اقلب الكارت</span>
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </span>
              </div>

              {/* Card Body */}
              <div className="py-6 sm:py-10 text-center my-auto">
                <div
                  className="text-base sm:text-2xl font-bold leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <MathRenderer text={currentCard.answer} />
                </div>
              </div>

              {/* Footer */}
              <div
                className="text-center text-xs sm:text-sm pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <span className="font-medium">{contentData.flashcardsTab.backHint}</span>
                <span className="text-xs hidden sm:inline">{contentData.flashcardsTab.navigationHelp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          className="flex-1 min-w-fit py-3.5 px-5 rounded-2xl border font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 active:scale-98 shadow-sm cursor-pointer hover:border-blue-400 whitespace-nowrap"
        >
          <ChevronRight className="w-5 h-5 shrink-0" />
          <span>{contentData.flashcardsTab.prevButton}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
          }}
          className="flex-1 min-w-fit py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer hover:opacity-95 whitespace-nowrap"
        >
          <span>{contentData.flashcardsTab.nextButton}</span>
          <ChevronLeft className="w-5 h-5 shrink-0" />
        </button>
      </div>
    </div>
  );
}

export const FlashcardsViewer = React.memo(
  RawFlashcardsViewer,
  (prev, next) => {
    return (
      prev.cards === next.cards &&
      prev.onCardFlipped === next.onCardFlipped
    );
  }
);

export default FlashcardsViewer;
