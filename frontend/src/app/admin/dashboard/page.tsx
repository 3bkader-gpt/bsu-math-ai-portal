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
  Plus
} from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  has_prompt: boolean;
  lecture_count: number;
  doctors?: string[];
}

interface LectureAsset {
  id: number;
  asset_type: string;
  title: string;
  file_size_bytes: number;
  has_telegram: boolean;
  stream_url: string;
}

interface Lecture {
  id: number;
  lecture_num: number;
  title: string;
  doctor?: string;
  status: string;
  stage_info: string;
  created_at: string;
  assets_count: number;
}

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

  // 1. Check Auth & Load Subjects on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser') || 'admin';
    if (!savedToken) {
      router.push('/admin');
      return;
    }
    setToken(savedToken);
    setAdminUser(savedUser);
    fetchSubjects();
  }, [router]);

  // 2. Fetch Subjects from FastAPI
  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        if (data.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(data[0].id);
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
        const res = await fetch(`http://127.0.0.1:8000/api/subjects/${selectedSubjectId}/lectures`);
        if (res.ok) {
          const data = await res.json();
          setSubjectLectures(data);
          // Auto-suggest next lecture number based on selected doctor
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


  // 4. Poll active tracking lecture
  useEffect(() => {
    if (!activeTrackingId) return;

    let intervalId: any = null;
    const checkStatus = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/lectures/${activeTrackingId}`);
        if (res.ok) {
          const data = await res.json();
          setTrackedLecture(data);
          if (data.status === 'completed' || data.status === 'failed') {
            setIsPolling(false);
            clearInterval(intervalId);
            // Refresh lectures list
            if (selectedSubjectId) {
              const r = await fetch(`http://127.0.0.1:8000/api/subjects/${selectedSubjectId}/lectures`);
              if (r.ok) setSubjectLectures(await r.json());
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
  }, [activeTrackingId, selectedSubjectId]);

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

  // Upload Submission
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

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('subject_id', selectedSubjectId.toString());
      formData.append('lecture_num', lectureNum.toString());
      if (selectedDoctor) {
        formData.append('doctor', selectedDoctor);
      }
      if (lectureTitle) {
        formData.append('title', lectureTitle);
      }

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('http://127.0.0.1:8000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'فشل رفع المحاضرة');
      }

      // Upload accepted, start tracking lecture id
      setActiveTrackingId(data.lecture_id);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ أثناء رفع المحاضرة');
    } finally {
      setIsUploading(false);
    }
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-blue-500/25 selection:text-blue-100">
      
      {/* Top Glass Navigation Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/[0.08] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 p-0.5 shadow-lg shadow-blue-500/10">
              <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">لوحة الإدارة والرفع الذكي</h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  PRO ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">قسم الرياضيات | جامعة بني سويف</p>
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">سيرفر FastAPI:</span>
              <span className="text-emerald-400 font-mono font-medium">8000 OK</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">قاعدة البيانات:</span>
              <span className="text-cyan-300 font-medium">Supabase</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">التخزين السحابي:</span>
              <span className="text-sky-300 font-medium">تليجرام CDN</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all shadow-sm hover:text-white"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>بوابة الطلاب</span>
            </Link>

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">المواد المسجلة</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{subjects.length}</div>
            <div className="text-[11px] text-blue-400/90 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>جاهزة ومربوطة بالبرومبتس</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">المحاضرات الجاهزة</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {subjects.reduce((sum, s) => sum + s.lecture_count, 0)}
            </div>
            <div className="text-[11px] text-cyan-400/90 mt-1 flex items-center gap-1">
              <span>باقة متكاملة متاحة للطلاب</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">سعة التخزين</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Cloud className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">∞ لا نهائي</div>
            <div className="text-[11px] text-sky-400/90 mt-1 flex items-center gap-1">
              <span>سحابة تليجرام CDN (حتى 2GB)</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">محرك الذكاء</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Headphones className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight truncate">المصرية 🇪🇬</div>
            <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
              <span>بودكاست وفيديو وكويز</span>
            </div>
          </div>
        </div>

        {/* Live Active Job Tracking Card (if any lecture is being generated) */}
        {trackedLecture && (
          <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/5 relative overflow-hidden animate-in fade-in slide-in-from-top-4">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-sky-400"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                  {trackedLecture.status === 'completed' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      متابعة خط الإنتاج اللحظي
                    </span>
                    <span className="text-xs text-slate-400">#{trackedLecture.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {trackedLecture.title || `المحاضرة ${trackedLecture.lecture_num}`}
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start md:self-center">
                {trackedLecture.status === 'completed' ? (
                  <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>اكتملت جميع المخرجات بنجاح</span>
                  </span>
                ) : trackedLecture.status === 'failed' ? (
                  <span className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>فشلت العملية</span>
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-200 border border-blue-500/30 font-semibold text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    <span>{trackedLecture.stage_info || 'جاري المعالجة والإنتاج...'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Stepper Visualization */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-white/[0.08]">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <FileText className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <span className="block text-xs font-medium text-slate-300">1. استلام الـ PDF</span>
                <span className="text-[10px] text-emerald-400">تم التأكيد ✓</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <Brain className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                <span className="block text-xs font-medium text-slate-300">2. حقن البرومبت</span>
                <span className="text-[10px] text-emerald-400">المادة المعتمدة ✓</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <Headphones className="w-4 h-4 mx-auto mb-1 text-teal-400" />
                <span className="block text-xs font-medium text-slate-300">3. بودكاست مصري</span>
                <span className="text-[10px] text-teal-300">NotebookLM</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <Video className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                <span className="block text-xs font-medium text-slate-300">4. فيديو وكويز</span>
                <span className="text-[10px] text-amber-300">إنتاج الباقة</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center col-span-2 sm:col-span-1">
                <Cloud className="w-4 h-4 mx-auto mb-1 text-sky-400" />
                <span className="block text-xs font-medium text-slate-300">5. رفع تليجرام CDN</span>
                <span className="text-[10px] text-sky-300">التخزين الدائم</span>
              </div>
            </div>

            {/* Generated Assets Preview (when complete) */}
            {trackedLecture.assets && trackedLecture.assets.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {trackedLecture.assets.map((asset: LectureAsset) => (
                    <span 
                      key={asset.id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{asset.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({(asset.file_size_bytes / (1024*1024)).toFixed(1)}MB)</span>
                    </span>
                  ))}
                </div>

                <Link
                  href={`/`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 hover:opacity-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>معاينة في بوابة الطلاب</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Two-Column Studio: Uploader Form & Subject Lectures Browser */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Column 1: The Smart Uploader Form (7 cols) */}
          <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-2xl relative">
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <UploadCloud className="w-6 h-6 text-blue-400" />
                  <span>رفع محاضرة جديدة وإطلاق الذكاء الاصطناعي</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ارفع ملف الـ PDF وسيقوم المحرك بتوليد الشرح الصوتي، الفيديو، الكويز، والملخص تلقائياً.
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              
              {/* Step 1: Subject Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
                  1. اختر المادة الدراسية (11 مادة متاحة)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subjects.map((sub) => {
                    const isSelected = sub.id === selectedSubjectId;
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                            : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="font-semibold text-xs leading-snug line-clamp-2">{sub.name}</span>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{sub.lecture_count} محاضرات</span>
                          {sub.has_prompt && <span className="text-teal-400 font-bold">برومبت ✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Doctor Picker if subject has multiple doctor tracks */}
              {selectedSubject?.doctors && selectedSubject.doctors.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    مسار الدكتور / أستاذ المادة
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedSubject.doctors.map((doc) => {
                      const isSelected = selectedDoctor === doc;
                      return (
                        <button
                          type="button"
                          key={doc}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/25 border-blue-500 text-white shadow-md ring-1 ring-blue-500'
                              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span>{doc.includes('مروة') ? '👩‍🏫' : '👨‍🏫'}</span>
                          <span>{doc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Lecture Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    رقم المحاضرة
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lectureNum}
                    onChange={(e) => setLectureNum(parseInt(e.target.value) || 1)}
                    className="w-full glass-input px-4 py-3 rounded-xl text-white text-sm"
                    required
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    عنوان المحاضرة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                    placeholder="مثال: مفهوم المنحنى وطول القوس في الفراغ"
                    className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
              </div>

              {/* Step 3: Drag & Drop Zone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  2. رفع ملف المحاضرة (PDF)
                </label>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-blue-950/20 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  <p className="text-sm font-semibold text-slate-200">
                    اسحب ملف الـ PDF وأفلته هنا، أو <span className="text-blue-400 underline">تصفح ملفاتك</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    يمكنك رفع ملف المحاضرة الأساسي ومراجع إضافية ملحقة معاً
                  </p>

                  {/* Selected files preview badge */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap justify-center gap-2">
                      {selectedFiles.map((f, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-xs text-blue-200"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-medium truncate max-w-[200px]">{f.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({(f.size / (1024*1024)).toFixed(2)} MB)</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Included AI Bundle Highlights */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block mb-2.5">
                  ✨ ما سيتم إنتاجه تلقائياً من خلال هذا الرفع:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-sky-300">
                    <Headphones className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>بودكاست مصري (30د)</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-300">
                    <Video className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>فيديو شرح توضيحي</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-300">
                    <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>كويز تفاعلي فوري</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>دليل دراسي وملخص</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>بطاقات استذكار</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-300">
                    <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>تخزين تليجرام CDN</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="w-full relative group overflow-hidden rounded-2xl p-[1px] font-bold text-base transition-all duration-200 disabled:opacity-50 shadow-xl shadow-blue-950/40 active:scale-[0.99] cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-sky-500 to-teal-400 transition-opacity duration-200 group-hover:opacity-90"></div>
                <div className="relative px-6 py-4 bg-[#0c1324] hover:bg-[#0f182e] rounded-2xl flex items-center justify-center gap-3 text-white transition-colors">
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-teal-400 rounded-full animate-spin"></div>
                      <span>جاري الرفع وإدراج المحاضرة في خط الإنتاج...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-teal-400" />
                      <span>بدء خط الإنتاج الذكي للمحاضرة 🚀</span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>

          {/* Column 2: Subject Lectures Explorer (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>محاضرات {selectedSubject?.name || 'المادة المحددة'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    إجمالي {subjectLectures.length} محاضرة مسجلة في قاعدة البيانات
                  </p>
                </div>
              </div>

              {subjectLectures.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium">لم يتم رفع أي محاضرات لهذه المادة بعد</p>
                  <p className="text-xs text-slate-400 mt-1">ارفع أول محاضرة الآن من لوحة الرفع على اليمين!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectLectures.map((lec) => (
                    <div
                      key={lec.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 font-bold text-sm">
                          {lec.lecture_num}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors">
                            {lec.title}
                          </h4>
                          {lec.doctor && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                {lec.doctor.includes('مروة') ? '👩‍🏫' : '👨‍🏫'} {lec.doctor}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{lec.assets_count} أصول مكتملة</span>
                            </span>
                            <span>•</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(lec.created_at).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTrackingId(lec.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-medium transition-all shrink-0 cursor-pointer"
                      >
                        معاينة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Feature Guide Box */}
            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] text-xs text-slate-400 space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span>كيف يعمل خط الإنتاج الذكي؟</span>
              </h4>
              <p className="leading-relaxed">
                1. بمجرد رفع الـ PDF، يسحب الخادم تلقائياً **البرومبت الرئيسي للمادة** الذي تم إعداده خصيصاً (المشروح بالمصري والموجّه لأسلوب امتحانات بني سويف).
              </p>
              <p className="leading-relaxed">
                2. يقوم **NotebookLM** بإنتاج البودكاست الصوتي والفيديو والكويز والملخص بالتوازي.
              </p>
              <p className="leading-relaxed">
                3. تُرفع كافة الملفات إلى **قناة تليجرام السحابية** مجاناً، وتُسجل الروابط فورياً في **Supabase** لتظهر في بوابة الطلاب مباشرة!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
