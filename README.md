<div align="center">

# 🎓 BSU Math AI Portal (`bsu-math-ai-portal`)

### Autonomous Academic Lecture Intelligence & Multimodal Delivery Platform
**Department of Mathematics • Faculty of Education (General) • Beni-Suef University**
*(2nd Year • 1st Term • 12 Official Academic Courses & Assigned Faculty)*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20App%20Router-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google NotebookLM](https://img.shields.io/badge/AI%20Engine-NotebookLM%20Audio%20%26%20Video-4285F4.svg?logo=google&logoColor=white)](https://notebooklm.google.com/)
[![KaTeX](https://img.shields.io/badge/Math-KaTeX%20LaTeX%20Renderer-00d1b2.svg)](https://katex.org/)
[![Dual Edition](https://img.shields.io/badge/Design-Dual%20Edition%20(Boys%20%26%20Girls)-f43f5e.svg)](https://github.com/3bkader-gpt/bsu-math-ai-portal)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Dual-Edition Experience (Boys & Girls) • Egyptian Arabic Audio Podcasts • Blackboard Video Walkthroughs • KaTeX Mathematical Engine • Multi-Doctor Syllabus Tracks**

[System Architecture](#-system-architecture) • [Dual-Edition Design System](#-dual-edition-design-system) • [12 Official Courses](#-12-official-academic-courses) • [Key Features](#-key-features) • [Quick Start](#-quick-start)

</div>

---

## 🎯 Overview

**BSU Math AI Portal** is an end-to-end academic content generation and lecture delivery ecosystem built specifically for mathematics and computer science undergraduate students at **Beni-Suef University**.

Traditional academic lecture slide decks and dense PDF handouts often lack accessible commentary, leaving students struggling through abstract theorems before exams. This platform completely automates the lecture enrichment lifecycle:

1. **Ingests raw course PDFs** through an administrative dashboard.
2. **Injects custom department-curated system prompts** tailored to Beni-Suef exam patterns and Egyptian university dialect.
3. **Synthesizes multi-modal learning assets** via NotebookLM (conversational Egyptian Arabic podcasts, blackboard video walkthroughs, interactive quizzes, study guides, and flashcards).
4. **Distributes media permanently via Telegram Cloud CDN** without hosting overhead, backed by Supabase PostgreSQL metadata and a responsive Next.js frontend.

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph Ingestion ["Ingestion & Administration"]
        AdminUser["Course Administrator / TA"]
        PDFFile["Raw Lecture PDF(s)<br/>Differential Geometry, Mechanics, Real Analysis"]
        AdminDashboard["Admin Dashboard (Next.js 16)"]
    end

    subgraph BackendCore ["Backend Core (FastAPI)"]
        AuthLayer["JWT Bearer Security Layer"]
        UploadRouter["Upload & Magic Byte Sanitizer"]
        JobOrchestrator["Decoupled Background Pipeline"]
        PromptEngine["Department Prompt Injector<br/>11 Subject Curriculums"]
    end

    subgraph MultimodalAI ["Multimodal AI Generation"]
        NotebookLMCLI["NotebookLM Automated Worker"]
        AudioSynth["Egyptian Arabic Podcast (30 min)"]
        VideoSynth["Blackboard Video Animation"]
        TextSynth["Comprehensive Study Guide & Flashcards"]
        QuizSynth["Interactive Comprehension Quiz"]
    end

    subgraph StorageLayer ["Storage & Delivery Layer"]
        TelegramCDN["Telegram Private Channel CDN<br/>Telethon Client & Bot API"]
        SupabaseDB["Supabase PostgreSQL<br/>Metadata, Doctor Tracks, Resilient Pool"]
        LocalCache["Local Storage Fallback Cache"]
    end

    subgraph StudentExp ["Student Experience (Next.js 16)"]
        StudentApp["Student Portal (Mobile-First / OLED Dark)"]
        PodcastPlayer["Audio Player (1x - 2x Speed)"]
        VideoPlayer["Whiteboard Video Stream"]
        QuizUI["Instant Feedback Quiz Engine"]
        KaTeXRenderer["KaTeX Math Renderer (LTR in RTL)"]
    end

    AdminUser --> AdminDashboard
    PDFFile --> AdminDashboard
    AdminDashboard --> AuthLayer
    AuthLayer --> UploadRouter
    UploadRouter --> JobOrchestrator
    PromptEngine --> JobOrchestrator
    
    JobOrchestrator --> NotebookLMCLI
    NotebookLMCLI --> AudioSynth
    NotebookLMCLI --> VideoSynth
    NotebookLMCLI --> TextSynth
    NotebookLMCLI --> QuizSynth

    AudioSynth --> TelegramCDN
    VideoSynth --> TelegramCDN
    TextSynth --> SupabaseDB
    QuizSynth --> SupabaseDB
    TelegramCDN -.-> LocalCache

    SupabaseDB --> StudentApp
    TelegramCDN --> StudentApp
    StudentApp --> PodcastPlayer
    StudentApp --> VideoPlayer
    StudentApp --> QuizUI
    StudentApp --> KaTeXRenderer
```

---

## 🌟 Key Features

### ⚡ Decoupled Asynchronous Pipeline
- Text assets (quiz, study guide, flashcards, mind map) generate and register immediately (<30 seconds), making the lecture accessible to students instantly.
- Heavy media generation (30-minute dual-speaker podcasts and blackboard video animations) is decoupled into an asynchronous background worker with automatic Telegram CDN upload.
- On-demand synchronization endpoint (`POST /api/lectures/{id}/sync-media`) enables instantaneous polling and attachment of finished media.

### 👩‍🏫 Multi-Doctor Track Architecture
- Fully supports collegiate courses co-taught by multiple professors under a single curriculum.
- For subjects like **تعليم ورياده اعمال** (taught simultaneously by **دكتورة مروة - التربية** and **دكتور وليد - ريادة الأعمال**), students can seamlessly toggle between instructor tracks with independent lecture numbering, distinct badges, and filtered study materials.

### 🇪🇬 Authentic Egyptian Collegiate Voice
- Prompts are specifically written in encouraging Egyptian university dialect (*"شرح مصري بلدي للزتونة"*), transforming intimidating abstract mathematics into intuitive, relatable problem-solving sessions with university exam-oriented tips.

### 🎨 Impeccable Craftsmanship
- Audited and verified against [Impeccable.style](https://impeccable.style/) standards with **zero design anti-patterns**.
- Academic sapphire and midnight OLED palette—no generic AI tri-color gradients or side-tab tells.
- All browser surfaces (`::selection`, `:focus-visible`, `caret-color`, `text-underline-offset`, scrollbars) are completely themed.

---

## 🧮 Mathematical Typography & KaTeX

Mathematical formulas require pristine clarity without bidirectional corruption. In an RTL Arabic document, raw formulas can invert signs and bracket ordering.

The portal enforces isolated **Unicode Bidi Isolation** and strict LTR rendering for all formulas:

```css
.katex {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
  font-size: 1.15em !important;
  color: var(--math-formula-color) !important;
}
```

$$\mathbf{r}(u) = \big(a \cos u,\; a \sin u,\; c u\big) \implies \dot{\mathbf{r}}(u) = \frac{d\mathbf{r}}{du} = \big(-a \sin u,\; a \cos u,\; c\big)$$

$$\|\dot{\mathbf{r}}(u)\| = \sqrt{(-a \sin u)^2 + (a \cos u)^2 + c^2} = \sqrt{a^2 + c^2}$$

---

## 🛠 Technology Stack

| Layer | Technologies | Role |
|---|---|---|
| **Frontend** | **Next.js 16 (App Router)**, React 19, TypeScript | Mobile-first student portal & administrative dashboard |
| **Styling** | **TailwindCSS v4**, Vanilla CSS Design Tokens | Dark/Light mode, OLED contrast, Impeccable tokens |
| **Backend API** | **FastAPI**, Starlette, Uvicorn | High-throughput asynchronous REST API & streaming |
| **Database** | **Supabase PostgreSQL 17**, SQLAlchemy 2.0 | Course metadata, lecture records, asset manifests |
| **CDN & Storage** | **Telegram Bot API**, **Telethon Client** | Free unlimited persistent cloud hosting for audio & video |
| **AI Synthesis** | **NotebookLM CLI**, Google Gemini | Multi-modal lecture generation & Egyptian prompt injection |
| **Mathematics** | **KaTeX**, Remark / Rehype Math | High-performance client-side LaTeX typesetting |

---

## 💻 Quick Start

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- Telegram Bot Token & Channel (or local storage fallback)
- Supabase PostgreSQL (or local SQLite)

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/3bkader-gpt/bsu-math-ai-portal.git
cd bsu-math-ai-portal

# Setup Python virtual environment
python -m venv .venv

# Activate environment:
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `.env` with your credentials:
```ini
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/postgres
SECRET_KEY=your_jwt_secret_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx
```

```bash
# Launch FastAPI backend server
python run.py
```
> API runs at `http://127.0.0.1:8000` • Swagger Docs at `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```
> Student Portal runs at `http://localhost:3000` • Admin Login at `http://localhost:3000/admin`

---

## 🛡️ Security & Defensive Hardening

The codebase has undergone a comprehensive security and quality audit:

- **Path Traversal Shield:** All uploaded filenames are stripped of relative path components and sanitized via `Path(f.filename).name`.
- **Binary Magic Byte Verification:** Verifies genuine `%PDF-` file header bytes, preventing file extension spoofing and arbitrary code uploads.
- **Strict Size Limits:** Enforces a 50MB ceiling per PDF upload to prevent server memory exhaustion.
- **Strict Scoped CORS:** Explicitly allows authorized origin domains (`localhost:3000`, `127.0.0.1:3000`), rejecting wildcard credential requests.
- **Stream Boundary Guards:** The streaming endpoint enforces `is_safe_path` checks, disallowing access outside approved directory roots.
- **Resilient Connection Pooling & DNS Failover:** Configured with `pool_pre_ping=True` and `pool_recycle=300` alongside direct IP routing to insulate against ISP/router DNS resolution timeouts.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
Made with care for Mathematics & Computer Science students at Beni-Suef University 🇪🇬
</div>
