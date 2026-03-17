'use strict';

const express = require('express');
const crypto  = require('crypto');
const path    = require('path');
const axios   = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Config validation ──────────────────────────────────────────────────────────
const ADMIN_KEY = process.env.ADMIN_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

if (!ADMIN_KEY) {
    console.error('\n❌  ADMIN_KEY is not set in .env — refusing to start.\n');
    process.exit(1);
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));        // Reject oversized payloads

// Serve the frontend from the /frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Security helpers ───────────────────────────────────────────────────────────
/**
 * Constant-time string comparison to prevent timing-based attacks.
 * Hash both inputs with HMAC so we always compare fixed-length buffers.
 */
function secureKeyMatch(provided, expected) {
    if (typeof provided !== 'string' || typeof expected !== 'string') return false;
    const hmac = (v) => crypto.createHmac('sha256', 'shrimpy-cmp').update(v).digest();
    return crypto.timingSafeEqual(hmac(provided), hmac(expected));
}

/**
 * Strip control chars (keep emoji/unicode) and enforce a max length.
 * Prevents control-character injection into the Telegram message.
 */
function sanitize(value, maxLength = 50) {
    if (typeof value !== 'string') return '';
    return value
        .replace(/[\x00-\x1F\x7F]/g, '')   // strip ASCII control characters
        .trim()
        .slice(0, maxLength);
}

// ── POST /api/send-signal ──────────────────────────────────────────────────────
app.post('/api/send-signal', async (req, res) => {

    // 1. Authenticate request
    const providedKey = req.headers['x-admin-key'];
    if (!secureKeyMatch(providedKey, ADMIN_KEY)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Verify server is configured
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
        return res.status(500).json({ error: 'Server configuration incomplete — check .env' });
    }

    // 3. Validate & sanitize body fields
    const asset     = sanitize(req.body.asset,     20) || 'XAUUSD';
    const tradeType = sanitize(req.body.tradeType, 20);
    const typeEmoji = sanitize(req.body.typeEmoji,  8);
    const entry     = sanitize(req.body.entry,     30);
    const sl        = sanitize(req.body.sl,        30);
    const tp        = sanitize(req.body.tp,        30);
    const note      = sanitize(req.body.note,     200);

    if (!tradeType || !entry || !sl || !tp) {
        return res.status(400).json({ error: 'Missing required fields: tradeType, entry, sl, tp' });
    }

    // 4. Build the Telegram message (matches frontend buildMessage() exactly)
    const pair = asset;
    const lines = [
        `📣 ${pair} SIGNAL • ${tradeType}`,
        `Action: ${typeEmoji} ${tradeType}`,
        `Entry: ${entry}`,
        `SL: ${sl} • TP: ${tp}`
    ];
    if (note) {
        lines.push('');
        lines.push(`Note: ${note}`);
    }
    const message = lines.join('\n');

    // 5. Send to Telegram Bot API
    try {
        const telegramRes = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            { chat_id: CHAT_ID, text: message },
            { timeout: 10_000 }
        );

        if (!telegramRes.data.ok) {
            const desc = telegramRes.data.description || 'Unknown Telegram error';
            console.error('Telegram API rejected message:', desc);
            return res.status(502).json({ error: 'Telegram rejected the request: ' + desc });
        }

        const messageId = telegramRes.data.result.message_id;
        console.log(`[${new Date().toISOString()}] ✅ Signal sent — Telegram message_id: ${messageId}`);
        return res.json({ success: true, message_id: messageId });

    } catch (err) {
        const detail = err.response?.data?.description || err.message;
        console.error('Error contacting Telegram API:', detail);
        return res.status(502).json({ error: 'Failed to reach Telegram: ' + detail });
    }
});

// ── POST /api/send-urgent ─────────────────────────────────────────────────────
app.post('/api/send-urgent', async (req, res) => {

    const providedKey = req.headers['x-admin-key'];
    if (!secureKeyMatch(providedKey, ADMIN_KEY)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
        return res.status(500).json({ error: 'Server configuration incomplete — check .env' });
    }

    const asset  = sanitize(req.body.asset, 20) || 'XAUUSD';
    const note   = sanitize(req.body.note, 200);
    const action = sanitize(req.body.action, 20).toLowerCase();

    const templates = {
        'close': {
            firstLine: `⛔ CLOSE ${asset} NOW`
        },
        'buy-now': {
            firstLine: `🟢 BUY NOW ${asset}`
        },
        'sell-now': {
            firstLine: `🔴 SELL NOW ${asset}`
        }
    };

    const cfg = templates[action];
    if (!cfg) {
        return res.status(400).json({ error: 'Invalid urgent action' });
    }

    const lines = [cfg.firstLine];

    if (note) {
        lines.push('');
        lines.push(`Note: ${note}`);
    }
    const message = lines.join('\n');

    try {
        const telegramRes = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            { chat_id: CHAT_ID, text: message },
            { timeout: 10_000 }
        );

        if (!telegramRes.data.ok) {
            const desc = telegramRes.data.description || 'Unknown Telegram error';
            console.error('Telegram API rejected urgent message:', desc);
            return res.status(502).json({ error: 'Telegram rejected the request: ' + desc });
        }

        return res.json({ success: true, message_id: telegramRes.data.result.message_id });

    } catch (err) {
        const detail = err.response?.data?.description || err.message;
        console.error('Error contacting Telegram API:', detail);
        return res.status(502).json({ error: 'Failed to reach Telegram: ' + detail });
    }
});

// ── Catch-all: serve index.html (SPA fallback) ─────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
  🦐  SHRIMPY SIGNALS  ─────────────────────────────────
  ✅  Server running   →  http://localhost:${PORT}
  🔒  Admin key        →  SET
  📡  Telegram bot     →  ${BOT_TOKEN ? 'CONFIGURED' : '⚠️  NOT SET (add to .env)'}
  📬  Chat / Channel   →  ${CHAT_ID   ? 'CONFIGURED' : '⚠️  NOT SET (add to .env)'}
  ──────────────────────────────────────────────────────
`);
});
