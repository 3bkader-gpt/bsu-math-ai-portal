'use client';

import React from 'react';
import MathRenderer from './MathRenderer';
import { BookOpen, Info, Bookmark, Sparkles } from 'lucide-react';
import contentData from '@/data/content.json';

interface StudyGuideViewerProps {
  content: string;
  onDwell?: (dwellSec: number) => void;
}

export function StudyGuideViewer({ content, onDwell }: StudyGuideViewerProps) {
  React.useEffect(() => {
    if (!content) return;
    let dwell = 0;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        dwell += 1;
        if (onDwell) onDwell(dwell);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [content, onDwell]);

  if (!content) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <span className="text-base font-semibold">{contentData.studyGuideTab.loading}</span>
      </div>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let keyIdx = 0;

  const splitTableRow = (row: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inMath = false;

    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      const prev = i > 0 ? row[i - 1] : '';

      if (ch === '$' && prev !== '\\') {
        inMath = !inMath;
        current += ch;
      } else if (ch === '|' && !inMath && prev !== '\\') {
        if (current.trim()) cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) cells.push(current.trim());
    return cells;
  };

  const flushTable = () => {
    if (tableBuffer.length < 2) {
      tableBuffer = [];
      return;
    }

    const headerRow = splitTableRow(tableBuffer[0]);
    const bodyRows = tableBuffer.slice(2).map(r => splitTableRow(r));

    elements.push(
      <div key={`table-wrapper-${keyIdx++}`} className="my-6">
        <div className="flex sm:hidden items-center justify-between text-[11px] font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          <span>{contentData.studyGuideTab.tableLabel}</span>
          <span style={{ color: 'var(--accent-primary)' }}>{contentData.studyGuideTab.mobileTableHint}</span>
        </div>
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--card-shadow)',
          }}
          className="overflow-x-auto rounded-2xl sm:rounded-3xl border transition-colors"
        >
          <table className="w-full text-right text-sm sm:text-base min-w-[500px]">
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderBottomColor: 'var(--border-subtle)',
                }}
                className="border-b"
              >
                {headerRow.map((h, i) => (
                  <th key={i} className="px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-xs sm:text-base tracking-wide" style={{ color: 'var(--text-primary)' }}>
                    <MathRenderer text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {bodyRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:opacity-90 transition-colors"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 sm:px-6 py-3.5 sm:py-4.5 leading-relaxed text-xs sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                      <MathRenderer text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
    tableBuffer = [];
  };

  let inBlockMath = false;
  let blockMathBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Check for single line block math $$...$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      elements.push(
        <MathRenderer key={`block-math-${keyIdx++}`} text={trimmed} block />
      );
      continue;
    } else if (trimmed === '$$') {
      if (inBlockMath) {
        elements.push(
          <MathRenderer key={`block-math-${keyIdx++}`} text={blockMathBuffer.join('\n')} block />
        );
        blockMathBuffer = [];
        inBlockMath = false;
      } else {
        inBlockMath = true;
      }
      continue;
    }

    if (inBlockMath) {
      blockMathBuffer.push(trimmed);
      continue;
    }

    if (!trimmed) {
      continue;
    }

    // Main Heading (H1)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <div key={`h1-${keyIdx++}`} className="pb-6 mb-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--accent-primary)',
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold mb-4 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{contentData.studyGuideTab.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-snug tracking-tight" style={{ color: 'var(--text-primary)' }}>
            <MathRenderer text={trimmed.replace(/^#\s*/, '')} />
          </h1>
        </div>
      );
    } 
    // Section Heading (H2)
    else if (trimmed.startsWith('## ')) {
      elements.push(
        <div
          key={`h2-${keyIdx++}`}
          className="mt-12 mb-6 pt-6 border-t flex items-center gap-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            style={{ backgroundColor: 'var(--accent-primary)' }}
            className="w-2.5 h-8 rounded-full shadow-sm"
          ></div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            <MathRenderer text={trimmed.replace(/^##\s*/, '')} />
          </h2>
        </div>
      );
    } 
    // Subheading (H3)
    else if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace(/^###\s*/, '');
      const isExample = headingText.includes('مثال');

      elements.push(
        <div
          key={`h3-${keyIdx++}`}
          style={{
            backgroundColor: isExample ? 'var(--bg-surface-elevated)' : 'transparent',
            borderColor: isExample ? 'var(--border-prominent)' : 'transparent',
          }}
          className={`mt-8 mb-4 ${isExample ? 'p-4 rounded-2xl border flex items-center gap-3 shadow-sm' : ''}`}
        >
          {isExample && <Bookmark className="w-5 h-5 text-amber-500 shrink-0" />}
          <h3
            className={`font-bold ${isExample ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}
            style={{ color: isExample ? 'var(--text-primary)' : 'var(--accent-primary)' }}
          >
            <MathRenderer text={headingText} />
          </h3>
        </div>
      );
    } 
    // Divider
    else if (trimmed.startsWith('---')) {
      elements.push(
        <hr key={`hr-${keyIdx++}`} className="my-10" style={{ borderColor: 'var(--border-subtle)' }} />
      );
    } 
    // Callouts / Quotes
    else if (trimmed.startsWith('>')) {
      elements.push(
        <div
          key={`callout-${keyIdx++}`}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-interactive)',
            color: 'var(--text-primary)',
          }}
          className="my-5 p-5 rounded-2xl border text-base leading-relaxed flex items-start gap-3.5 shadow-sm"
        >
          <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <MathRenderer text={trimmed.replace(/^>\s*/, '')} />
          </div>
        </div>
      );
    } 
    // Bullet points
    else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <div key={`li-${keyIdx++}`} className="my-3 flex items-start gap-3.5 leading-relaxed text-base sm:text-lg">
          <span
            style={{ backgroundColor: 'var(--accent-primary)' }}
            className="w-2.5 h-2.5 rounded-full mt-2.5 shrink-0 shadow-sm"
          ></span>
          <div className="flex-1" style={{ color: 'var(--text-secondary)' }}>
            <MathRenderer text={trimmed.replace(/^[-*]\s*/, '')} />
          </div>
        </div>
      );
    } 
    // Numbered items
    else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
      elements.push(
        <div key={`num-${keyIdx++}`} className="my-3.5 flex items-start gap-3.5 leading-relaxed text-base sm:text-lg">
          <span
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-prominent)',
              color: 'var(--accent-primary)',
            }}
            className="w-7 h-7 rounded-xl border font-bold text-xs flex items-center justify-center shrink-0 shadow-sm mt-0.5"
          >
            {numMatch ? numMatch[1] : '•'}
          </span>
          <div className="flex-1" style={{ color: 'var(--text-secondary)' }}>
            <MathRenderer text={numMatch ? numMatch[2] : trimmed} />
          </div>
        </div>
      );
    } 
    // Standard Paragraph
    else {
      elements.push(
        <p key={`p-${keyIdx++}`} className="my-4 text-base sm:text-lg leading-loose" style={{ color: 'var(--text-secondary)' }}>
          <MathRenderer text={trimmed} />
        </p>
      );
    }
  }

  if (tableBuffer.length > 0) flushTable();

  return <div className="space-y-1 text-right">{elements}</div>;
}

export default StudyGuideViewer;
