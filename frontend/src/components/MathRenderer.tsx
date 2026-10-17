'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
  block?: boolean;
}

export function MathRenderer({ text, className = '', block = false }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Explicit block mode with pure formula
    if (block && !text.includes('$')) {
      try {
        const html = katex.renderToString(text.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
        return (
          <div
            dir="ltr"
            style={{
              backgroundColor: 'var(--math-block-bg)',
              borderColor: 'var(--math-block-border)',
              color: 'var(--math-formula-color)',
            }}
            className="my-3 py-3 px-5 overflow-x-auto text-center rounded-2xl border shadow-sm transition-colors w-full max-w-full"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        return <code className="text-amber-500 font-mono text-sm">{text}</code>;
      }
    }

    let keyCounter = 0;

    // Helper to render text with authentic Egyptian Hieroglyphs wrapped in styled badges
    const renderTextWithHieroglyphs = (str: string, prefix: string): React.ReactNode[] => {
      // Regex matching one or more Egyptian Hieroglyphic characters (\u{13000}-\u{1342F})
      const hieroRegex = /([\u{13000}-\u{1342F}]+)/gu;
      const parts: React.ReactNode[] = [];
      let last = 0;
      let m: RegExpExecArray | null;

      while ((m = hieroRegex.exec(str)) !== null) {
        if (m.index > last) {
          parts.push(str.substring(last, m.index));
        }
        const glyphs = m[1];
        parts.push(
          <span
            key={`${prefix}-hiero-${keyCounter++}`}
            className="hieroglyph-badge"
            title="رمز هيروغليفي مصري قديم أصلي"
          >
            {glyphs}
          </span>
        );
        last = hieroRegex.lastIndex;
      }

      if (last < str.length) {
        parts.push(str.substring(last));
      }

      return parts;
    };

    // Sub-renderer for text containing math inside formatted containers (like bold or italic)
    const renderInlineMathAndText = (str: string, prefix: string): React.ReactNode[] => {
      const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
      const parts: React.ReactNode[] = [];
      let last = 0;
      let m: RegExpExecArray | null;

      while ((m = mathRegex.exec(str)) !== null) {
        if (m.index > last) {
          parts.push(
            <span key={`${prefix}-txt-${keyCounter++}`}>
              {renderTextWithHieroglyphs(str.substring(last, m.index), prefix)}
            </span>
          );
        }

        const raw = m[0];
        const isBlock = raw.startsWith('$$') && raw.endsWith('$$');
        const formula = isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

        try {
          const html = katex.renderToString(formula, {
            displayMode: isBlock,
            throwOnError: false,
            output: 'html',
          });

          if (isBlock) {
            parts.push(
              <div
                key={`${prefix}-blk-${keyCounter++}`}
                dir="ltr"
                style={{
                  backgroundColor: 'var(--math-block-bg)',
                  borderColor: 'var(--math-block-border)',
                  color: 'var(--math-formula-color)',
                }}
                className="my-3 py-2.5 px-4 overflow-x-auto text-center rounded-xl border transition-colors w-full max-w-full"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } else {
            parts.push(
              <span
                key={`${prefix}-inl-${keyCounter++}`}
                dir="ltr"
                style={{
                  unicodeBidi: 'isolate',
                  color: 'var(--math-formula-color, inherit)',
                }}
                className="inline px-1 font-semibold transition-colors"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
        } catch {
          parts.push(
            <span key={`${prefix}-err-${keyCounter++}`} className="text-amber-500 font-mono text-xs">
              {raw}
            </span>
          );
        }

        last = mathRegex.lastIndex;
      }

      if (last < str.length) {
        parts.push(
          <span key={`${prefix}-txt-${keyCounter++}`}>
            {renderTextWithHieroglyphs(str.substring(last), prefix)}
          </span>
        );
      }

      return parts;
    };

    // Pre-process makeshift LaTeX codes and clean stray dollar signs around ancient Egyptian numerals
    let processedText = text;
    if (
      processedText.includes('حبل') ||
      processedText.includes('شت') ||
      processedText.includes('مقياس النيل') ||
      processedText.includes('هيروغليف') ||
      processedText.includes('قنطرية') ||
      processedText.includes('لوتس') ||
      processedText.includes('فرعون') ||
      /[\u{13000}-\u{1342F}]/u.test(processedText)
    ) {
      processedText = processedText
        .replace(/\\?\$?\\?mathcal\{?S\}?\$?/g, '𓍢')
        .replace(/\\?\$?\\?cap\$?/g, '𓎆')
        .replace(/\\𓍢/g, '𓍢')
        .replace(/\\𓎆/g, '𓎆')
        .replace(/\$\s*([\u{13000}-\u{1342F}]+)\s*\$/gu, '$1')
        .replace(/\$([\u{13000}-\u{1342F}]+)/gu, '$1')
        .replace(/([\u{13000}-\u{1342F}]+)\$/gu, '$1');
    }

    // Primary tokenizer: matches block math, inline math, bold (**...**), italic (*...*), or code (`...`)
    const tokenRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(processedText)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = processedText.substring(lastIndex, match.index);
        elements.push(
          <span key={`raw-${keyCounter++}`}>
            {renderTextWithHieroglyphs(textSegment, 'raw')}
          </span>
        );
      }

      const token = match[0];

      if (token.startsWith('$$') && token.endsWith('$$')) {
        const formula = token.slice(2, -2).trim();
        if (/[\u{13000}-\u{1342F}]/u.test(formula)) {
          elements.push(
            <div key={`blk-hiero-${keyCounter++}`} className="my-3 text-center">
              {renderTextWithHieroglyphs(formula, 'blk-hiero')}
            </div>
          );
        } else {
          try {
            const html = katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
              output: 'html',
            });
            elements.push(
              <div
                key={`blk-${keyCounter++}`}
                dir="ltr"
                style={{
                  backgroundColor: 'var(--math-block-bg)',
                  borderColor: 'var(--math-block-border)',
                  color: 'var(--math-formula-color)',
                }}
                className="my-3 py-2.5 px-4 overflow-x-auto text-center rounded-2xl border shadow-sm transition-colors w-full max-w-full"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            elements.push(<span key={`err-${keyCounter++}`} className="text-amber-500">{token}</span>);
          }
        }
      } else if (token.startsWith('$') && token.endsWith('$')) {
        const formula = token.slice(1, -1).trim();
        if (/[\u{13000}-\u{1342F}]/u.test(formula)) {
          elements.push(
            <span key={`inl-hiero-${keyCounter++}`}>
              {renderTextWithHieroglyphs(formula, 'inl-hiero')}
            </span>
          );
        } else {
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
              output: 'html',
            });
            elements.push(
              <span
                key={`inl-${keyCounter++}`}
                dir="ltr"
                style={{
                  unicodeBidi: 'isolate',
                  color: 'var(--math-formula-color, inherit)',
                }}
                className="inline px-1 font-semibold transition-colors"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            elements.push(<span key={`err-${keyCounter++}`} className="text-amber-500">{token}</span>);
          }
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        const inner = token.slice(2, -2);
        elements.push(
          <strong key={`bold-${keyCounter++}`} className="font-extrabold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {renderInlineMathAndText(inner, `bld-${keyCounter}`)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        const innerCode = token.slice(1, -1);
        if (/[\u{13000}-\u{1342F}]/u.test(innerCode)) {
          elements.push(
            <span
              key={`code-${keyCounter++}`}
              className="hieroglyph-badge"
              title="رمز هيروغليفي أصلي"
            >
              {innerCode}
            </span>
          );
        } else {
          elements.push(
            <code
              key={`code-${keyCounter++}`}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--accent-primary)',
                borderColor: 'var(--border-subtle)',
              }}
              className="px-2 py-0.5 rounded-lg border font-mono text-sm"
            >
              {innerCode}
            </code>
          );
        }
      } else if (token.startsWith('*') && token.endsWith('*')) {
        const inner = token.slice(1, -1);
        elements.push(
          <em key={`em-${keyCounter++}`} className="italic" style={{ color: 'var(--text-secondary)' }}>
            {renderInlineMathAndText(inner, `em-${keyCounter}`)}
          </em>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < processedText.length) {
      elements.push(
        <span key={`tail-${keyCounter++}`}>
          {renderTextWithHieroglyphs(processedText.substring(lastIndex), 'tail')}
        </span>
      );
    }

    return elements;
  }, [text, block]);

  return <span className={className}>{renderedContent}</span>;
}

export default MathRenderer;
