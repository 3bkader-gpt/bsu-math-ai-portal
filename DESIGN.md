---
name: Beni-Suef Math AI Portal
description: Official Academic Intelligence & Lecture Automation Portal for Department of Mathematics, Faculty of Science, Beni-Suef University
colors:
  primary: "#1d4ed8"
  primary-hover: "#1e40af"
  accent-cyan: "#0284c7"
  accent-emerald: "#059669"
  accent-amber: "#d97706"
  accent-rose: "#e11d48"
  bg-page: "#f8fafc"
  bg-surface: "#ffffff"
  bg-surface-elevated: "#f1f5f9"
  text-primary: "#0f172a"
  text-secondary: "#334155"
  text-muted: "#64748b"
  border-subtle: "#e2e8f0"
  border-prominent: "#cbd5e1"
  dark-bg-page: "#080c16"
  dark-bg-surface: "#0f172a"
  dark-bg-surface-elevated: "#1e293b"
  dark-text-primary: "#f8fafc"
  dark-text-secondary: "#cbd5e1"
  dark-border-subtle: "rgba(255, 255, 255, 0.08)"
typography:
  display:
    fontFamily: "Cairo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.2
  headline:
    fontFamily: "Cairo, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Cairo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  math:
    fontFamily: "KaTeX_Main, KaTeX_Math, serif"
    fontSize: "1.15em"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
---

# Design System: Beni-Suef Math AI Portal

## Overview
A premier academic intelligence platform built for mathematics and computer science students at Beni-Suef University. The design marries strict mathematical rigor with an inviting, modern Egyptian university voice. Every surface is tuned for maximum readability, swift lecture comprehension, and distraction-free learning across desktop and mobile devices.

## Colors
The palette is grounded in authentic academic sapphire and midnight navy, complemented by crisp mathematical status accents:
- **Academic Sapphire (`primary: #1d4ed8`, dark `#3b82f6`)**: Primary actions, focused tabs, selected states.
- **Midnight Navy / OLED Ground (`#080c16` / `#0f172a`)**: Dark mode canvas ensuring maximum contrast without eye strain.
- **Editorial Paper Ground (`#f8fafc` / `#ffffff`)**: Light mode canvas designed like a clean mathematical journal.
- **Emerald Accent (`#059669` / `#10b981`)**: Complete state, correct quiz answers, verified pipelines.
- **Amber Accent (`#d97706` / `#f59e0b`)**: Hints, warnings, lecture numbers.
- **Rose Accent (`#e11d48` / `#f43f5e`)**: Quiz mistakes, pipeline alerts, destructive actions.
- **Sky/Cyan (`#0284c7` / `#38bdf8`)**: Mathematical formulae, Telethon CDN indicators, LaTeX symbols.

## Typography
- **Primary Typeface**: [Cairo](https://fonts.google.com/specimen/Cairo) — modern geometric Arabic sans with clear numeral distinctions and excellent legibility at both micro (10px) and display scales.
- **Mathematical Typeface**: KaTeX font suite with forced LTR rendering (`direction: ltr !important`) and isolated Unicode bidi boundaries to prevent Arabic-mathematical glyph reversal.
- **Scale**:
  - Hero display: `clamp(2rem, 5vw, 3.5rem)`, weight 800.
  - Section headers: `1.25rem - 1.75rem`, weight 700.
  - Body prose: `1rem`, line-height 1.6, weight 400.
  - Metadata / Badges: `0.75rem - 0.875rem`, weight 600.

## Layout
- **Direction**: Right-to-Left (`rtl`) as root default with bidirectional support for mathematical formulae and code.
- **Responsive Grid**:
  - Mobile (360px - 640px): 1-column cards, sticky bottom action bars, touch-friendly swipeable tabs.
  - Tablet (641px - 1024px): 2-column balanced grid.
  - Desktop (1025px+): 3-column subject browser and 7/5 column admin workstation layout.
- **Rhythm**: Generous section spacing (32px-48px), tight element grouping (8px-16px).

## Elevation & Depth
- **Surface Elevation**: Soft, multi-stop drop shadows with subtle ambient diffusion. No harsh block offsets or gaudy outer glows.
- **Backdrop Blurs**: Subtle 12px-16px frosted glass for navigation bars and modals (`backdrop-blur-xl`).
- **Dark Mode Depth**: Micro inner borders (`inset 0 1px 1px rgba(255, 255, 255, 0.08)`) giving cards a luminous physical edge against deep OLED grounds.

## Shapes
- **Corner Radii**: 
  - Standard cards & modals: `1.5rem` (`rounded-3xl` / 24px) for organic friendly feel.
  - Badges & mini buttons: `0.5rem - 0.75rem` (`rounded-lg` / `rounded-xl`).
  - Pills: `9999px` (`rounded-full`) strictly for status chips and tags.

## Components
- **Subject Cards**: Interactive containers showing subject title, doctor badges, and lecture counters. Dual-doctor subjects display toggleable doctor tracks.
- **Lecture View Modal**: Fullscreen-capable modal with tabs for Audio Podcast, Whiteboard Video, Interactive Quiz, Study Guide, and Flashcards.
- **Doctor Track Switcher**: Integrated button tabs distinguishing dual instructors (e.g., دكتورة مروة vs دكتور وليد) with distinct pastel badges.
- **Admin Smart Pipeline Card**: Real-time 5-stage stepper displaying PDF intake, prompt injection, NotebookLM generation, media packaging, and Telegram CDN sync.

## Do's and Don'ts
### Do's
- ✅ Maintain Egyptian academic voice in microcopy and guidance.
- ✅ Ensure KaTeX equations render LTR with adequate line spacing.
- ✅ Use subtle 1px luminous borders rather than thick 4px side borders on cards.
- ✅ Theme all browser surfaces (`::selection`, `:focus-visible`, `caret-color`, `::-webkit-scrollbar`).
- ✅ Optimize touch targets to >= 44x44px for student mobile phones.

### Don'ts
- ❌ Do NOT use generic AI indigo/purple/cyan tri-color gradients.
- ❌ Do NOT use kickers/eyebrows above main headings.
- ❌ Do NOT use cards nested inside cards.
- ❌ Do NOT use unicode emoji as icons where consistent SVG icons exist.
- ❌ Do NOT invert mathematical symbols or LaTeX formulae in RTL flow.
