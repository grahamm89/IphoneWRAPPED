import express from 'express';
import webPush from 'web-push';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Validate env (non-fatal warnings)
['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_MAILTO'].forEach(k => {
  if (!process.env[k]) console.warn(`⚠️  Missing ${k} in environment (.env)`);
});

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_MAILTO) {
  webPush.setVapidDetails(
    `mailto:${process.env.VAPID_MAILTO}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON
app.use(express.json());

// In-memory subscription set (replace with persistent storage for production)
const subscriptions = new Set();

function normalizeSubscription(sub) {
  // stringify for deterministic equality in the Set
  return JSON.stringify(sub);
}

// Endpoints
app.get('/vapidPublicKey', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

app.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  subscriptions.add(normalizeSubscription(sub));
  res.status(201).json({ ok: true });
});

app.post('/notify', async (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Server missing VAPID keys' });
  }
  const { title = 'Notification', body = '', url = '/', icon = '/icon-512.png' } = req.body || {};
  const payload = JSON.stringify({ title, body, url, icon });

  const arr = Array.from(subscriptions);
  const results = await Promise.allSettled(arr.map(async (s) => {
    const sub = JSON.parse(s);
    await webPush.sendNotification(sub, payload);
  }));

  // Remove 404/410 (gone) subscriptions
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      const code = r.reason?.statusCode;
      if (code === 404 || code === 410) {
        const key = arr[idx];
        subscriptions.delete(key);
      }
    }
  });

  res.json({
    message: 'Notifications processed',
    successCount: results.filter(r => r.status === 'fulfilled').length,
    failureCount: results.filter(r => r.status === 'rejected').length
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('Endpoints: GET /vapidPublicKey, POST /subscribe, POST /notify');
});
