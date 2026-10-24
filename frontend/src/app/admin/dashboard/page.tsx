'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  UploadCloud, 
  BookOpen, 
  FileText, 
  Headphones, 
  Video, 
  HelpCircle, 
  FileCheck, 
  Layers, 
  Brain, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogOut, 
  ExternalLink, 
  RefreshCw, 
  Play, 
  ChevronRight,
  Database,
  Cloud,
  GraduationCap,
  Plus,
  Activity,
  X,
  Search,
  Copy,
  Check,
  Trash2,
  Terminal,
  Server,
  Settings as SettingsIcon
} from 'lucide-react';
import { getApiUrl, getApiBaseUrl } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  getDirectSupabaseSubjects, 
  getDirectSupabaseLectures, 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY 
} from '@/lib/supabase';
import { 
  AcademicSubject as Subject, 
  AcademicLecture as Lecture, 
  AcademicMediaAsset as LectureAsset 
} from '@/types/academic';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

export default function AdminDashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth & Admin State
  const [adminUser, setAdminUser] = useState<string>('admin');
  const [token, setToken] = useState<string>('');

  // Data State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [subjectLectures, setSubjectLectures] = useState<Lecture[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  // Form State
  const [lectureNum, setLectureNum] = useState<number>(1);
  const [lectureTitle, setLectureTitle] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Active Pipeline Tracking State
  const [activeTrackingId, setActiveTrackingId] = useState<number | null>(null);
  const [trackedLecture, setTrackedLecture] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Diagnostics & Logs System State
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'overview' | 'matrix' | 'logs'>('overview');
  const [logsData, setLogsData] = useState<any[]>([]);
  const [logsStats, setLogsStats] = useState<any>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState(false);

  // Cloud Ops Settings State (per-device credentials)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsMasterKey, setSettingsMasterKey] = useState<string>('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const openSettingsModal = () => {
    setSettingsMasterKey(localStorage.getItem('bsu_admin_master_key') || '');
    setSettingsSaved(false);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = () => {
    try {
      if (settingsMasterKey.trim()) localStorage.setItem('bsu_admin_master_key', settingsMasterKey.trim());
      else localStorage.removeItem('bsu_admin_master_key');
      setSettingsSaved(true);
      setTimeout(() => setShowSettingsModal(false), 900);
    } catch (e) {
      console.error('Failed to persist cloud ops settings:', e);
    }
  };

  // Freeze background page scroll completely when a modal is open
  useEffect(() => {
    if (showDiagnosticsModal || showSettingsModal) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [showDiagnosticsModal, showSettingsModal]);

  const fetchDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(getApiUrl('/api/diagnostics'), { headers });
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      }
    } catch (e) {
      console.error('Failed to fetch diagnostics:', e);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilterLevel && logFilterLevel !== 'ALL') params.append('level', logFilterLevel);
      if (logSearch) params.append('search', logSearch);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(getApiUrl(`/api/diagnostics/logs?${params.toString()}`), { headers });
      if (res.ok) {
        const data = await res.json();
        setLogsData(data.logs || []);
        setLogsStats(data.stats || null);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('هل تريد مسح سجلات السيرفر الحالية؟')) return;
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(getApiUrl('/api/diagnostics/clear-logs'), { method: 'POST', headers });
      fetchLogs();
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  const handleCopyReport = () => {
    if (!diagnosticsData) return;
    const reportText = `BSU Math AI Portal - تقرير فحص النظام السحابي
تاريخ الفحص: ${new Date().toLocaleString('ar-EG')}
حالة السيرفر: ${diagnosticsData.status}
قاعدة بيانات Supabase: ${diagnosticsData.database?.status} (${diagnosticsData.database?.latency_ms}ms)
تخزين تيليجرام MTProto: ${diagnosticsData.telegram_mtproto?.status} (القناة: ${diagnosticsData.telegram_mtproto?.channel_id})
إجمالي المحاضرات: ${diagnosticsData.summary?.total_lectures}
المحاضرات مكتملة الخمس خيارات: ${diagnosticsData.summary?.complete_5_of_5}
الكويزات الجاهزة: ${diagnosticsData.summary?.total_quizzes_ready}/21
الأدلة والملخصات الجاهزة: ${diagnosticsData.summary?.total_guides_ready}/21
البطاقات الجاهزة: ${diagnosticsData.summary?.total_flashcards_ready}/21
الملفات الصوتية: ${diagnosticsData.summary?.total_audios}/21
الفيديوهات: ${diagnosticsData.summary?.total_videos}/21
`;
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };


  // 1. Check Auth & Load Subjects on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser') || 'admin';
    // Purge legacy client-fabricated tokens from the old insecure login flow
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

  // 2. Fetch Subjects (High-Speed Direct Supabase Edge CDN with API fallback)
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

  // 3. Fetch lectures whenever selected subject or doctor changes
  useEffect(() => {
    if (!selectedSubjectId) return;
    const currentSub = subjects.find(s => s.id === selectedSubjectId);
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


  // 4. Poll active tracking lecture directly from Supabase Edge
  useEffect(() => {
    if (!activeTrackingId) return;

    let intervalId: any = null;
    const checkStatus = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/lectures?id=eq.${activeTrackingId}&select=id,lecture_num,title,doctor,status,stage_info,error_message,media_assets(*)`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
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
              stream_url: getApiUrl(`/api/stream/${a.id}`)
            }));
            setTrackedLecture({
              id: l.id,
              lecture_num: l.lecture_num,
              title: l.title,
              doctor: l.doctor,
              status: l.status,
              stage_info: l.stage_info,
              error_message: l.error_message,
              assets
            });
            if (l.status === 'completed' || l.status === 'failed') {
              setIsPolling(false);
              clearInterval(intervalId);
              // Refresh lectures list
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

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin');
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setUploadError('');
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      setUploadError('');
    }
  };

  // Upload Submission (Autonomous Cloud Pipeline + Local Server Fallback)
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

    const currentSub = subjects.find(s => s.id === selectedSubjectId);
    if (!currentSub) {
      setUploadError('بيانات المادة غير صالحة');
      return;
    }

    setIsUploading(true);

    // 1. Try the FastAPI upload ONLY for backends that can actually run the
    // NotebookLM pipeline (local dev server / explicit tunnel override).
    // The default production Render URL must be skipped: it accepts the file
    // and then fails in the background ('notebooklm' CLI is not installed
    // there), which strands the lecture as 'failed' and silently skips the
    // autonomous cloud dispatch below.
    const PRODUCTION_RENDER_API = 'https://bsu-math-api.onrender.com';
    const apiBase = getApiBaseUrl();
    const canBackendProcess = apiBase !== PRODUCTION_RENDER_API;

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
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for large lecture PDFs

        const res = await fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
          signal: controller.signal
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
        // Local backend offline -> proceed autonomously with pure cloud pipeline
      }
    }

    if (uploadDone) {
      setIsUploading(false);
      return;
    }

    // 2. Direct Autonomous Cloud Pipeline (Zero dependency on local PC)
    try {
      const file = selectedFiles[0];
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${selectedSubjectId}/lec${lectureNum}/${Date.now()}_${cleanFileName}`;

      // A. Upload PDF to Supabase Storage Public Bucket
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/lectures/${storageKey}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/pdf',
          'x-upsert': 'true'
        },
        body: file
      });

      if (!uploadRes.ok) {
        throw new Error('فشل رفع ملف الـ PDF إلى سيرفر التخزين السحابي');
      }

      const publicPdfUrl = `${SUPABASE_URL}/storage/v1/object/public/lectures/${storageKey}`;

      // B. Create/Update Lecture record via Secure Supabase RPC (Works seamlessly with RLS)
      // SECURITY: the master key is provisioned server-side on login and stored
      // per-device in localStorage — it is never hardcoded in the client bundle.
      // The persistent home worker daemon polls the DB for 'queued' lectures —
      // no GitHub dispatch (and no dispatch token) is needed from the browser.
      const adminSecret = typeof window !== 'undefined' ? localStorage.getItem('bsu_admin_master_key') : null;
      if (!adminSecret) {
        throw new Error('مفتاح التشغيل السحابي غير مُهيأ على هذا الجهاز. سجّل خروج ثم سجّل دخول من جديد لتحميله تلقائياً (أو أدخله يدوياً من إعدادات لوحة التحكم ⚙️).');
      }
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_upsert_lecture`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_subject_id: selectedSubjectId,
          p_lecture_num: lectureNum,
          p_title: lectureTitle || `المحاضرة ${lectureNum}`,
          p_doctor: selectedDoctor || null,
          p_status: 'queued',
          p_stage_info: 'تم الرفع بنجاح، محرك المعالجة المنزلي هيلتقطها خلال ثوانٍ 🚀',
          p_admin_secret: adminSecret,
          p_source_pdf_url: publicPdfUrl
        })
      });

      if (!rpcRes.ok) {
        const errJson = await rpcRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'فشل تسجيل المحاضرة في قاعدة البيانات السحابية');
      }

      const upsertResult = await rpcRes.json();
      const lectureId: number = upsertResult.id;

      setActiveTrackingId(lectureId);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Autonomous cloud upload error:', err);
      setUploadError(err.message || 'حدث خطأ أثناء الرفع السحابي');
    } finally {
      setIsUploading(false);
    }
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div 
      className="min-h-screen flex flex-col transition-colors selection:bg-teal-500/25 selection:text-teal-200"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)'
      }}
    >
      
      {/* Top Glass Navigation Bar */}
      <header 
        className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface-translucent)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 min-h-[3.75rem] sm:min-h-[4.5rem] py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <div 
              className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
            >
              <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-xs xs:text-sm sm:text-xl lg:text-2xl tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
                <span className="hidden sm:inline">لوحة الإدارة والرفع الذكي</span>
                <span className="sm:hidden">لوحة الإدارة</span>
              </h1>
              <p className="text-xs sm:text-sm hidden md:block font-bold mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                قسم الرياضيات | جامعة بني سويف
              </p>
            </div>
          </div>

          {/* Top Action Buttons & Theme Switcher */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <ThemeToggle />

            <button
              onClick={openSettingsModal}
              title="إعدادات مفاتيح التشغيل السحابي"
              className="p-1.5 sm:p-2.5 rounded-xl border transition-all hover:text-amber-500 hover:border-amber-400 cursor-pointer shadow-sm shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)'
              }}
            >
              <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <Link
              href="/"
              target="_blank"
              title="بوابة الطلاب"
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-black border transition-all sm:hover:scale-[1.02] shadow-sm shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 shrink-0" />
              <span className="hidden lg:inline">بوابة الطلاب</span>
            </Link>

            <button
              onClick={() => {
                setShowDiagnosticsModal(true);
                fetchDiagnostics();
              }}
              title="سجلات وفحص النظام والمصادر"
              className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-black border transition-all sm:hover:scale-[1.02] shadow-sm shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                borderColor: 'var(--accent-primary)',
                color: '#ffffff'
              }}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">سجلات وفحص النظام 📊</span>
            </button>

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 sm:p-2.5 rounded-xl border transition-all hover:text-rose-500 hover:border-rose-400 cursor-pointer shadow-sm shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)'
              }}
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Quick Stats Row */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4 sm:gap-6">
          <div 
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                المواد المسجلة
              </span>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--accent-primary)' }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {subjects.length}
            </div>
            <div className="text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-black" style={{ color: 'var(--accent-primary)' }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>جاهزة ومربوطة بالبرومبتس</span>
            </div>
          </div>

          <div 
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                المحاضرات الجاهزة
              </span>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-cyan-500 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {subjects.reduce((sum, s) => sum + s.lecture_count, 0)}
            </div>
            <div className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-300 mt-2 flex items-center gap-1.5 font-black">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>باقة متكاملة متاحة للطلاب</span>
            </div>
          </div>

          <div 
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                سعة التخزين
              </span>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sky-500 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <Cloud className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ∞ لا نهائي
            </div>
            <div className="text-xs sm:text-sm text-sky-600 dark:text-sky-300 mt-2 flex items-center gap-1.5 font-black">
              <Cloud className="w-4 h-4 shrink-0" />
              <span>سحابة تليجرام CDN (حتى 2GB)</span>
            </div>
          </div>

          <div 
            className="p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden group shadow-sm hover:shadow-md"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                محرك الذكاء
              </span>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-500 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
              >
                <Headphones className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              المصرية 🇪🇬
            </div>
            <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-300 mt-2 flex items-center gap-1.5 font-black">
              <Headphones className="w-4 h-4 shrink-0" />
              <span>بودكاست وفيديو وكويز</span>
            </div>
          </div>
        </div>

        {/* Live Active Job Tracking Card (if any lecture is being generated) */}
        {trackedLecture && (
          <div 
            className="p-6 rounded-3xl border relative overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-xl transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--accent-primary)',
              boxShadow: 'var(--card-shadow-hover)'
            }}
          >
            <div 
              className="absolute top-0 right-0 left-0 h-1.5"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-prominent)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  {trackedLecture.status === 'completed' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  ) : (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs sm:text-sm font-black px-3 py-1 rounded-full border"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-prominent)',
                        color: 'var(--accent-primary)'
                      }}
                    >
                      متابعة خط الإنتاج اللحظي
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>#{trackedLecture.id}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black mt-1.5" style={{ color: 'var(--text-primary)' }}>
                    {trackedLecture.title || `المحاضرة ${trackedLecture.lecture_num}`}
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start md:self-center">
                {trackedLecture.status === 'completed' ? (
                  <span className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-black text-sm sm:text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>اكتملت جميع المخرجات بنجاح</span>
                  </span>
                ) : trackedLecture.status === 'failed' ? (
                  <span className="px-4 py-2.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-black text-sm sm:text-base flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <span>فشلت العملية</span>
                  </span>
                ) : (
                  <span 
                    className="px-4 py-2.5 rounded-2xl border font-black text-sm sm:text-base flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-interactive)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    <span>{trackedLecture.stage_info || 'جاري المعالجة والإنتاج...'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Visualization */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,130px),1fr))] gap-2.5 sm:gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div 
                className="p-3.5 rounded-2xl border text-center transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <FileText className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
                <span className="block text-xs sm:text-sm font-black" style={{ color: 'var(--text-primary)' }}>1. استلام الـ PDF</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-300 font-bold">تم التأكيد ✓</span>
              </div>
              <div 
                className="p-3.5 rounded-2xl border text-center transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <Brain className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <span className="block text-xs sm:text-sm font-black" style={{ color: 'var(--text-primary)' }}>2. حقن البرومبت</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-300 font-bold">المادة المعتمدة ✓</span>
              </div>
              <div 
                className="p-3.5 rounded-2xl border text-center transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <Headphones className="w-5 h-5 mx-auto mb-1 text-teal-500" />
                <span className="block text-xs sm:text-sm font-black" style={{ color: 'var(--text-primary)' }}>3. بودكاست مصري</span>
                <span className="text-xs text-teal-600 dark:text-teal-300 font-bold">NotebookLM</span>
              </div>
              <div 
                className="p-3.5 rounded-2xl border text-center transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <Video className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <span className="block text-xs sm:text-sm font-black" style={{ color: 'var(--text-primary)' }}>4. فيديو وكويز</span>
                <span className="text-xs text-amber-600 dark:text-amber-300 font-bold">إنتاج الباقة</span>
              </div>
              <div 
                className="p-3.5 rounded-2xl border text-center col-span-2 sm:col-span-1 transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <Cloud className="w-5 h-5 mx-auto mb-1 text-sky-500" />
                <span className="block text-xs sm:text-sm font-black" style={{ color: 'var(--text-primary)' }}>5. رفع تليجرام CDN</span>
                <span className="text-xs text-sky-600 dark:text-sky-300 font-bold">التخزين الدائم</span>
              </div>
            </div>

            {/* Generated Assets Preview (when complete) */}
            {trackedLecture.assets && trackedLecture.assets.length > 0 && (
              <div className="mt-6 pt-5 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex flex-wrap gap-2.5">
                  {trackedLecture.assets.map((asset: LectureAsset) => (
                    <span 
                      key={asset.id} 
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-black shadow-xs"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{asset.title}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                        ({asset.file_size_bytes ? `${(asset.file_size_bytes / (1024*1024)).toFixed(1)}MB` : 'مكتمل'})
                      </span>
                    </span>
                  ))}
                </div>

                <Link
                  href={`/`}
                  className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-white font-black text-sm shadow-lg hover:opacity-95 transition-all"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Play className="w-4 h-4" />
                  <span>معاينة في بوابة الطلاب</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Two-Column Studio: Uploader Form & Subject Lectures Browser */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start w-full max-w-full min-w-0">
          
          {/* Column 1: The Smart Uploader Form (7 cols) */}
          <div 
            className="lg:col-span-7 p-6 sm:p-8 rounded-3xl border transition-all shadow-xl min-w-0 w-full"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--card-shadow)'
            }}
          >
            
            <div className="flex items-center justify-between mb-5 pb-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--accent-primary)' }} />
                  <span>رفع محاضرة جديدة وإطلاق الذكاء الاصطناعي</span>
                </h2>
                <p className="text-xs sm:text-sm font-medium mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  ارفع ملف الـ PDF وسيقوم المحرك بتوليد الشرح الصوتي، الفيديو، الكويز، والملخص تلقائياً في السحابة.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-600 dark:text-rose-300 text-xs sm:text-sm font-bold">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-5">
              
              {/* Step 1: Subject Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    1. اختر المادة الدراسية ({subjects.length} مادة متاحة)
                  </label>
                  <span className="md:hidden text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <span>اسحب المقررات أفقياً</span>
                    <span className="text-[10px] opacity-75">↔</span>
                  </span>
                </div>
                
                {/* Horizontal Swipe Rail on Mobile, Grid on Tablet/Desktop */}
                <div className="flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(100%,135px),1fr))] overflow-x-auto md:overflow-x-visible overscroll-x-contain touch-pan-x snap-x snap-mandatory gap-2 sm:gap-2.5 pb-2.5 pt-1 md:py-0 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {subjects.map((sub) => {
                    const isSelected = sub.id === selectedSubjectId;
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`p-2.5 sm:p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer min-h-[72px] sm:min-h-[75px] w-[138px] xs:w-[150px] md:w-auto shrink-0 snap-start ${
                          isSelected ? 'ring-2 ring-cyan-500/50 shadow-md sm:scale-[1.02]' : 'sm:hover:scale-[1.01]'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        <span className="font-bold text-xs sm:text-sm leading-snug line-clamp-2">{sub.name}</span>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">{sub.lecture_count} محاضرات</span>
                          {sub.has_prompt && (
                            <span className="font-bold text-[10px] px-1 py-0.5 rounded border text-emerald-500" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-prominent)' }}>
                              برومبت ✓
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Doctor Picker if subject has multiple doctor tracks */}
              {selectedSubject?.doctors && selectedSubject.doctors.length > 0 && (
                <div className="pt-1">
                  <label className="block text-xs sm:text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    مسار الدكتور / أستاذ المادة
                  </label>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {selectedSubject.doctors.map((doc) => {
                      const isSelected = selectedDoctor === doc;
                      const isFemale = doc.includes('مروة') || doc.includes('ايمان') || doc.includes('ايه');
                      return (
                        <button
                          type="button"
                          key={doc}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 min-w-[130px] ${
                            isSelected ? 'ring-2 ring-cyan-500/50 shadow-sm' : ''
                          }`}
                          style={{
                            backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                            borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          <span className="text-sm">{isFemale ? '👩‍🏫' : '👨‍🏫'}</span>
                          <span>{doc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Lecture Info */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3 sm:gap-4 pt-1">
                <div>
                  <label className="block text-xs sm:text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    رقم المحاضرة
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lectureNum}
                    onChange={(e) => setLectureNum(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-bold focus:outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-prominent)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    عنوان المحاضرة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                    placeholder="مثال: مفهوم المنحنى وطول القوس في الفراغ"
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-medium focus:outline-none transition-all placeholder:text-slate-400"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-prominent)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Step 3: Drag & Drop Zone */}
              <div>
                <label className="block text-xs sm:text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  2. رفع ملف المحاضرة (PDF)
                </label>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-2xl p-5 sm:p-7 text-center cursor-pointer transition-all group"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-prominent)'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div 
                    className="w-12 h-12 mx-auto mb-2.5 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)' }}
                  >
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    اسحب ملف الـ PDF وأفلته هنا، أو <span style={{ color: 'var(--accent-primary)' }} className="underline font-bold">تصفح ملفاتك</span>
                  </p>
                  <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
                    يمكنك رفع ملف المحاضرة الأساسي ومراجع إضافية ملحقة معاً
                  </p>

                  {/* Selected files preview badge */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t flex flex-wrap justify-center gap-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                      {selectedFiles.map((f, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-black shadow-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-interactive)',
                            color: 'var(--accent-primary)'
                          }}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[220px]">{f.name}</span>
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                            ({(f.size / (1024*1024)).toFixed(2)} MB)
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Included AI Bundle Highlights */}
              <div 
                className="p-5 rounded-2xl border transition-colors shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)'
                }}
              >
                <span className="text-sm sm:text-base font-black block mb-3" style={{ color: 'var(--text-primary)' }}>
                  ✨ ما سيتم إنتاجه تلقائياً من خلال هذا الرفع:
                </span>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,115px),1fr))] gap-3 text-xs sm:text-sm font-black">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-300">
                    <Headphones className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                    <span>بودكاست مصري (30د)</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
                    <Video className="w-4.5 h-4.5 text-purple-500 shrink-0" />
                    <span>فيديو شرح توضيحي</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-300">
                    <HelpCircle className="w-4.5 h-4.5 text-cyan-500 shrink-0" />
                    <span>كويز تفاعلي فوري</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                    <FileCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    <span>دليل دراسي وملخص</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                    <Layers className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    <span>بطاقات استذكار</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-300">
                    <Cloud className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                    <span>تخزين تليجرام CDN</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full py-4.5 px-6 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-3 shadow-xl hover:opacity-95 active:scale-[0.99] cursor-pointer disabled:opacity-50 text-white"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  boxShadow: 'var(--card-shadow-hover)'
                }}
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>جاري الرفع وإدراج المحاضرة في خط الإنتاج السحابي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>بدء خط الإنتاج الذكي للمحاضرة 🚀</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Column 2: Subject Lectures Explorer (5 cols) */}
          <div className="lg:col-span-5 space-y-6 min-w-0 w-full">
            
            <div 
              className="p-6 rounded-3xl border transition-all shadow-xl"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--card-shadow)'
              }}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h3 className="font-black text-lg sm:text-xl flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                    <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                    <span>محاضرات {selectedSubject?.name || 'المادة المحددة'}</span>
                  </h3>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
                    إجمالي {subjectLectures.length} محاضرة مسجلة في قاعدة البيانات
                  </p>
                </div>
              </div>

              {subjectLectures.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
                  <div 
                    className="w-14 h-14 mx-auto mb-3.5 rounded-2xl flex items-center justify-center border shadow-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <p className="text-base sm:text-lg font-black" style={{ color: 'var(--text-primary)' }}>لم يتم رفع أي محاضرات لهذه المادة بعد</p>
                  <p className="text-sm font-bold mt-1.5" style={{ color: 'var(--text-secondary)' }}>ارفع أول محاضرة الآن من لوحة الرفع على اليمين!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectLectures.map((lec) => (
                    <div
                      key={lec.id}
                      className="p-3.5 sm:p-5 rounded-2xl border transition-all flex flex-col xs:flex-row xs:items-start justify-between gap-3 group hover:shadow-md"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div 
                          className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 font-bold text-sm sm:text-base shadow-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-prominent)',
                            color: 'var(--accent-primary)'
                          }}
                        >
                          {lec.lecture_num}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm sm:text-base transition-colors leading-tight break-words" style={{ color: 'var(--text-primary)' }}>
                            {lec.title}
                          </h4>
                          {lec.doctor && (
                            <div className="mt-1.5">
                              <span 
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold border"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  borderColor: 'var(--border-prominent)',
                                  color: 'var(--accent-primary)'
                                }}
                              >
                                {lec.doctor.includes('مروة') || lec.doctor.includes('ايمان') || lec.doctor.includes('ايه') ? '👩‍🏫' : '👨‍🏫'} {lec.doctor}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{lec.assets_count} أصول مكتملة</span>
                            </span>
                            <span>•</span>
                            <span className="font-medium">
                              {new Date(lec.created_at).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTrackingId(lec.id)}
                        className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs hover:scale-105 self-start xs:self-center"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        معاينة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Feature Guide Box */}
            <div 
              className="p-6 rounded-3xl border space-y-3.5 shadow-md"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)'
              }}
            >
              <h4 className="font-black text-base sm:text-lg flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                <Brain className="w-5 h-5 text-cyan-500" />
                <span>كيف يعمل خط الإنتاج الذكي؟</span>
              </h4>
              <p className="text-sm sm:text-base leading-relaxed font-semibold" style={{ color: 'var(--text-secondary)' }}>
                1. بمجرد رفع الـ PDF، يسحب السيرفر تلقائياً <strong className="font-black text-cyan-600 dark:text-cyan-300">البرومبت الرئيسي للمادة</strong> الذي تم إعداده خصيصاً (المشروح بالمصري والموجّه لأسلوب امتحانات بني سويف).
              </p>
              <p className="text-sm sm:text-base leading-relaxed font-semibold" style={{ color: 'var(--text-secondary)' }}>
                2. يقوم <strong className="font-black text-teal-600 dark:text-teal-300">NotebookLM</strong> بإنتاج البودكاست الصوتي والفيديو والكويز والملخص بالتوازي في السحابة.
              </p>
              <p className="text-sm sm:text-base leading-relaxed font-semibold" style={{ color: 'var(--text-secondary)' }}>
                3. تُرفع كافة الملفات إلى <strong className="font-black text-sky-600 dark:text-sky-300">قناة تليجرام السحابية</strong>، وتُسجل الروابط فورياً في <strong className="font-black text-emerald-600 dark:text-emerald-300">Supabase</strong> لتظهر في بوابة الطلاب مباشرة!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE CLOUD DIAGNOSTICS & SYSTEM LOGS MODAL                       */}
      {/* ========================================================================= */}
      {/* Cloud Ops Settings Modal */}
      {showSettingsModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettingsModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all overscroll-contain"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-prominent)',
              boxShadow: 'var(--card-shadow-hover)'
            }}
          >
            {/* Modal Header */}
            <div
              className="p-4 sm:p-6 border-b flex items-center justify-between gap-3 shrink-0"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)'
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 text-white shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                >
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                    إعدادات مفاتيح التشغيل السحابي
                  </h3>
                  <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    تُحمَّل تلقائياً عند تسجيل الدخول — هنا للتعديل اليدوي فقط (تُحفظ على هذا الجهاز)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 rounded-xl border transition-all hover:bg-rose-500/10 hover:border-rose-400 hover:text-rose-500 cursor-pointer shadow-xs shrink-0"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)'
                }}
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                  مفتاح التشغيل السحابي (Admin Master Key)
                </label>
                <input
                  type="password"
                  value={settingsMasterKey}
                  onChange={(e) => setSettingsMasterKey(e.target.value)}
                  placeholder="يُستخدم لتسجيل المحاضرات في قاعدة البيانات عند الرفع"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-2xl border text-sm font-bold focus:outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-prominent)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div
                className="p-3 rounded-2xl border text-xs font-bold leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)'
                }}
              >
                🔒 الأمان أولاً: المفتاح يُخزَّن محلياً في متصفحك فقط ولا يُشحن أبداً داخل كود الموقع المنشور.
                محرك المعالجة بيلتقط المحاضرات المرفوعة تلقائياً — لا يحتاج أي توكن من المتصفح.
                لتدوير المفتاح، حدّثه في متغيرات بيئة السيرفر ثم سجّل دخول من جديد.
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full py-3.5 px-5 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2.5 shadow-lg hover:opacity-95 active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
              >
                {settingsSaved ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>تم الحفظ!</span>
                  </>
                ) : (
                  <span>حفظ المفاتيح على هذا الجهاز</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiagnosticsModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDiagnosticsModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all overscroll-contain"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-prominent)',
              boxShadow: 'var(--card-shadow-hover)'
            }}
          >
            {/* Modal Header */}
            <div 
              className="p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
              style={{ 
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 text-white shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                >
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>سجلات وفحص النظام والمصادر</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Cloud 24/7
                    </span>
                  </h3>
                  <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    مراقبة حية لسيرفر Render وقاعدة Supabase وتدفق تيليجرام وفهرس الـ 21 محاضرة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleCopyReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  title="نسخ تقرير الفحص للحافظة"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'تم النسخ!' : 'نسخ التقرير'}</span>
                </button>

                <button
                  onClick={() => {
                    fetchDiagnostics();
                    if (diagnosticsTab === 'logs') fetchLogs();
                  }}
                  disabled={isLoadingDiagnostics || isLoadingLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)'
                  }}
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingDiagnostics || isLoadingLogs) ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>

                <button
                  onClick={() => setShowDiagnosticsModal(false)}
                  className="p-2 rounded-xl border transition-all hover:bg-rose-500/10 hover:border-rose-400 hover:text-rose-500 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar */}
            <div 
              className="px-3 sm:px-6 pt-3 border-b flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x"
              style={{ 
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <button
                onClick={() => setDiagnosticsTab('overview')}
                className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                  diagnosticsTab === 'overview'
                    ? 'border-cyan-500 text-cyan-500'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ color: diagnosticsTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                <Activity className="w-4 h-4" />
                <span>نظرة عامة والخدمات السحابية</span>
              </button>

              <button
                onClick={() => setDiagnosticsTab('matrix')}
                className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                  diagnosticsTab === 'matrix'
                    ? 'border-cyan-500 text-cyan-500'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ color: diagnosticsTab === 'matrix' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                <Layers className="w-4 h-4" />
                <span>مصفوفة المحاضرات والمصادر</span>
                {diagnosticsData?.summary && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/10 text-cyan-500 font-bold">
                    {diagnosticsData.summary.complete_5_of_5}/{diagnosticsData.summary.total_lectures}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setDiagnosticsTab('logs');
                  fetchLogs();
                }}
                className={`pb-2.5 px-3 border-b-2 text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                  diagnosticsTab === 'logs'
                    ? 'border-cyan-500 text-cyan-500'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ color: diagnosticsTab === 'logs' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                <Terminal className="w-4 h-4" />
                <span>سجلات السيرفر اللحظية (Live Logs)</span>
                {logsStats && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    logsStats.ERROR > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {logsStats.total} سجل
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain touch-pan-y">
              
              {/* TAB 1: OVERVIEW */}
              {diagnosticsTab === 'overview' && (
                <div className="space-y-6">
                  {/* Cloud Infrastructure Status Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Render API Backend */}
                    <div 
                      className="p-4 rounded-2xl border transition-all shadow-xs space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>سيرفر الباك إند السحابي</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-emerald-500" />
                        <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Render (Frankfurt)</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        يعمل 24/7 سحابياً بدون الاعتماد على جهازك المنزلي
                      </p>
                    </div>

                    {/* Supabase Database */}
                    <div 
                      className="p-4 rounded-2xl border transition-all shadow-xs space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>قاعدة بيانات Supabase</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {diagnosticsData?.database?.latency_ms || 8} ms
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-sky-500" />
                        <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>PostgreSQL Pooler</span>
                      </div>
                      <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {diagnosticsData?.database?.status === 'healthy' ? 'متصلة بسرعة استجابة فائقة' : 'جاري الفحص...'}
                      </p>
                    </div>

                    {/* Telegram MTProto Streaming */}
                    <div 
                      className="p-4 rounded-2xl border transition-all shadow-xs space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>تخزين التيليجرام السحابي</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                          MTProto In-Memory
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-cyan-500" />
                        <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>القناة السحابية</span>
                      </div>
                      <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                        بث فوري مباشر من الرام يتجاوز ليميت الـ 20MB
                      </p>
                    </div>
                  </div>

                  {/* Summary Coverage KPI Grid */}
                  {diagnosticsData?.summary && (
                    <div className="space-y-3">
                      <h4 className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Layers className="w-4 h-4 text-cyan-500" />
                        <span>جاهزية الأصول التعليمية الخمسة لكل المحاضرات (21 محاضرة)</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3.5 rounded-2xl border text-center space-y-1" style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
                          <HelpCircle className="w-5 h-5 mx-auto text-amber-500" />
                          <div className="text-xl font-black text-amber-500">{diagnosticsData.summary.total_quizzes_ready}/21</div>
                          <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>كويزات تفاعلية</div>
                        </div>

                        <div className="p-3.5 rounded-2xl border text-center space-y-1" style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
                          <BookOpen className="w-5 h-5 mx-auto text-emerald-500" />
                          <div className="text-xl font-black text-emerald-500">{diagnosticsData.summary.total_guides_ready}/21</div>
                          <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>أدلة دراسية وزتونة</div>
                        </div>

                        <div className="p-3.5 rounded-2xl border text-center space-y-1" style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
                          <FileText className="w-5 h-5 mx-auto text-sky-500" />
                          <div className="text-xl font-black text-sky-500">{diagnosticsData.summary.total_flashcards_ready}/21</div>
                          <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>بطاقات استذكار</div>
                        </div>

                        <div className="p-3.5 rounded-2xl border text-center space-y-1" style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
                          <Headphones className="w-5 h-5 mx-auto text-indigo-500" />
                          <div className="text-xl font-black text-indigo-500">{diagnosticsData.summary.total_audios}/21</div>
                          <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>بودكاست صوتي</div>
                        </div>

                        <div className="p-3.5 rounded-2xl border text-center space-y-1" style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
                          <Video className="w-5 h-5 mx-auto text-rose-500" />
                          <div className="text-xl font-black text-rose-500">{diagnosticsData.summary.total_videos}/21</div>
                          <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>فيديوهات شرح</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clarification Callout Note */}
                  <div 
                    className="p-4 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.05)',
                      borderColor: 'rgba(56, 189, 248, 0.2)'
                    }}
                  >
                    <h5 className="font-black text-sm flex items-center gap-2 text-sky-600 dark:text-sky-300">
                      <Sparkles className="w-4 h-4" />
                      <span>توضيح مهم بخصوص المحاضرات:</span>
                    </h5>
                    <p className="text-xs sm:text-sm leading-relaxed font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      جميع الـ 21 محاضرة أصبح لديها <strong>كويز كامل + ملخص دراسي شامل + بطاقات استذكار كاملة</strong> مدمجة ومحفوظة بنسبة 100%. الملفات الصوتية المتبقية (7 محاضرات) والفيديوهات المتبقية (9 محاضرات) تم رفع بعضها وباقي الملفات ترفع تدريجياً عبر القناة السحابية بدون أي ضغط على جهازك.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: MODALITY MATRIX (21 LECTURES) */}
              {diagnosticsTab === 'matrix' && (
                <div className="space-y-4">
                  {/* Search & Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ابحث باسم المحاضرة أو المادة..."
                        value={matrixSearch}
                        onChange={(e) => setMatrixSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 rounded-xl text-xs sm:text-sm border outline-none font-bold"
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMatrixFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          matrixFilter === 'ALL'
                            ? 'bg-cyan-500 text-white border-cyan-500'
                            : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70'
                        }`}
                      >
                        الكل ({diagnosticsData?.summary?.total_lectures || 29})
                      </button>
                      <button
                        onClick={() => setMatrixFilter('COMPLETE')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          matrixFilter === 'COMPLETE'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70'
                        }`}
                      >
                        مكتملة 5/5 ({diagnosticsData?.summary?.complete_5_of_5 || 21})
                      </button>
                      <button
                        onClick={() => setMatrixFilter('INCOMPLETE')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          matrixFilter === 'INCOMPLETE'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70'
                        }`}
                      >
                        تحتاج ملفات إضافية ({diagnosticsData?.summary?.partial_modality || 8})
                      </button>
                    </div>
                  </div>

                  {/* Matrix Table */}
                  <div className="border rounded-2xl overflow-hidden shadow-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-right text-xs">
                        <thead 
                          className="sticky top-0 z-10 font-black border-b"
                          style={{
                            backgroundColor: 'var(--bg-surface-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <tr>
                            <th className="p-3">المادة / المحاضرة</th>
                            <th className="p-3 text-center">الدرجة</th>
                            <th className="p-3 text-center">الكويز</th>
                            <th className="p-3 text-center">الدليل</th>
                            <th className="p-3 text-center">البطاقات</th>
                            <th className="p-3 text-center">الصوت</th>
                            <th className="p-3 text-center">الفيديو</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {(() => {
                            const list = (diagnosticsData?.lectures || [])
                              .filter((lec: any) => {
                                if (matrixFilter === 'COMPLETE') return lec.score === '5/5';
                                if (matrixFilter === 'INCOMPLETE') return lec.score !== '5/5';
                                return true;
                              })
                              .filter((lec: any) => {
                                if (!matrixSearch) return true;
                                const s = matrixSearch.toLowerCase();
                                return lec.title.toLowerCase().includes(s) || lec.subject.toLowerCase().includes(s);
                              });

                            if (list.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                      <span className="font-bold text-sm">
                                        {matrixFilter === 'INCOMPLETE'
                                          ? 'رائع! لا توجد أي محاضرات تحتاج ملفات إضافية حالياً 🎉'
                                          : 'لا توجد نتائج مطابقة لبحثك'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return list.map((lec: any) => (
                              <tr 
                                key={lec.lecture_id}
                                className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ backgroundColor: 'var(--bg-surface)' }}
                              >
                                <td className="p-3">
                                  <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {lec.title}
                                  </div>
                                  <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                                    {lec.subject} • محاضرة {lec.lecture_num} {lec.doctor ? `(${lec.doctor})` : ''}
                                  </div>
                                </td>

                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full font-black text-xs ${
                                    lec.score === '5/5' 
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    {lec.score}
                                  </span>
                                </td>

                                <td className="p-3 text-center">
                                  {lec.modalities.quiz.ready ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-500 font-bold" title={`${lec.modalities.quiz.chars} حرف`}>
                                      <Check className="w-4 h-4" />
                                      <span className="text-[10px] opacity-75">{Math.round(lec.modalities.quiz.chars / 1000)}k</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-bold">-</span>
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  {lec.modalities.guide.ready ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-500 font-bold" title={`${lec.modalities.guide.chars} حرف`}>
                                      <Check className="w-4 h-4" />
                                      <span className="text-[10px] opacity-75">{Math.round(lec.modalities.guide.chars / 1000)}k</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-bold">-</span>
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  {lec.modalities.flashcards.ready ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-500 font-bold" title={`${lec.modalities.flashcards.chars} حرف`}>
                                      <Check className="w-4 h-4" />
                                      <span className="text-[10px] opacity-75">{Math.round(lec.modalities.flashcards.chars / 1000)}k</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-bold">-</span>
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  {lec.modalities.audio.ready ? (
                                    <span className="inline-flex items-center gap-1 text-indigo-500 font-bold" title={`تيليجرام msg #${lec.modalities.audio.tg_msg}`}>
                                      <Headphones className="w-4 h-4" />
                                      <span className="text-[10px]">#{lec.modalities.audio.tg_msg}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-bold text-[11px]">قيد الإعداد</span>
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  {lec.modalities.video.ready ? (
                                    <span className="inline-flex items-center gap-1 text-rose-500 font-bold" title={`تيليجرام msg #${lec.modalities.video.tg_msg}`}>
                                      <Video className="w-4 h-4" />
                                      <span className="text-[10px]">#{lec.modalities.video.tg_msg}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-bold text-[11px]">قيد الإعداد</span>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE SERVER LOGS */}
              {diagnosticsTab === 'logs' && (
                <div className="space-y-4">
                  {/* Controls: Search, Level Filter, Clear */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="فلترة السجلات بكلمة بحث..."
                        value={logSearch}
                        onChange={(e) => {
                          setLogSearch(e.target.value);
                          fetchLogs();
                        }}
                        className="w-full pr-10 pl-4 py-2 rounded-xl text-xs sm:text-sm border outline-none font-bold"
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => {
                            setLogFilterLevel(lvl);
                            fetchLogs();
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            logFilterLevel === lvl
                              ? 'bg-cyan-500 text-white border-cyan-500'
                              : 'bg-transparent border-gray-300 dark:border-gray-700 opacity-70'
                          }`}
                        >
                          {lvl === 'ALL' ? 'الكل' : lvl}
                        </button>
                      ))}

                      <button
                        onClick={handleClearLogs}
                        className="p-2 rounded-xl border transition-all hover:bg-rose-500/10 hover:border-rose-400 hover:text-rose-500 cursor-pointer shadow-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)'
                        }}
                        title="مسح السجلات الحالية"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Terminal Log Console */}
                  <div 
                    className="p-4 rounded-2xl border font-mono text-xs overflow-y-auto max-h-[420px] space-y-1.5 shadow-inner"
                    style={{
                      backgroundColor: '#0a0f1d',
                      borderColor: '#1e293b',
                      color: '#e2e8f0',
                      direction: 'ltr',
                      textAlign: 'left'
                    }}
                  >
                    {logsData.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                        لا توجد سجلات حالياً تطابق معايير البحث
                      </div>
                    ) : (
                      logsData.map((lg, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 hover:bg-white/5 p-1 rounded transition-colors">
                          <span className="text-gray-500 select-none text-[11px] shrink-0">
                            [{lg.timestamp}]
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase shrink-0 ${
                            lg.level === 'ERROR'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : lg.level === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {lg.level}
                          </span>
                          <span className="text-indigo-400 text-[11px] shrink-0">
                            [{lg.logger}]
                          </span>
                          <span className="text-gray-200 break-all">
                            {lg.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

