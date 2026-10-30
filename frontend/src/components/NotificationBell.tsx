'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Sparkles, ExternalLink, X, Smartphone, Volume2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import {
  isPushNotificationSupported,
  getPushPermissionState,
  subscribeToPushNotifications,
} from '@/lib/pushNotifications';

export interface NotificationItem {
  id: number;
  lecture_id: number | null;
  subject_name: string;
  lecture_num: number;
  doctor: string | null;
  title: string;
  message: string;
  icon: string;
  url: string;
  created_at: string;
}

interface NotificationBellProps {
  isGirls?: boolean;
  isDark?: boolean;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'الآن';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    if (diffSec < 172800) return 'أمس';
    return `منذ ${Math.floor(diffSec / 86400)} أيام`;
  } catch {
    return 'مؤخراً';
  }
}

export default function NotificationBell({ isGirls = false, isDark = true }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [subscribing, setSubscribing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('portal_read_notifications');
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
      setPushStatus(getPushPermissionState());
    } catch (e) {
      console.warn('Failed reading notifications state:', e);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/notifications?limit=25'));
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.warn('[NotificationBell] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('portal_read_notifications', JSON.stringify(Array.from(allIds)));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    const updated = new Set(readIds);
    updated.add(item.id);
    setReadIds(updated);
    try {
      localStorage.setItem('portal_read_notifications', JSON.stringify(Array.from(updated)));
    } catch (e) {
      console.warn(e);
    }
    setIsOpen(false);
    router.push(item.url);
  };

  const handleEnablePush = async () => {
    setSubscribing(true);
    const res = await subscribeToPushNotifications();
    setSubscribing(false);
    setPushStatus(getPushPermissionState());
    if (res.success) {
      alert('تم تفعيل إشعارات الموبايل بنجاح! 🔔 هتصلك كل محاضرة أول بأول.');
    } else {
      alert(res.message || 'تعذر تفعيل الإشعارات.');
    }
  };

  const primaryAccent = isGirls ? '#F43F5E' : '#0D9488';
  const glowShadow = isGirls
    ? '0 0 15px rgba(244, 63, 94, 0.4)'
    : '0 0 15px rgba(13, 148, 136, 0.4)';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
        style={{
          backgroundColor: isOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
          borderColor: isOpen ? primaryAccent : 'var(--border-subtle)',
          color: isOpen ? primaryAccent : 'var(--text-primary)',
        }}
        title="إشعارات المحاضرات الجديدة 🔔"
        aria-label="إشعارات المنصة"
      >
        <Bell
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
            unreadCount > 0 ? 'animate-bounce text-amber-500' : ''
          }`}
        />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white rounded-full transition-transform duration-300 scale-100 animate-pulse shadow-md"
            style={{
              backgroundColor: isGirls ? '#F43F5E' : '#F59E0B',
              boxShadow: glowShadow,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:left-0 sm:top-12 z-50 w-auto sm:w-[380px] max-w-[96vw] rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95"
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              <span className="font-bold text-sm">أحدث المحاضرات والتنبيهات</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-extrabold rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {unreadCount} جديد
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                  title="تعليم الكل كمقروء"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">قراءة الكل</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Web Push Prompt Banner (if not already enabled) */}
          {pushStatus !== 'granted' && isPushNotificationSupported() && (
            <div
              className="p-3 mx-3 my-2 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-rose-500/10"
              style={{ borderColor: 'var(--border-interactive)' }}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl">🔔</span>
                <div>
                  <p className="text-xs font-bold leading-snug">
                    فعّل إشعارات الموبايل والكمبيوتر
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    علشان يوصلك روقان كل محاضرة فور نزولها حتى والموقع مقفول!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={subscribing}
                className="px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs hover:scale-105 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                style={{ backgroundColor: primaryAccent }}
              >
                {subscribing ? 'جاري...' : 'تفعيل ✨'}
              </button>
            </div>
          )}

          {/* Notifications Scroll List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <span className="text-3xl block mb-2">🌸</span>
                <p className="text-sm font-bold">لا توجد إشعارات حالياً</p>
                <p className="text-xs text-muted-foreground mt-1">
                  كل المحاضرات محدثة وجاهزة، ادخل ذاكر بروقان!
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !readIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 p-3.5 transition-all duration-200 cursor-pointer hover:bg-white/5 relative ${
                      isUnread ? 'bg-amber-500/5' : 'opacity-85'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span
                        className="absolute right-1.5 top-5 w-2 h-2 rounded-full animate-ping"
                        style={{ backgroundColor: isGirls ? '#F43F5E' : '#0D9488' }}
                      />
                    )}

                    {/* Subject Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border shadow-xs"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: isUnread ? primaryAccent : 'var(--border-subtle)',
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-extrabold text-xs text-foreground truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {item.doctor && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-foreground/80">
                            👨‍🏫 {item.doctor}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-500 hover:underline mr-auto">
                          <span>افتح المحاضرة</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 text-center border-t border-white/10 bg-white/5">
            <span className="text-[11px] text-muted-foreground">
              منصة تانية رياضيات • كلية التربية جامعة بني سويف 💖
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
