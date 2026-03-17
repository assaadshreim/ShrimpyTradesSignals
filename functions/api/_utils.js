function sanitize(value, maxLength = 50) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function unauthorized() {
  return json({ error: 'Unauthorized' }, 401);
}

function secureEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function sendTelegramMessage(botToken, chatId, text) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  const data = await resp.json();
  if (!resp.ok || !data.ok) {
    const desc = data?.description || `HTTP ${resp.status}`;
    throw new Error(desc);
  }

  return data.result?.message_id;
}

function requireConfig(env) {
  const adminKey = env.ADMIN_KEY;
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!adminKey || !botToken || !chatId) {
    return { ok: false, response: json({ error: 'Server configuration incomplete — check environment variables' }, 500) };
  }

  return { ok: true, adminKey, botToken, chatId };
}

function checkAdminKey(request, adminKey) {
  const provided = request.headers.get('x-admin-key');
  return secureEqual(provided || '', adminKey || '');
}

export {
  sanitize,
  json,
  unauthorized,
  sendTelegramMessage,
  requireConfig,
  checkAdminKey
};
