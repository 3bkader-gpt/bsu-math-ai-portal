import { describe, expect, it } from 'vitest';

import { parseQuizMarkdown } from '@/lib/lecture-utils';

const MD_WITH_STEPS = `# كويز تجريبي

## Question 1
ما هو مشتقة الدالة الثابتة؟

- [x] صفر
- [ ] واحد
- [ ] لا نهائي

**Hint:** مشتقة أي دالة ثابتة تساوي صفراً.

**Steps:**
- نكتب تعريف المشتقة $f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}$
- نعوض $f(x+h) = c$ و $f(x) = c$
- الناتج $\\\\frac{0}{h} = 0$

## Question 2
واحد زائد واحد يساوي؟

- [x] اتنين
- [ ] تلاتة

**Hint:** العدّ البسيط.
`;

describe('parseQuizMarkdown — worked-example Steps blocks (Phase 3.2)', () => {
  const questions = parseQuizMarkdown(MD_WITH_STEPS);

  it('parses both questions', () => {
    expect(questions).toHaveLength(2);
  });

  it('extracts numbered steps from the **Steps:** block', () => {
    expect(questions[0].steps).toHaveLength(3);
    expect(questions[0].steps?.[0]).toContain('تعريف المشتقة');
    expect(questions[0].steps?.[2]).toContain('0');
  });

  it('keeps questions without a Steps block clean (steps undefined)', () => {
    expect(questions[1].steps).toBeUndefined();
  });

  it('does not leak Steps lines into the question or options', () => {
    expect(questions[0].question).not.toContain('نكتب تعريف');
    expect(questions[0].options).toHaveLength(3);
    expect(questions[0].hint).toContain('صفراً');
  });
});
