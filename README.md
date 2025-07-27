# Dishwasher Helper PWA (Complete Example)

A minimal **Progressive Web App** with **Web Push** using Express on Node.js.

## Features
- Service Worker with simple cache strategy
- Manifest for installable PWA (icons included)
- Web Push endpoints (subscribe + broadcast)
- Test form to send a push notification

## Requirements
- Node.js 18+
- Modern browser (on iOS, install to Home Screen for push)

## Setup

1) Install dependencies
```bash
npm install
```

2) Generate VAPID keys **once**
```bash
npm run generate:vapid
```
Copy the printed keys into a new `.env` file (see `.env.example`):
```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_MAILTO=you@example.com
PORT=3000
```

3) Start the server
```bash
npm start
```
Open http://localhost:3000

> **iOS note:** Push notifications only work from the installed PWA.
Open the site in Safari, **Add to Home Screen**, then launch the app and subscribe.

## Testing push

- Click **Subscribe to notifications** and allow notifications
- Use the form on the page to POST to `/notify`, or via curl:
```bash
curl -X POST http://localhost:3000/notify \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","body":"It works!","url":"/"}'
```

## Project structure
```
.
├─ server.js
├─ generate-keys.js
├─ package.json
├─ .env.example
├─ public/
│  ├─ index.html
│  ├─ script.js
│  ├─ sw.js
│  ├─ manifest.webmanifest
│  ├─ icon-192.png
│  └─ icon-512.png
└─ README.md
```

## Production notes
- Replace the in-memory subscription store with a persistent database.
- Serve over HTTPS in production. (localhost is allowed without HTTPS.)
- Implement authentication or a secret for `/notify` if you don't want an open endpoint.
