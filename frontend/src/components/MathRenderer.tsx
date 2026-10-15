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
              {str.substring(last, m.index)}
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
            {str.substring(last)}
          </span>
        );
      }

      return parts;
    };

    // Primary tokenizer: matches block math, inline math, bold (**...**), italic (*...*), or code (`...`)
    const tokenRegex = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textSegment = text.substring(lastIndex, match.index);
        elements.push(
          <span key={`raw-${keyCounter++}`}>{textSegment}</span>
        );
      }

      const token = match[0];

      if (token.startsWith('$$') && token.endsWith('$$')) {
        const formula = token.slice(2, -2).trim();
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
      } else if (token.startsWith('$') && token.endsWith('$')) {
        const formula = token.slice(1, -1).trim();
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
      } else if (token.startsWith('**') && token.endsWith('**')) {
        const inner = token.slice(2, -2);
        elements.push(
          <strong key={`bold-${keyCounter++}`} className="font-extrabold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {renderInlineMathAndText(inner, `bld-${keyCounter}`)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
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
            {token.slice(1, -1)}
          </code>
        );
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

    if (lastIndex < text.length) {
      elements.push(
        <span key={`tail-${keyCounter++}`}>{text.substring(lastIndex)}</span>
      );
    }

    return elements;
  }, [text, block]);

  return <span className={className}>{renderedContent}</span>;
}

export default MathRenderer;
