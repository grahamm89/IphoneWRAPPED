async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    alert('Service workers are not supported in this browser.');
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('SW registration failed', err);
    alert('Failed to register service worker. See console for details.');
    return null;
  }
}

function urlBase64ToUint8Array(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw.split('').map((c) => c.charCodeAt(0)));
}

async function getPublicKey() {
  const res = await fetch('/vapidPublicKey');
  const { key } = await res.json();
  return key;
}

async function subscribe() {
  const reg = await navigator.serviceWorker.ready;
  const publicVapidKey = await getPublicKey();
  if (!publicVapidKey) {
    alert('Server has no VAPID public key configured.');
    return;
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  });
  await fetch('/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  });
  alert('Subscribed to push!');
}

document.addEventListener('DOMContentLoaded', async () => {
  const reg = await registerServiceWorker();
  if (!reg) return;

  const btn = document.getElementById('subscribeBtn');
  btn.addEventListener('click', async () => {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      alert('Notifications permission denied.');
      return;
    }
    await subscribe();
  });
});
