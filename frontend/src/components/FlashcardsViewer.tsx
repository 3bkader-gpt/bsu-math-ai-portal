'use client';

import React, { useState, useEffect } from 'react';
import MathRenderer from './MathRenderer';
import { ChevronRight, ChevronLeft, RotateCcw, Sparkles, Layers } from 'lucide-react';
import contentData from '@/data/content.json';

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardsViewerProps {
  cards: Flashcard[];
}

export function FlashcardsViewer({ cards }: FlashcardsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
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

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

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

      {/* Interactive Card */}
      <div
        id="flashcard-card-box"
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[260px] sm:min-h-[340px] cursor-pointer select-none group"
      >
        <div
          style={{
            backgroundColor: isFlipped ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
            borderColor: isFlipped ? 'var(--accent-emerald)' : 'var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="w-full min-h-[260px] sm:min-h-[340px] rounded-2xl sm:rounded-3xl p-5 sm:p-10 border transition-all duration-200 flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span
              style={{
                backgroundColor: isFlipped ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-elevated)',
                borderColor: isFlipped ? 'var(--accent-emerald)' : 'var(--border-prominent)',
                color: isFlipped ? 'var(--accent-emerald)' : 'var(--accent-primary)',
              }}
              className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-bold border flex items-center gap-1.5 sm:gap-2 shadow-sm text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isFlipped ? contentData.flashcardsTab.answerBadge : contentData.flashcardsTab.questionBadge}</span>
            </span>

            <span
              className="group-hover:opacity-100 opacity-70 transition-opacity flex items-center gap-1 text-[11px] sm:text-xs font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{contentData.flashcardsTab.tapToFlip}</span>
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          </div>

          {/* Card Body */}
          <div className="py-5 sm:py-8 text-center my-auto">
            <div
              className="text-base sm:text-2xl font-bold leading-relaxed transition-all"
              style={{ color: 'var(--text-primary)' }}
            >
              <MathRenderer text={isFlipped ? currentCard.answer : currentCard.question} />
            </div>
          </div>

          {/* Footer */}
          <div
            className="text-center text-xs sm:text-sm pt-4 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <span className="font-medium">{isFlipped ? contentData.flashcardsTab.backHint : contentData.flashcardsTab.frontHint}</span>
            <span className="text-xs">{contentData.flashcardsTab.navigationHelp}</span>
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
          className="flex-1 py-3.5 px-5 rounded-2xl border font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 active:scale-98 shadow-sm cursor-pointer hover:border-blue-400"
        >
          <ChevronRight className="w-5 h-5" />
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
          className="flex-1 py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer hover:opacity-95"
        >
          <span>{contentData.flashcardsTab.nextButton}</span>
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default FlashcardsViewer;
