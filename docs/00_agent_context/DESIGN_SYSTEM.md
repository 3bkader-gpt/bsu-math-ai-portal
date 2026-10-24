# 🎨 DESIGN_SYSTEM.md — Design Tokens & UI Guidelines
> Complete design token system, typography, color palettes, and component patterns.
> Last Updated: 2026-10-21

---

## 1. Core Principles

1. **Academic Arabic Excellence:** Designed specifically for Arabic reading flow (RTL) while cleanly handling embedded English math equations (LTR).
2. **Accessible High-Contrast:** Color contrast meets WCAG AAA for text and AA for interactive elements.
3. **Calm Focus:** Minimal distracting animations. Fast, snappy interactions with subtle micro-feedback.

---

## 2. Typography

| Role | Font Family | Fallback | Usage |
|---|---|---|---|
| **Primary Arabic** | `Cairo` (Google Fonts) | `system-ui, sans-serif` | Headers, body text, buttons, alerts |
| **Numbers & XP** | `Outfit` (Google Fonts) | `sans-serif` | XP counters, streaks, timers, scores |
| **Math Equations** | `KaTeX` / `Times New Roman` | `serif` | Inline & display mathematical formulas (always `dir="ltr"`) |
| **Monospace / Code** | `JetBrains Mono` / `Consolas` | `monospace` | Terminal outputs, code snippets |

---

## 3. Color Tokens (CSS Variables)

Defined in [`frontend/src/app/globals.css`](file:///d:/الكليه/BOT/frontend/src/app/globals.css).

### Light Mode (`:root`)
```css
--bg-page: #F5EFE1;                 /* Warm papyrus background */
--bg-surface: #FFFFFF;              /* Crisp card background */
--bg-surface-elevated: #FAF5EA;     /* Elevated modals & panels */
--text-primary: #162828;            /* Deep slate/teal readable text */
--text-secondary: #244040;          /* Subtle subtitle text */
--text-muted: #526E6E;              /* Tertiary metadata */
--border-subtle: #E3D7C1;           /* Soft divider */
--border-prominent: #D9C8AC;        /* Card boundaries */
--accent-primary: #184E4E;          /* Deep academic teal */
--accent-cyan: #0D9488;             /* Vibrant teal */
--accent-emerald: #059669;          /* Success / streaks */
--accent-amber: #C8963E;            /* XP / warnings */
--accent-rose: #BE123C;             /* Error / mistake flags */
```

### Dark Mode (`.dark`)
```css
--bg-page: #0B0F14;                 /* Midnight slate */
--bg-surface: #131922;              /* Dark surface */
--bg-surface-elevated: #1C2533;     /* Raised popover */
--text-primary: #F1F5F9;            /* Bright white-blue */
--text-secondary: #CBD5E1;          /* Silver gray */
--text-muted: #94A3B8;              /* Slate muted */
--border-subtle: #1E2B3A;           /* Dark hairline */
--border-prominent: #2B3B4E;        /* Active border */
--accent-primary: #2DD4BF;          /* Glowing mint/cyan */
--accent-cyan: #38BDF8;             /* Sky blue */
--accent-emerald: #10B981;          /* Emerald glow */
--accent-amber: #F59E0B;            /* Warm gold */
--accent-rose: #F43F5E;             /* Radiant rose */
```

---

## 4. Directionality & Math Layout Rules

- The document root is `dir="rtl"` with `lang="ar"`.
- **CRITICAL MATH RULE:** All math expressions and containers rendered via KaTeX must be explicitly isolated with `dir="ltr"` and `text-left` / `inline-block` to avoid broken RTL punctuation and reversed formula glyphs.
- Always use [`MathRenderer.tsx`](file:///d:/الكليه/BOT/frontend/src/components/common/MathRenderer.tsx) or wrap with `.katex-inline` / `.katex-display`.

---

## 5. Component Patterns & Micro-Interactions

### Floating Gamification Pill
- Position: Fixed at screen corner (bottom-left or top-left depending on layout).
- Displays streak count 🔥 and current level badge ⚡.
- Clicking opens profile & achievements drawer.

### Sound Effects & Feedback
- Handled through [`soundEngine.ts`](file:///d:/الكليه/BOT/frontend/src/lib/audio/soundEngine.ts).
- Synthetic Web Audio (0 network requests, no MP3 assets needed).
- Respects student mute state stored in `localStorage`.
