// Service Worker for BSU Math AI Portal Web Push Notifications & PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'منصة تانية رياضيات 🌸',
      body: event.data.text() || 'محاضرة جديدة نزلت على المنصة، ادخل ذاكر بروقان!'
    };
  }

  const tag =
    (payload.data && payload.data.tag) ||
    (payload.data?.lecture_id ? `lec-${payload.data.lecture_id}` : 'portal-update');
  const actionTitle =
    (payload.data && payload.data.actionTitle) || 'افتح المحاضرة 🚀';

  const title = payload.title || 'منصة تانية رياضيات 🌸';
  const options = {
    body: payload.body || 'محاضرة جديدة نزلت على المنصة، ادخل ذاكر بروقان!',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    vibrate: [150, 50, 150],
    dir: 'rtl',
    lang: 'ar',
    tag,
    renotify: true,
    data: payload.data || { url: '/' },
    actions: [
      { action: 'open', title: actionTitle },
      { action: 'close', title: 'لاحقاً' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      // Otherwise open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
