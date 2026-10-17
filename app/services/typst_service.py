"""Typst PDF Generation Service for Academic Study Guides.

Converts Markdown containing Arabic text, LaTeX-style mathematics, tables,
and code blocks into professionally typeset academic PDFs using Typst.
"""

import logging
import re
import tempfile
from pathlib import Path
from typing import Optional
import pypandoc
import typst

logger = logging.getLogger("typst_service")

# Reasonable limit for study guide text (500 KB ~ 100+ pages of dense markdown)
MAX_INPUT_CHARS = 500_000


class TypstServiceError(Exception):
    """Base exception for Typst conversion and compilation errors."""
    pass


class InputSizeExceededError(TypstServiceError):
    """Raised when the input Markdown text exceeds MAX_INPUT_CHARS."""
    pass


def _build_typst_preamble() -> str:
    """
    Constructs the Typst preamble configuring A4 page geometry, academic headers,
    page numbering in Arabic, font hierarchy, right-to-left layout, and styling
    for callouts, examples, lists, and modern tables.
    """
    return """
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.2cm, left: 1.8cm, right: 1.8cm),
  header: align(center)[
    #text(size: 8.5pt, fill: rgb("#475569"), font: ("Cairo", "Amiri", "DejaVu Sans", "Arial"))[
      جامعة بني سويف — كلية التربية — شعبة رياضيات (الفرقة الثانية) — العام الجامعي 2026 / 2027
    ]
    #v(-4pt)
    #line(length: 100%, stroke: 0.4pt + rgb("#cbd5e1"))
  ],
  footer: align(center)[
    #line(length: 100%, stroke: 0.4pt + rgb("#cbd5e1"))
    #v(-2pt)
    #text(size: 8.5pt, fill: rgb("#64748b"))[
      صفحة #context counter(page).display() من #context counter(page).final().first()
    ]
  ]
)

#set text(
  font: ("Cairo", "Amiri", "Noto Sans Arabic", "DejaVu Sans", "Arial"),
  size: 10.5pt,
  dir: rtl,
  lang: "ar",
)

#set par(
  justify: true,
  leading: 0.75em,
)

// Define Pandoc's horizontalrule helper
#let horizontalrule = v(0.5em) + line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1")) + v(0.5em)

// Academic Headings styling
#show heading: it => {
  set text(font: ("Cairo", "Amiri", "DejaVu Sans", "Arial"))
  if it.level == 1 {
    v(1.2em)
    block(
      fill: rgb("#f8fafc"),
      inset: (x: 14pt, y: 10pt),
      radius: 4pt,
      width: 100%,
      stroke: (right: 4pt + rgb("#2563eb"), rest: 0.5pt + rgb("#e2e8f0")),
      [#text(fill: rgb("#1e3a8a"), size: 15pt, weight: "bold")[#it.body]]
    )
    v(0.6em)
  } else if it.level == 2 {
    v(1.1em)
    text(size: 13pt, weight: "bold", fill: rgb("#1d4ed8"))[#it.body]
    v(0.4em)
  } else {
    // Level 3 Heading: Highlight examples (أمثلة) as distinct cards
    v(0.8em)
    if repr(it.body).contains("مثال") {
      block(
        fill: rgb("#fffbeb"),
        stroke: (right: 3.5pt + rgb("#f59e0b"), rest: 0.5pt + rgb("#fef3c7")),
        radius: 4pt,
        inset: (x: 12pt, y: 8pt),
        width: 100%,
        [#text(size: 11pt, weight: "bold", fill: rgb("#92400e"))[#it.body]]
      )
    } else {
      text(size: 11.5pt, weight: "bold", fill: rgb("#334155"))[#it.body]
    }
    v(0.4em)
  }
}

// Styling lists to ensure clean spacing and vertical stacking
#set enum(indent: 0pt, body-indent: 6pt, spacing: 10pt)
#set list(indent: 0pt, body-indent: 6pt, spacing: 8pt)

// Styling blockquotes / callouts
#show quote: it => {
  block(
    fill: rgb("#f8fafc"),
    stroke: (right: 3.5pt + rgb("#2563eb"), rest: 0.5pt + rgb("#e2e8f0")),
    inset: (x: 12pt, y: 10pt),
    radius: 4pt,
    width: 100%,
    it.body
  )
}

// Ensure code blocks and raw text are LTR with fixed-width font
#show raw: set text(dir: ltr, font: "Courier New")

// Center display math formulas
#show math.equation.where(block: true): set align(center)

// Center figures and tables
#show figure: set align(center)

// Modern Academic Table Styling
#show table: set table(
  stroke: (x, y) => if y == 0 {
    (bottom: 1.5pt + rgb("#2563eb"), rest: 0.4pt + rgb("#cbd5e1"))
  } else {
    0.4pt + rgb("#e2e8f0")
  },
  fill: (col, row) => if row == 0 {
    rgb("#eff6ff")
  } else if calc.even(row) {
    rgb("#f8fafc")
  } else {
    none
  },
  inset: (x: 6pt, y: 7pt),
)

#show table.cell: it => {
  set align(center + horizon)
  if it.y == 0 {
    set text(weight: "bold", fill: rgb("#1e3a8a"))
    it
  } else {
    it
  }
}

#show table.hline: it => line(length: 100%, stroke: 1.5pt + rgb("#2563eb"))
"""


def _preprocess_markdown_for_typst(content_text: str, lecture_num: Optional[int] = None) -> str:
    """
    Preprocesses Markdown before Pandoc parsing:
    1. If lecture_num is provided, normalizes the first H1 heading so the lecture number
       appears prominently before the lecture title (e.g. '# المحاضرة 1: مفهوم المنحنى وطول القوس').
    2. Ensures blank lines before numbered lists (1. 2.) and bullet lists (- *)
       when preceded by regular text, preventing Pandoc from fusing them into side-by-side lines.
    3. Separates display math ($$...$$) from trailing/leading text when on the same line.
    4. Guarantees clean vertical spacing around standalone display math equations.
    """
    lines = content_text.split('\n')

    # Normalize main document heading (first H1) if lecture_num is provided
    if lecture_num is not None:
        h1_replaced = False
        new_lines = []
        for line in lines:
            if line.startswith('# ') and not h1_replaced:
                raw_h1 = line[2:].strip()
                clean_topic = re.sub(r'^(الدليل|دليل)\s+(الدراسي|الدراسة|دراسي|دراسة)?\s*(الشامل|شامل)?\s*[:\-]?\s*', '', raw_h1).strip()
                clean_topic = re.sub(r'^(المحاضرة|محاضرة)\s*\d+\s*[:\-]?\s*', '', clean_topic).strip()
                new_h1 = f"# المحاضرة {lecture_num}: {clean_topic}"
                new_lines.append(new_h1)
                h1_replaced = True
            else:
                new_lines.append(line)
        lines = new_lines

    processed = []

    for i, line in enumerate(lines):
        trimmed = line.strip()

        # Check if line has trailing text after display math: $$...$$ text
        m_trailing = re.match(r'^(\s*\$\$.*?\$\$)\s+(.+)$', line)
        if m_trailing:
            math_part = m_trailing.group(1)
            text_part = m_trailing.group(2)
            if processed and processed[-1].strip():
                processed.append('')
            processed.append(math_part)
            processed.append('')
            processed.append(text_part)
            continue

        # Check if line starts with numbered list (e.g. 1. or 2.) or bullet (* or -)
        is_list_item = bool(re.match(r'^\s*(\d+\.|[-*])\s+', line))
        if is_list_item:
            if processed and processed[-1].strip():
                prev = processed[-1].strip()
                if not re.match(r'^\s*(\d+\.|[-*])\s+', prev) and not prev.startswith('#'):
                    processed.append('')

        # Check if line is display math $$...$$
        if trimmed.startswith('$$') and trimmed.endswith('$$') and len(trimmed) > 4:
            if processed and processed[-1].strip():
                processed.append('')
            processed.append(trimmed)
            processed.append('')
            continue

        processed.append(line)

    return '\n'.join(processed)


def _normalize_pandoc_typst(typst_code: str) -> str:
    r"""
    Normalizes known Pandoc Typst writer quirks:
    - Replaces invalid double-pipe matrix delimiters `mat(delim: "||")` with valid single pipe `mat(delim: "|")`.
    - Normalizes pandoc math delimiter scaling: `#scale(...)[\(]` -> `(`, preventing RTL parenthesis inversion.
    - Normalizes table columns: replaces rigid equal percentages with dynamic `auto` widths so wide equations don't get squished.
    - Inserts clean `#linebreak()` between Arabic names and math formulas in table headers.
    - Wraps parenthesized English phrases that contain math with LRM to prevent BiDi word reversal.
    - Fixes sentence-ending periods after math in RTL paragraphs using RLM.
    - Unescapes unnecessary backslashes before math parentheses.
    """
    code = re.sub(r'mat\(delim:\s*"\|\|"', 'mat(delim: "|"', typst_code)
    code = re.sub(r'#scale\([^)]*\)\[\\*([()\[\]{}|])\]', r'\1', code)

    # Normalize rigid equal percentage columns from Pandoc to dynamic auto columns
    def _repl_cols(match):
        inner = match.group(1).strip()
        items = [x.strip() for x in inner.split(',') if x.strip()]
        if all(re.match(r'^\d+(\.\d+)?%$', item) for item in items):
            auto_cols = ', '.join(['auto'] * len(items))
            return f"columns: ({auto_cols},)"
        return match.group(0)

    code = re.sub(r'columns:\s*\(([^)]+)\)', _repl_cols, code)

    # In table headers, insert clean linebreak between Arabic label and math formula
    code = re.sub(r'(\b[\u0600-\u06FF]+:)\s+(\$)', r'\1#linebreak() \2', code)

    # Wrap parenthesized English phrases that contain math with LRM to prevent BiDi word reversal
    code = re.sub(r'(\([A-Za-z][^$\n]*\$[^$\n]+\$[^)\n]*\))', r'\\u{200E}\1\\u{200E}', code)

    # Fix sentence-ending periods after math in RTL paragraphs
    code = re.sub(r'(\$[^$]+\$)\.([ \t]*(?:\n|$))', r'\1.\\u{200F}\2', code)

    # Unescape escaped parentheses in math
    code = re.sub(r'\\([()])', r'\1', code)
    return code


def markdown_to_typst_pdf(content_text: str, lecture_num: Optional[int] = None) -> bytes:
    """
    Converts study-guide Markdown text into compiled PDF bytes using Typst.

    Args:
        content_text: The source Markdown string of the study guide.
        lecture_num: Optional lecture number (e.g. 1, 2) to format the main document title.

    Returns:
        bytes: The compiled PDF document bytes starting with %PDF-.

    Raises:
        InputSizeExceededError: If the content exceeds MAX_INPUT_CHARS.
        TypstServiceError: If Pandoc conversion or Typst compilation fails.
    """
    if not content_text or not content_text.strip():
        raise TypstServiceError("Content text is empty")

    if len(content_text) > MAX_INPUT_CHARS:
        raise InputSizeExceededError(
            f"Content length ({len(content_text)}) exceeds maximum allowed size ({MAX_INPUT_CHARS} characters)"
        )

    # Preprocess markdown to fix unspaced lists, display equations, and lecture number in title
    preprocessed_markdown = _preprocess_markdown_for_typst(content_text, lecture_num=lecture_num)

    # Convert Markdown to Typst using Pandoc with LaTeX math dollars support
    try:
        raw_typst_body = pypandoc.convert_text(
            preprocessed_markdown,
            to="typst",
            format="markdown+tex_math_dollars",
            extra_args=["--wrap=none"]
        )
    except Exception as e:
        logger.error(f"Pandoc conversion error: {e}", exc_info=True)
        raise TypstServiceError("Failed to convert Markdown to Typst format") from e

    normalized_body = _normalize_pandoc_typst(raw_typst_body)
    preamble = _build_typst_preamble()
    full_typst_document = f"{preamble}\n{normalized_body}"

    # Safely compile to PDF using a clean temporary file
    temp_file = tempfile.NamedTemporaryFile("w", suffix=".typ", encoding="utf-8", delete=False)
    temp_path = Path(temp_file.name)
    try:
        temp_file.write(full_typst_document)
        temp_file.close()

        pdf_bytes = typst.compile(str(temp_path))
        if not pdf_bytes or not pdf_bytes.startswith(b"%PDF-"):
            raise TypstServiceError("Typst compiler returned invalid PDF output")

        return pdf_bytes
    except TypstServiceError:
        raise
    except Exception as e:
        logger.error(f"Typst compilation error: {e}", exc_info=True)
        raise TypstServiceError("Typst compilation failed") from e
    finally:
        try:
            temp_path.unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Failed to clean up temporary Typst file {temp_path}: {e}")
