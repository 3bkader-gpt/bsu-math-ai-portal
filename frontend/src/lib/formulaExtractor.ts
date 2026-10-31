/**
 * Formula & Theorem Extractor (Deterministic AST / Regex Pipeline)
 * 
 * Ingests lecture study guide markdown ("الزتونة") and extracts:
 * - Display Math ($$...$$)
 * - Labeled Theorems, Laws, Definitions (قانون, نظرية, تعريف, خاصية, نتيجة)
 * - Explanations and context
 * Fully client-side, zero compute overhead.
 */

export interface FormulaItem {
  id: string;
  lectureId: number;
  lectureNum: number;
  lectureTitle: string;
  category: 'قانون' | 'نظرية' | 'تعريف' | 'نتيجة' | 'خاصية' | 'صيغة رياضية';
  title: string;
  formula: string; // Raw KaTeX / LaTeX or text
  explanation: string;
  rawText: string;
}

/**
 * Extracts math formulas and labeled laws/theorems from a study guide markdown string
 */
export function extractFormulasFromMarkdown(
  markdownText: string,
  lectureId: number,
  lectureNum: number,
  lectureTitle: string
): FormulaItem[] {
  if (!markdownText) return [];

  const items: FormulaItem[] = [];
  const lines = markdownText.split('\n');
  let currentSectionTitle = `المحاضرة ${lectureNum}`;
  let itemCounter = 0;

  // 1. AST-like line-by-line block scanner
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track heading context
    if (line.startsWith('#')) {
      const headingClean = line.replace(/^#+\s*/, '').trim();
      currentSectionTitle = headingClean;
      continue;
    }

    // Check for explicit law / theorem / definition labels
    const matchCategory = line.match(/^(?:###|##|\*\*|[-*])?\s*(قانون|نظرية|تعريف|خاصية|نتيجة|صيغة)(?:\s*[:\-–—]\s*|\s+)(.*)$/i);
    if (matchCategory) {
      const rawCat = matchCategory[1];
      const category: FormulaItem['category'] = (
        rawCat.includes('قانون') ? 'قانون' :
        rawCat.includes('نظرية') ? 'نظرية' :
        rawCat.includes('تعريف') ? 'تعريف' :
        rawCat.includes('خاصية') ? 'خاصية' :
        rawCat.includes('نتيجة') ? 'نتيجة' : 'صيغة رياضية'
      );

      const titleRaw = matchCategory[2].replace(/\*\*|__/g, '').trim();
      const title = titleRaw || `${category} في ${currentSectionTitle}`;

      // Lookahead for formula block ($$...$$ or subsequent lines)
      let formula = '';
      let explanation = '';
      let j = i + 1;
      
      // Look forward up to 8 lines for associated formula and notes
      while (j < lines.length && j <= i + 8) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('#') || /^(?:###|##|\*\*|[-*])?\s*(قانون|نظرية|تعريف)/.test(nextLine)) {
          break; // Next block encountered
        }

        // Check for display math $$...$$
        const displayMatch = nextLine.match(/\$\$([\s\S]*?)\$\$/);
        if (displayMatch) {
          formula = displayMatch[1].trim();
        } else if (nextLine.startsWith('$$')) {
          // Multiline $$ block
          let blockLines = [nextLine.replace(/^\$\$/, '')];
          j++;
          while (j < lines.length && !lines[j].includes('$$')) {
            blockLines.push(lines[j]);
            j++;
          }
          if (j < lines.length) {
            blockLines.push(lines[j].replace(/\$\$/, ''));
          }
          formula = blockLines.join('\n').trim();
        } else if (!formula && nextLine.includes('$')) {
          // Inline math
          const inlineMatch = nextLine.match(/\$([^\$\n]+?)\$/);
          if (inlineMatch) {
            formula = inlineMatch[1].trim();
          }
        }

        // Explanation text
        if (nextLine && !nextLine.startsWith('$$') && !nextLine.startsWith('```')) {
          const cleanExpl = nextLine.replace(/^[-*•]\s*/, '').replace(/\*\*|__/g, '').trim();
          if (cleanExpl && !cleanExpl.includes('$$')) {
            explanation = explanation ? `${explanation} — ${cleanExpl}` : cleanExpl;
          }
        }

        j++;
      }

      itemCounter++;
      items.push({
        id: `form_${lectureId}_${itemCounter}`,
        lectureId,
        lectureNum,
        lectureTitle,
        category,
        title,
        formula: formula || title,
        explanation,
        rawText: `${title}\n${formula}\n${explanation}`,
      });
    }
  }

  // 2. Fallback: Search for standalone display math blocks ($$...$$) not captured by explicit keywords
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  let match: RegExpExecArray | null;
  while ((match = displayRegex.exec(markdownText)) !== null) {
    const rawFormula = match[1].trim();
    if (!rawFormula || rawFormula.length < 3) continue;

    // Check if formula is already in items
    const alreadyFound = items.some(it => it.formula.includes(rawFormula) || rawFormula.includes(it.formula));
    if (!alreadyFound) {
      itemCounter++;
      items.push({
        id: `form_math_${lectureId}_${itemCounter}`,
        lectureId,
        lectureNum,
        lectureTitle,
        category: 'صيغة رياضية',
        title: `صيغة رياضية (${currentSectionTitle})`,
        formula: rawFormula,
        explanation: `صيغة معتمدة من المحاضرة ${lectureNum}`,
        rawText: rawFormula,
      });
    }
  }

  return items;
}

/**
 * Deduplicates and normalizes extracted formula items
 */
export function deduplicateFormulas(items: FormulaItem[]): FormulaItem[] {
  const seen = new Set<string>();
  const result: FormulaItem[] = [];

  for (const item of items) {
    // Normalize formula for comparison
    const normKey = (item.title + '_' + item.formula.replace(/\s+/g, '')).toLowerCase();
    if (!seen.has(normKey)) {
      seen.add(normKey);
      result.push(item);
    }
  }

  return result;
}
