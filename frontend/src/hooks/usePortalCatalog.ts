'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import {
  getDirectSupabaseSubjects,
  getDirectSupabaseLectures,
} from '@/lib/supabase';
import { AcademicSubject } from '@/types/academic';
import { trackSessionStarted } from '@/modules/telemetry';
import { mergeSubjects } from '@/lib/subjectMeta';

export interface PortalLectureItem {
  id: number;
  lecture_num: number;
  title: string;
  doctor?: string | null;
  status: string;
  stage_info?: string | null;
  created_at: string;
  assets_count: number;
  study_resources_count?: number;
  has_audio?: boolean;
  has_video?: boolean;
  has_quiz?: boolean;
  has_guide?: boolean;
  has_flashcards?: boolean;
  is_ready?: boolean;
}

export type CohortMomentumMap = Record<
  string | number,
  {
    weekly_activity_count: number;
    today_activity_count: number;
    badge?: string | null;
    badge_text?: string | null;
  }
>;

export function usePortalCatalog() {
  // Instant 0ms hydration: load from cache or canonical courses immediately
  const [subjects, setSubjects] = useState<AcademicSubject[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('bsu_cached_subjects');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return mergeSubjects([]);
  });

  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  // Default active subject: Differential Geometry (id 11) with instant active state
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bsu_active_subject_id');
        if (saved && !isNaN(parseInt(saved))) return parseInt(saved);
      } catch {}
    }
    return 11;
  });

  const [selectedDoctor, setSelectedDoctor] = useState<string>('الكل');

  // Instant 0ms hydration for lectures
  const [subjectLectures, setSubjectLectures] = useState<PortalLectureItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('bsu_cached_lectures_11');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: 1,
        lecture_num: 1,
        title: 'المحاضرة 1: مفهوم المنحنى وطول القوس ومماس الوحدة',
        doctor: 'د/ سيد',
        status: 'completed',
        stage_info: null,
        created_at: '2026-10-15T00:00:00Z',
        assets_count: 5,
        study_resources_count: 5,
        has_audio: true,
        has_video: false,
        has_quiz: true,
        has_guide: true,
        has_flashcards: true,
        is_ready: true,
      },
    ];
  });

  const [isLoadingLectures, setIsLoadingLectures] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cohortMomentum, setCohortMomentum] = useState<CohortMomentumMap>({});

  // Passive Cohort Momentum Fetch
  useEffect(() => {
    let isMounted = true;
    fetch(getApiUrl('/api/stats/momentum'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          const map = data.momentum || data;
          setCohortMomentum(map);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize session KPI telemetry on first visit
  useEffect(() => {
    try {
      let sessId = sessionStorage.getItem('bsu_session_id');
      if (!sessId) {
        sessId = 'sess_' + Math.random().toString(36).substring(2, 11);
        sessionStorage.setItem('bsu_session_id', sessId);
        sessionStorage.setItem('bsu_session_start_ts', String(Date.now()));
        const isMobile = window.innerWidth < 768;
        trackSessionStarted(sessId, isMobile ? 'mobile' : 'desktop');
      }
    } catch {}
  }, []);

  // Switch Semester and auto-select appropriate active subject
  const handleSemesterChange = (semester: 1 | 2) => {
    setSelectedSemester(semester);
    const targetSubjects = subjects.filter((s) => (s.semester ?? 1) === semester);
    if (targetSubjects.length > 0) {
      const stillValid = targetSubjects.some((s) => s.id === activeSubjectId);
      if (!stillValid) {
        setActiveSubjectId(targetSubjects[0].id);
      }
    } else {
      setActiveSubjectId(null);
    }
  };

  // 1. Fetch Subjects on Mount (Supabase Edge Revalidation)
  useEffect(() => {
    setIsLoadingSubjects(true);
    getDirectSupabaseSubjects()
      .then((data) => {
        const unified = mergeSubjects(data);
        setSubjects(unified);
        try {
          localStorage.setItem('bsu_cached_subjects', JSON.stringify(unified));
        } catch {}

        const term1 = unified.filter((s) => (s.semester ?? 1) === 1);
        const diff = term1.find((s) => s.name === 'هندسة تفاضلية');
        setActiveSubjectId((prev) => {
          if (prev && unified.some((s) => s.id === prev)) return prev;
          return diff ? diff.id : (term1[0]?.id ?? unified[0]?.id ?? null);
        });
      })
      .catch((err) => {
        console.warn('Supabase edge subjects fetch failed, trying fast fallback:', err);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        fetch(getApiUrl('/api/subjects'), { signal: controller.signal })
          .then((res) => res.json())
          .then((data) => {
            clearTimeout(timeoutId);
            const unified = mergeSubjects(data);
            setSubjects(unified);
            try {
              localStorage.setItem('bsu_cached_subjects', JSON.stringify(unified));
            } catch {}
          })
          .catch(() => {});
      })
      .finally(() => setIsLoadingSubjects(false));
  }, []);

  // 2. Fetch Subject Lectures when activeSubjectId changes (Supabase Edge First)
  useEffect(() => {
    if (!activeSubjectId) return;
    try {
      localStorage.setItem('bsu_active_subject_id', String(activeSubjectId));
    } catch {}

    const currentSubj = subjects.find((s) => s.id === activeSubjectId);
    if (currentSubj?.doctors && currentSubj.doctors.length > 1) {
      setSelectedDoctor(currentSubj.doctors[0]);
    } else {
      setSelectedDoctor('الكل');
    }

    try {
      const cached = localStorage.getItem(`bsu_cached_lectures_${activeSubjectId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSubjectLectures(parsed);
        }
      }
    } catch {}

    setIsLoadingLectures(true);

    getDirectSupabaseLectures(activeSubjectId)
      .then((data) => {
        const lecs = Array.isArray(data) ? (data as PortalLectureItem[]) : [];
        setSubjectLectures(lecs);
        try {
          localStorage.setItem(`bsu_cached_lectures_${activeSubjectId}`, JSON.stringify(lecs));
        } catch {}
      })
      .catch((err) => {
        console.warn('Direct Supabase lectures failed, trying fast fallback:', err);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        fetch(getApiUrl(`/api/subjects/${activeSubjectId}/lectures`), { signal: controller.signal })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            clearTimeout(timeoutId);
            const lecs = Array.isArray(data) ? (data as PortalLectureItem[]) : [];
            setSubjectLectures(lecs);
            try {
              localStorage.setItem(`bsu_cached_lectures_${activeSubjectId}`, JSON.stringify(lecs));
            } catch {}
          })
          .catch(() => {});
      })
      .finally(() => setIsLoadingLectures(false));
  }, [activeSubjectId, subjects]);

  const semesterSubjects = subjects.filter((s) => (s.semester ?? 1) === selectedSemester);
  const filteredSubjects = semesterSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.canonicalDoctor && s.canonicalDoctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.doctors && s.doctors.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const activeSubject = subjects.find((s) => s.id === activeSubjectId);

  const displayedLectures = subjectLectures
    .filter((l) => l.status !== 'failed')
    .filter((l) => {
      if (
        activeSubject?.doctors &&
        activeSubject.doctors.length > 1 &&
        selectedDoctor &&
        selectedDoctor !== 'الكل'
      ) {
        return l.doctor === selectedDoctor;
      }
      return true;
    });

  return {
    subjects,
    selectedSemester,
    activeSubjectId,
    setActiveSubjectId,
    selectedDoctor,
    setSelectedDoctor,
    subjectLectures,
    isLoadingLectures,
    isLoadingSubjects,
    searchQuery,
    setSearchQuery,
    cohortMomentum,
    handleSemesterChange,
    filteredSubjects,
    activeSubject,
    displayedLectures,
  };
}
