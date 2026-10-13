# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary Audience:** Mathematics and Computer Science undergraduate students at Beni-Suef University (Faculty of Science).
- **Secondary Audience:** Teaching assistants and professors reviewing lecture delivery, and the site admin uploading raw course PDFs.

## Product Purpose
Deliver an intelligent, fully automated academic lecture hub where dense mathematics lecture PDFs are converted into engaging multi-modal assets: Egyptian Arabic conversational podcast summaries, blackboard video animations, interactive comprehension quizzes, and comprehensive study guides.

## Positioning
Unlike generic AI document summarizers, this platform speaks authentic Egyptian dialect tailored specifically to the curriculum, exam expectations, and terminology of Beni-Suef University. It supports dual-professor courses (like 'تعليم ورياده اعمال' taught by both Dr. Marwa and Dr. Walid) with isolated syllabus tracks and unified card access.

## Operating Context
- Students access the platform via modern web browsers on both smartphones (primarily mobile viewport 360px-420px) and laptops.
- Raw lecture PDFs are ingested via the administrative dashboard and processed by a detached asynchronous pipeline.
- Assets are hosted permanently on a free Telegram CDN channel with structured metadata mirrored in Supabase PostgreSQL.

## Capabilities and Constraints
- **Multi-Doctor Tracks:** Support multiple professors teaching distinct halves of a single academic course under one unified card with tabbed lecture explorers.
- **Decoupled Pipeline:** Fast textual metadata availability (<30s) while heavy video/audio generation occurs in the background.
- **Strict LaTeX / Math Handling:** Mathematical expressions render exclusively in LTR via KaTeX with zero bidirectional distortion in RTL Arabic layout.
- **Language Mode:** Student-facing interface and AI audio/video explanations employ natural, encouraging Egyptian Arabic.

## Brand Commitments
- **Name:** بوابة قسم الرياضيات الذكية | جامعة بني سويف (Smart Mathematics Portal | Beni-Suef University).
- **Tone & Voice:** Warm, collegiate, highly encouraging ("يا بطل", "عاش يا دكتور"), mathematically rigorous yet accessible.
- **Identity:** Academic sapphire and deep midnight canvas, clean typography powered by Cairo and KaTeX.

## Evidence on Hand
- Live PostgreSQL database in Supabase (`lectures` table with `doctor` track column and JSONB asset manifests).
- Telethon integration (`academic_telethon.session`) linked to private Telegram Channel `المنصه` (`-1004453609138`).
- 11 registered departmental subjects with curated system prompts in `app/services/prompt_service.py`.

## Product Principles
1. **Zero Mathematical Ambiguity:** Mathematical formulas and theorems take precedence over decorative UI elements.
2. **Accessible Everywhere:** Every feature works seamlessly on mid-range Android/iOS phones on university campus Wi-Fi.
3. **Impeccable Craftsmanship:** No AI slop, no generic tri-color gradients, no cramped mobile targets.
