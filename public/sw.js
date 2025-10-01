// Service Worker for Web Push Notifications
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  const options = {
    body: event.data ? event.data.text() : '새로운 알림이 있습니다!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '확인하기',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('웹푸쉬 알림', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // 알림 클릭 시 메인 페이지로 이동
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // 알림 닫기
    console.log('Notification closed');
  } else {
    // 기본 동작: 알림 클릭 시 메인 페이지로 이동
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});