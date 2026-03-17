# 🦐 Shrimpy Signals — Trading Signal Portal

A dark-mode web portal that lets you craft and broadcast professional trading signals to your Telegram channel with one click.

---

## Folder Structure

```
SHRIMPY TRADES PORTAL/
├── frontend/
│   └── index.html          ← Single-page UI (HTML + CSS + Vanilla JS)
├── backend/
│   ├── server.js           ← Express API server + Telegram integration
│   └── package.json        ← Node.js project & dependencies
├── .env.example            ← Environment variable template
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js v16+** — [nodejs.org](https://nodejs.org)
- A **Telegram Bot** (created via [@BotFather](https://t.me/BotFather))
- A Telegram **channel or group** where your bot is an admin

---

## Setup

### Step 1 — Create your Telegram Bot

1. Open Telegram and start a chat with **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the **Bot Token** you receive (e.g. `123456789:ABCdef...`)
4. Add your bot as an **Admin** to your target channel/group
   - For a channel: go to Channel Info → Administrators → Add Admin

### Step 2 — Get your Chat ID

| Type | How to find it |
|------|---------------|
| Public channel | Use `@YourChannelName` directly |
| Private channel/group | Add [@userinfobot](https://t.me/userinfobot) temporarily — it reports the numeric ID (e.g. `-1001234567890`) then remove it |

### Step 3 — Configure environment

```bash
# From the project root:
copy .env.example .env
```

Edit `.env` and fill in your values:

```env
ADMIN_KEY=your-strong-secret-password
TELEGRAM_BOT_TOKEN=123456789:YourBotToken
TELEGRAM_CHAT_ID=@YourChannelName
PORT=3000
```

> ⚠️ `ADMIN_KEY` is the password you'll type on the login screen. Make it strong.

### Step 4 — Install dependencies & run

```bash
cd backend
npm install
npm start
```

Open **http://localhost:3000** in your browser.

For development with auto-restart on file changes:

```bash
npm run dev
```

---

## How to Use

1. Open `http://localhost:3000`
2. Enter your **Admin Key** and click **UNLOCK ACCESS**
3. Fill in the signal details:
   - **Asset** — defaults to `XAUUSD`, change freely
   - **Trade Type** — toggle between 🟢 BUY NOW, 🔴 SELL NOW, 🔵 PENDING
   - **Entry Price**, **Stop Loss**, **TP1 / TP2 / TP3**
4. Watch the **Telegram Preview** update live on the right
5. Click **🚀 SHIP SIGNAL** — the message fires to your channel instantly

---

## Signal Message Format

```
🚀 SHRIMPY SIGNAL 🚀
🟡 Asset: XAUUSD
🟢 Type: BUY NOW
📍 Entry: 3215.00
🛡️ SL: 3190.00
🎯 TP 1: 3230.00
🎯 TP 2: 3245.00
🎯 TP 3: 3265.00
🦐 🌊 Ride the wave!
```

---

## Security Notes

| Layer | What it does |
|-------|-------------|
| Auth gate | Login screen blocks UI without the key |
| Server-side validation | Every API request re-validates the key (constant-time comparison to prevent timing attacks) |
| Input sanitization | Control characters are stripped; field lengths are capped |
| Payload limit | Request bodies > 10 KB are rejected |
| .env / .gitignore | Secrets are never committed to version control |
