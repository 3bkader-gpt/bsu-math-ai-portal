'use client';

import { getApiUrl } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[Push] Service worker registration error:', err);
    return null;
  }
}

export async function subscribeToPushNotifications(): Promise<{ success: boolean; message?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: 'المتصفح لا يدعم إشعارات الويب' };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, message: 'لم يتم منح إذن الإشعارات' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, message: 'فشل تهيئة خدمة الإشعارات' };
    }

    const keyRes = await fetch(getApiUrl('/api/notifications/vapid-public-key'));
    if (!keyRes.ok) {
      return { success: false, message: 'تعذر جلب مفتاح تشفير الإشعارات' };
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      return { success: false, message: 'مفتاح الإشعارات غير متوفر' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    const rawSub = sub.toJSON();
    if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
      return { success: false, message: 'بيانات الاشتراك غير مكتملة' };
    }

    const payload = {
      endpoint: rawSub.endpoint,
      keys: {
        p256dh: rawSub.keys.p256dh,
        auth: rawSub.keys.auth,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    const saveRes = await fetch(getApiUrl('/api/notifications/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!saveRes.ok) {
      return { success: false, message: 'فشل تسجيل الاشتراك بالسيرفر' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('push_notifications_enabled', 'true');
    }

    return { success: true, message: 'تم تفعيل إشعارات المنصة بنجاح 🔔' };
  } catch (err: any) {
    console.error('[Push] Subscription failed:', err);
    return { success: false, message: err?.message || 'حدث خطأ أثناء الاشتراك' };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch(getApiUrl('/api/notifications/unsubscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('push_notifications_enabled');
    }
    return true;
  } catch (err) {
    console.warn('[Push] Unsubscribe error:', err);
    return false;
  }
}
