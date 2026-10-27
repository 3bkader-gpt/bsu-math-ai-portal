/**
 * Shared Academic Types for BSU Math AI Portal.
 * 
 * Consolidates core academic entity definitions across Supabase edge loading,
 * backend API responses, student views, and administrative dashboards.
 */

/**
 * Core Academic Subject representation.
 * Represents courses offered across Semester 1 and Semester 2.
 */
export interface AcademicSubject {
  id: number;
  name: string;
  semester?: number; // 1 for First Semester, 2 for Second Semester (defaults to 1 for legacy records)
  has_prompt: boolean;
  lecture_count: number;
  doctors?: string[];
  canonicalDoctor?: string;
  icon?: string;
}

/**
 * Canonical course metadata used for mapping, deduplication, and presentation.
 */
export interface CanonicalCourse {
  canonicalName: string;
  doctor: string;
  icon: string;
  aliases: string[];
  fallbackId: number;
  semester?: number;
}

/**
 * Core Academic Lecture representation.
 * Represents individual lectures within an academic subject.
 */
export interface AcademicLecture {
  id: number;
  lecture_num: number;
  title: string;
  doctor?: string | null;
  status: string;
  stage_info?: string | null;
  created_at: string;
  assets_count?: number;
  study_resources_count?: number;
  has_audio?: boolean;
  has_video?: boolean;
  has_quiz?: boolean;
  has_guide?: boolean;
  has_flashcards?: boolean;
  is_ready?: boolean;
  source_pdf_url?: string | null;
}

/**
 * Core Media Asset representation.
 * Represents multimodal outputs (Audio, Video, Quizzes, Study Guides, Flashcards).
 */
export interface AcademicMediaAsset {
  id: number;
  asset_type: string;
  title: string;
  file_size_bytes?: number | null;
  has_telegram: boolean;
  stream_url: string;
  telegram_file_id?: string | null;
  telegram_message_id?: number | null;
  content_text?: string | null;
  local_file_path?: string | null;
  file_url?: string | null;
  is_available?: boolean;
}

/**
 * Full lecture bundle including nested media assets.
 */
export interface AcademicLectureBundle {
  id: number;
  subject_id: number;
  subject_name?: string;
  lecture_num: number;
  title: string;
  doctor: string | null;
  status: string;
  stage_info: string | null;
  error_message: string | null;
  assets: AcademicMediaAsset[];
  created_at: string;
  source_pdf_url?: string | null;
}

// Aliases for backward compatibility and clean domain naming
export type Subject = AcademicSubject;
export type Lecture = AcademicLecture;
export type MediaAsset = AcademicMediaAsset;
export type LectureBundle = AcademicLectureBundle;
