function sanitize(value, maxLength = 50) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const adminKey = process.env.ADMIN_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!adminKey || !botToken || !chatId) {
    return json(500, { error: 'Server configuration incomplete — check environment variables' });
  }

  const providedKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  if (!secureEqual(providedKey || '', adminKey)) {
    return json(401, { error: 'Unauthorized' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const asset = sanitize(body.asset, 20) || 'XAUUSD';
  const tradeType = sanitize(body.tradeType, 20);
  const typeEmoji = sanitize(body.typeEmoji, 8);
  const entry = sanitize(body.entry, 30);
  const sl = sanitize(body.sl, 30);
  const tp = sanitize(body.tp, 30);
  const note = sanitize(body.note, 200);

  if (!tradeType || !entry || !sl || !tp) {
    return json(400, { error: 'Missing required fields: tradeType, entry, sl, tp' });
  }

  const lines = [
    `📣 ${asset} SIGNAL • ${tradeType}`,
    `Action: ${typeEmoji} ${tradeType}`,
    `Entry: ${entry}`,
    `SL: ${sl} • TP: ${tp}`
  ];

  if (note) {
    lines.push('');
    lines.push(`Note: ${note}`);
  }

  const text = lines.join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      const desc = data?.description || `HTTP ${response.status}`;
      return json(502, { error: `Failed to reach Telegram: ${desc}` });
    }

    return json(200, { success: true, message_id: data.result?.message_id });
  } catch (err) {
    return json(502, { error: `Failed to reach Telegram: ${err.message}` });
  }
};
