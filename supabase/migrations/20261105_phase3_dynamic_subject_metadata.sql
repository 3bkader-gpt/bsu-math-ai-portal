-- ==============================================================================
-- Migration: 20261105_phase3_dynamic_subject_metadata.sql
-- Description:
--   Phase 3.1 — Single Source of Truth for Academic Subject Metadata & Multi-Cohort
--   Readiness (`year_level`, `icon`, `doctors`, `theme_config`).
--   Allows adding new courses, cohorts (Years 1-4), doctors, and visual themes
--   directly in the database without code deployments.
-- ==============================================================================

-- 1. Add dynamic curriculum & multi-cohort columns to `public.subjects`
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS year_level SMALLINT NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS icon VARCHAR(20) DEFAULT '📚',
    ADD COLUMN IF NOT EXISTS doctors JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS theme_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Add index on (year_level, semester) for multi-cohort filtering
CREATE INDEX IF NOT EXISTS idx_subjects_year_semester
    ON public.subjects (year_level, semester);

-- 3. Backfill canonical BSU 2nd-Year Math metadata into existing rows
UPDATE public.subjects SET
    icon = '📐',
    doctors = '["د/ سيد"]'::jsonb,
    theme_config = '{"charm": "🎀", "badgeTag": "منحنيات وفضاء 🎀", "glowColor": "#FB7185", "boysBadgeTag": "منحنيات وفضاء", "boysGlowColor": "#06B6D4"}'::jsonb
WHERE name IN ('هندسة تفاضلية', 'هندسه تفاضلية');

UPDATE public.subjects SET
    icon = '🔢',
    doctors = '["د/ محمد حسين"]'::jsonb,
    theme_config = '{"charm": "🌸", "badgeTag": "أعداد ومنطق 🌸", "glowColor": "#F59E0B", "boysBadgeTag": "أعداد ومنطق", "boysGlowColor": "#6366F1"}'::jsonb
WHERE name IN ('مقدمة في نظرية العدد والمنطق', 'نظريه عدد ومنطق');

UPDATE public.subjects SET
    icon = '∫',
    doctors = '["د/ حسين"]'::jsonb,
    theme_config = '{"charm": "✨", "badgeTag": "معادلات وتفاضل ✨", "glowColor": "#D946EF", "boysBadgeTag": "معادلات وتفاضل", "boysGlowColor": "#F59E0B"}'::jsonb
WHERE name IN ('معادلات تفاضلية');

UPDATE public.subjects SET
    icon = '🚀',
    doctors = '["د/ مروة ذكري"]'::jsonb,
    theme_config = '{"charm": "🍓", "badgeTag": "حركة وطاقة 🍓", "glowColor": "#F43F5E", "boysBadgeTag": "سرعة وتسارع", "boysGlowColor": "#3B82F6"}'::jsonb
WHERE name IN ('ديناميكا (٢)', 'ديناميكا 2');

UPDATE public.subjects SET
    icon = '⚖️',
    doctors = '["د/ ايه"]'::jsonb,
    theme_config = '{"charm": "🌷", "badgeTag": "اتزان وقوى 🌷", "glowColor": "#A855F7", "boysBadgeTag": "اتزان وقوى", "boysGlowColor": "#10B981"}'::jsonb
WHERE name IN ('استاتيكا (٢)', 'استاتيكا2');

UPDATE public.subjects SET
    icon = '🧲',
    doctors = '["د/ حسن سيد"]'::jsonb,
    theme_config = '{"charm": "💖", "badgeTag": "دوائر وتيار 💖", "glowColor": "#06B6D4", "boysBadgeTag": "تيار ومجالات", "boysGlowColor": "#14B8A6"}'::jsonb
WHERE name IN ('كهربية ومغناطيسية وتيار متردد', 'كهربيه مغناطيسية وتيار متردد');

UPDATE public.subjects SET
    icon = '🔬',
    doctors = '["د/ سيد"]'::jsonb,
    theme_config = '{"charm": "🪞", "badgeTag": "معمل وتجارب 🪞", "glowColor": "#10B981", "boysBadgeTag": "معمل وتجارب", "boysGlowColor": "#0EA5E9"}'::jsonb
WHERE name IN ('عملي فيزياء');

UPDATE public.subjects SET
    icon = '💼',
    doctors = '["د/ مروة", "د/ وليد"]'::jsonb,
    theme_config = '{"charm": "🧸", "badgeTag": "بيزنس ومشاريع 🧸", "glowColor": "#F97316", "boysBadgeTag": "بيزنس ومشاريع", "boysGlowColor": "#F97316"}'::jsonb
WHERE name IN ('التعليم وريادة الأعمال', 'تعليم ورياده اعمال');

UPDATE public.subjects SET
    icon = '🎓',
    doctors = '["د/ عبدالرحمن برعي"]'::jsonb,
    theme_config = '{"charm": "🍰", "badgeTag": "شرح ومهارات 🍰", "glowColor": "#EC4899", "boysBadgeTag": "شرح وتدريب", "boysGlowColor": "#F43F5E"}'::jsonb
WHERE name IN ('تدريس مصغر');

UPDATE public.subjects SET
    icon = '💻',
    doctors = '["د/ ايمان", "د/ ايه"]'::jsonb,
    theme_config = '{"charm": "🌸", "badgeTag": "ديجيتال وتطوير 🌸", "glowColor": "#6366F1", "boysBadgeTag": "ذكاء وتطوير", "boysGlowColor": "#8B5CF6"}'::jsonb
WHERE name IN ('تكنولوجيا التعليم', 'تكنولوجيا والتحول الرقمي');

UPDATE public.subjects SET
    icon = '📚',
    doctors = '["د/ عزام"]'::jsonb,
    theme_config = '{"charm": "☕", "badgeTag": "تنظيم ونوتس ☕", "glowColor": "#EAB308", "boysBadgeTag": "تنظيم ومعرفة", "boysGlowColor": "#EAB308"}'::jsonb
WHERE name IN ('إدارة المعرفة', 'اداره معرفه');

UPDATE public.subjects SET
    icon = '🏛️',
    doctors = '["د/ طه ابراهيم"]'::jsonb,
    theme_config = '{"charm": "✨", "badgeTag": "علماء وتاريخ ✨", "glowColor": "#14B8A6", "boysBadgeTag": "فلسفة وعلماء", "boysGlowColor": "#A855F7"}'::jsonb
WHERE name IN ('فلسفة وتاريخ الرياضيات', 'فلسفه وتاريخ رياضيات');

NOTIFY pgrst, 'reload schema';
