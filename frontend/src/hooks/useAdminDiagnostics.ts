'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { supabase } from '@/modules/gamification/supabase/client';

export function useAdminDiagnostics(token: string) {
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [diagnosticsTab, setDiagnosticsTab] = useState<'overview' | 'matrix' | 'logs' | 'cohort'>('overview');
  const [logsData, setLogsData] = useState<any[]>([]);
  const [logsStats, setLogsStats] = useState<any>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState<string>('');
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL');
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [cohortAnalytics, setCohortAnalytics] = useState<any>(null);
  const [isLoadingCohort, setIsLoadingCohort] = useState(false);

  // Lock body scroll when Diagnostics Modal is open
  useEffect(() => {
    if (showDiagnosticsModal) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [showDiagnosticsModal]);

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

  const fetchCohortAnalytics = async () => {
    setIsLoadingCohort(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiRes = await fetch(getApiUrl('/api/diagnostics/cohort-analytics'), { headers });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        setCohortAnalytics(apiData);
        return;
      }

      // Fallback if backend endpoint is temporarily unreachable
      const [
        profilesRes,
        errorsRes,
        mistakesRes,
        challengeRes,
        contribsCountRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, nickname, total_xp, level, current_streak, created_at').order('created_at', { ascending: false }).limit(40),
        supabase.from('ingestion_errors').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('mistake_notebook').select('id, box_level', { count: 'exact' }),
        supabase.from('cohort_challenges').select('*').eq('is_active', true).limit(1),
        supabase.from('cohort_challenge_contributions').select('id', { count: 'exact', head: true }),
      ]);

      const todayStr = new Date().toISOString().slice(0, 10);
      const profiles = profilesRes.data || [];
      const todayProfiles = profiles.filter((p: any) => (p.created_at || '').startsWith(todayStr));
      const activeXpStudents = profiles.filter((p: any) => (p.total_xp || 0) > 0);

      setCohortAnalytics({
        totalProfilesCount: profiles.length,
        todayProfilesCount: todayProfiles.length,
        activeXpStudentsCount: activeXpStudents.length,
        profilesList: profiles,
        dauList: [],
        retentionList: [],
        mistakeReviewStats: null,
        timeToFirstActionList: [],
        hardestQuestionsList: [],
        errorsList: errorsRes.data || [],
        mistakesCount: mistakesRes.count || 0,
        activeChallenge: challengeRes.data?.[0] || null,
        totalContributions: contribsCountRes.count || 0,
      });
    } catch (err) {
      console.error('Failed to fetch cohort analytics:', err);
    } finally {
      setIsLoadingCohort(false);
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

  return {
    showDiagnosticsModal,
    setShowDiagnosticsModal,
    diagnosticsData,
    isLoadingDiagnostics,
    diagnosticsTab,
    setDiagnosticsTab,
    logsData,
    logsStats,
    isLoadingLogs,
    logFilterLevel,
    setLogFilterLevel,
    logSearch,
    setLogSearch,
    matrixFilter,
    setMatrixFilter,
    matrixSearch,
    setMatrixSearch,
    copiedReport,
    cohortAnalytics,
    isLoadingCohort,
    fetchDiagnostics,
    fetchLogs,
    fetchCohortAnalytics,
    handleClearLogs,
    handleCopyReport,
  };
}
