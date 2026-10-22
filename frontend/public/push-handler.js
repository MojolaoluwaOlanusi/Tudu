/* global self, clients */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Tudu', body: event.data.text() };
  }

  const title = payload.title || 'Tudu';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'tudu-notification',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            return client.focus().then(() => {
              if (client.navigate) return client.navigate(targetUrl);
              return undefined;
            });
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
        return undefined;
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag !== 'tudu-sync') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage('tudu-sync'));
    })
  );
});
