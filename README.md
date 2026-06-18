# WhatsApp Work Update Scheduler

A full MERN application that schedules and sends WhatsApp work updates daily at a chosen time using free tools (MongoDB Atlas, whatsapp-web.js, Express, React + Tailwind).

## 📁 Structure

```
whatsapp-scheduler/
├── backend/      Node.js + Express + MongoDB + whatsapp-web.js worker
└── frontend/     React (Vite) + Tailwind CSS UI
```

## ⚙️ Prerequisites

- Node.js 18+
- Free MongoDB Atlas cluster: https://www.mongodb.com/cloud/atlas
- A secondary WhatsApp number (do NOT use your primary — unofficial automation risks bans)

## 🛠️ Setup

### 1) MongoDB Atlas
1. Create a free M0 cluster.
2. Add a database user.
3. Network Access → "Allow Access from Anywhere" (`0.0.0.0/0`) for dev.
4. Copy the connection string.

### 2) Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI and WHATSAPP_CHAT_ID
npm install
npm run dev          # development
# or
npm start            # production
```

The first time you run it, scan the QR code that appears in the terminal:
- WhatsApp → ⋮ → Linked Devices → Link a Device

The session is cached in `.wwebjs_auth/`, so subsequent starts won't need a re-scan (unless redeployed on ephemeral disk).

### 3) Frontend

```bash
cd frontend
cp .env.example .env
# Default points to http://localhost:5000
npm install
npm run dev
```

Open http://localhost:5173

## 🌐 Deployment

### Backend (Railway recommended over Render for memory)
Railway's free trial ($5 credit) works well; Render's free tier has only 512 MB shared RAM, often OOM-killing Puppeteer.

If using Render, deploy as a **Background Worker** (not Web Service) with:
- Build: `npm install`
- Start: `npm start`
- Env vars: `MONGODB_URI`, `WHATSAPP_CHAT_ID`

⚠️ Free hosting uses ephemeral disk → QR session resets on every redeploy. Upgrade to a paid plan with persistent disk for sticky sessions.

### Frontend
Deploy `frontend/` to Vercel or Netlify:
- Build command: `npm run build`
- Output directory: `dist`
- Env: `VITE_API_URL=https://<your-backend>.railway.app`

## 🧠 Notes

- **WhatsApp ToS risk** — unofficial automation can get your number banned. Use a secondary number.
- **Time zones** — `scheduledTime` is stored as UTC (ISO). Pick your local time; conversion is handled automatically.
- **Daily recurrence** — the schema is one-shot per the spec. Submit one message per night, or extend the schema with `recurrence: 'daily'` and add a recurring worker.
- **Group JID** — for a group, use `1203630xxxxxxxxx@g.us` (find it via `client.getChats()` after first connect).

## 🔧 Config (no .env required)

All backend env vars (`PORT`, `MONGODB_URI`, `WHATSAPP_CHAT_ID`) are hardcoded in `backend/config/config.js`. If a `.env` file is present, its values override the defaults. The frontend API URL is hardcoded in `frontend/src/config.js` (override with `VITE_API_URL` at build time).

`.env` is gitignored — secrets stay local even though defaults are committed.