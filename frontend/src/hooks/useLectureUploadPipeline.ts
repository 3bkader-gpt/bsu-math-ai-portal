'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import {
  getDirectSupabaseSubjects,
  getDirectSupabaseLectures,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '@/lib/supabase';
import {
  AcademicSubject as Subject,
  AcademicLecture as Lecture,
} from '@/types/academic';

const MAX_PDF_BYTES = 45 * 1024 * 1024;

export function useLectureUploadPipeline() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [adminUser, setAdminUser] = useState<string>('admin');
  const [token, setToken] = useState<string>('');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [subjectLectures, setSubjectLectures] = useState<Lecture[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  const [lectureNum, setLectureNum] = useState<number>(1);
  const [lectureTitle, setLectureTitle] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  const [activeTrackingId, setActiveTrackingId] = useState<number | null>(null);
  const [trackedLecture, setTrackedLecture] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const data = await getDirectSupabaseSubjects();
      const cleanData = (data || []).filter((s: any) => s.name && s.name.trim() !== 'كتب كامله');
      if (cleanData.length > 0) {
        setSubjects(cleanData);
        if (!selectedSubjectId) {
          setSelectedSubjectId(cleanData[0].id);
        }
        return;
      }
    } catch (err) {
      console.warn('Direct Supabase fetch failed, trying local API fallback:', err);
    }

    try {
      const res = await fetch(getApiUrl('/api/subjects'));
      if (res.ok) {
        const raw = await res.json();
        const cleanData = (Array.isArray(raw) ? raw : []).filter((s: any) => s.name && s.name.trim() !== 'كتب كامله');
        setSubjects(cleanData);
        if (cleanData.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(cleanData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // 1. Check Auth & Load Subjects on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser') || 'admin';
    if (savedToken && savedToken.startsWith('bsu_master_academic_')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      router.push('/admin');
      return;
    }
    if (!savedToken) {
      router.push('/admin');
      return;
    }
    setToken(savedToken);
    setAdminUser(savedUser);
    fetchSubjects();
  }, [router]);

  // 2. Fetch lectures whenever selected subject or doctor changes
  useEffect(() => {
    if (!selectedSubjectId) return;
    const currentSub = subjects.find((s) => s.id === selectedSubjectId);
    if (currentSub?.doctors && currentSub.doctors.length > 0) {
      if (!selectedDoctor || !currentSub.doctors.includes(selectedDoctor)) {
        setSelectedDoctor(currentSub.doctors[0]);
        return;
      }
    } else {
      if (selectedDoctor) setSelectedDoctor('');
    }

    const fetchLectures = async () => {
      try {
        const data = await getDirectSupabaseLectures(selectedSubjectId, selectedDoctor || undefined);
        if (data) {
          setSubjectLectures(data as Lecture[]);
          const relevant = data.filter((l: any) => !selectedDoctor || l.doctor === selectedDoctor);
          const maxNum = relevant.reduce((max: number, l: any) => Math.max(max, l.lecture_num), 0);
          setLectureNum(maxNum + 1);
          setLectureTitle(`المحاضرة ${maxNum + 1}`);
          return;
        }
      } catch (e) {
        console.warn('Direct Supabase lecture fetch failed, trying local API:', e);
      }

      try {
        const res = await fetch(getApiUrl(`/api/subjects/${selectedSubjectId}/lectures`));
        if (res.ok) {
          const data = await res.json();
          setSubjectLectures(data);
          const relevant = data.filter((l: Lecture) => !selectedDoctor || l.doctor === selectedDoctor);
          const maxNum = relevant.reduce((max: number, l: Lecture) => Math.max(max, l.lecture_num), 0);
          setLectureNum(maxNum + 1);
          setLectureTitle(`المحاضرة ${maxNum + 1}`);
        }
      } catch (err) {
        console.error('Failed to load lectures:', err);
      }
    };
    fetchLectures();
  }, [selectedSubjectId, selectedDoctor, subjects]);

  // 3. Poll active tracking lecture directly from Supabase Edge
  useEffect(() => {
    if (!activeTrackingId) return;

    let intervalId: any = null;
    const checkStatus = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/lectures?id=eq.${activeTrackingId}&select=id,lecture_num,title,doctor,status,stage_info,error_message,media_assets(*)`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const l = rows[0];
            const assets = (l.media_assets || []).map((a: any) => ({
              id: a.id,
              asset_type: a.asset_type,
              title: a.title,
              file_size_bytes: a.file_size_bytes || 0,
              has_telegram: Boolean(a.telegram_file_id),
              stream_url: getApiUrl(`/api/stream/${a.id}`),
            }));
            setTrackedLecture({
              id: l.id,
              lecture_num: l.lecture_num,
              title: l.title,
              doctor: l.doctor,
              status: l.status,
              stage_info: l.stage_info,
              error_message: l.error_message,
              assets,
            });
            if (l.status === 'completed' || l.status === 'failed') {
              setIsPolling(false);
              clearInterval(intervalId);
              if (selectedSubjectId) {
                const refreshed = await getDirectSupabaseLectures(selectedSubjectId, selectedDoctor || undefined);
                if (refreshed) setSubjectLectures(refreshed as Lecture[]);
              }
            }
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    };

    setIsPolling(true);
    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [activeTrackingId, selectedSubjectId, selectedDoctor]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin');
  };

  const validatePdf = async (file: File): Promise<string | null> => {
    if (file.size > MAX_PDF_BYTES) {
      return `الملف '${file.name}' كبير جداً (${(file.size / (1024 * 1024)).toFixed(1)} ميجا) — الحد الأقصى 45 ميجابايت`;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return `الملف '${file.name}' ليس PDF — يُقبل ملف المحاضرة بصيغة PDF فقط`;
    }
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const signature = String.fromCharCode(...head);
    if (signature !== '%PDF-') {
      return `الملف '${file.name}' ليس PDF حقيقياً (المحتوى لا يطابق صيغة PDF)`;
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      const newValidFiles: File[] = [];
      for (const file of incoming) {
        const error = await validatePdf(file);
        if (error) {
          setUploadError(`تنبيه بخصوص ${file.name}: ${error}`);
          continue;
        }
        newValidFiles.push(file);
      }
      if (newValidFiles.length > 0) {
        setSelectedFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const unique = newValidFiles.filter((f) => !existingNames.has(f.name));
          return [...prev, ...unique];
        });
        setUploadError('');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const incoming = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      if (incoming.length === 0) {
        setUploadError('يرجى سحب ملفات بصيغة PDF فقط');
        return;
      }
      const newValidFiles: File[] = [];
      for (const file of incoming) {
        const error = await validatePdf(file);
        if (error) {
          setUploadError(`تنبيه بخصوص ${file.name}: ${error}`);
          continue;
        }
        newValidFiles.push(file);
      }
      if (newValidFiles.length > 0) {
        setSelectedFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const unique = newValidFiles.filter((f) => !existingNames.has(f.name));
          return [...prev, ...unique];
        });
        setUploadError('');
      }
    }
  };

  const handleRemoveFile = (indexToRemove: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllFiles = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!selectedSubjectId) {
      setUploadError('يرجى اختيار المادة أولاً');
      return;
    }

    if (selectedFiles.length === 0) {
      setUploadError('يرجى اختيار ملف PDF واحد على الأقل للمحاضرة');
      return;
    }

    const currentSub = subjects.find((s) => s.id === selectedSubjectId);
    if (!currentSub) {
      setUploadError('بيانات المادة غير صالحة');
      return;
    }

    setIsUploading(true);

    const PRODUCTION_CLOUD_APIS = ['https://api.bsumath.bond'];
    const apiBase = getApiBaseUrl();
    const canBackendProcess = !PRODUCTION_CLOUD_APIS.includes(apiBase);

    let uploadDone = false;
    if (canBackendProcess) {
      try {
        const formData = new FormData();
        formData.append('subject_id', selectedSubjectId.toString());
        formData.append('lecture_num', lectureNum.toString());
        if (selectedDoctor) formData.append('doctor', selectedDoctor);
        if (lectureTitle) formData.append('title', lectureTitle);
        selectedFiles.forEach((file) => formData.append('files', file));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          setActiveTrackingId(data.lecture_id);
          setSelectedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          uploadDone = true;
        }
      } catch {
        // Proceed with autonomous cloud pipeline
      }
    }

    if (uploadDone) {
      setIsUploading(false);
      return;
    }

    try {
      const uploadedFilesInfo: { url: string; title: string; size: number }[] = [];

      for (const file of selectedFiles) {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageKey = `${selectedSubjectId}/lec${lectureNum}/${Date.now()}_${cleanFileName}`;

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/lectures/${storageKey}`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/pdf',
              'x-upsert': 'true',
            },
            body: file,
          }
        );

        if (!uploadRes.ok) {
          throw new Error(`فشل رفع ملف (${file.name}) إلى سيرفر التخزين السحابي`);
        }

        const publicPdfUrl = `${SUPABASE_URL}/storage/v1/object/public/lectures/${storageKey}`;
        uploadedFilesInfo.push({
          url: publicPdfUrl,
          title: file.name,
          size: file.size,
        });
      }

      const registerRes = await fetch(getApiUrl('/api/lectures/register'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          lecture_num: lectureNum,
          title: lectureTitle || `المحاضرة ${lectureNum}`,
          doctor: selectedDoctor || null,
          source_pdf_url: uploadedFilesInfo[0].url,
          files: uploadedFilesInfo,
        }),
      });

      if (!registerRes.ok) {
        if (registerRes.status === 401) {
          throw new Error('انتهت صلاحية جلسة تسجيل الدخول، يرجى تسجيل الدخول مجدداً');
        }
        const errJson = await registerRes.json().catch(() => ({}));
        throw new Error(errJson.detail || 'فشل تسجيل المحاضرة في قاعدة البيانات السحابية');
      }

      const upsertResult = await registerRes.json();
      const lectureId: number = upsertResult.id;

      setActiveTrackingId(lectureId);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Autonomous cloud upload error:', err);
      const isNetworkError =
        err instanceof TypeError ||
        /failed to fetch|networkerror|load failed/i.test(String(err?.message));
      setUploadError(
        isNetworkError
          ? 'تعذر الاتصال بالسيرفر السحابي — اتأكدي من الإنترنت وحاولي تاني.'
          : err?.message || 'حدث خطأ أثناء الرفع السحابي'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return {
    adminUser,
    token,
    subjects,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedSubject,
    selectedDoctor,
    setSelectedDoctor,
    subjectLectures,
    isLoadingSubjects,
    lectureNum,
    setLectureNum,
    lectureTitle,
    setLectureTitle,
    selectedFiles,
    isUploading,
    uploadError,
    activeTrackingId,
    setActiveTrackingId,
    trackedLecture,
    isPolling,
    fileInputRef,
    handleLogout,
    handleFileChange,
    handleDrop,
    handleRemoveFile,
    handleClearAllFiles,
    handleUploadSubmit,
  };
}
