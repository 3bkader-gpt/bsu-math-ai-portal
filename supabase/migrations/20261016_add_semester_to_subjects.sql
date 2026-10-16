-- ========================================================================
-- Migration: Add `semester` column to `subjects` table
-- Project: BSU Math AI Portal (Phase 3 - Step 2)
-- Description:
--   Introduces semester separation (Semester 1 vs Semester 2).
--   Preserves all existing subject records, relationships, and IDs.
--   Enforces integer values 1 or 2, defaulting to 1 for backward compatibility.
-- ========================================================================

-- 1. Add semester column with default 1 (NOT NULL)
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS semester SMALLINT DEFAULT 1 NOT NULL;

-- 2. Add check constraint to restrict values to supported semesters (1 or 2)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'check_subjects_semester'
    ) THEN
        ALTER TABLE public.subjects 
        ADD CONSTRAINT check_subjects_semester CHECK (semester IN (1, 2));
    END IF;
END $$;

-- 3. Explicitly ensure all existing legacy subjects are assigned to Semester 1
UPDATE public.subjects 
SET semester = 1 
WHERE semester IS NULL OR semester NOT IN (1, 2);

-- 4. Create index for high-speed filtering by semester
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(semester);

-- 5. Notify PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
