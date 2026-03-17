import {
  sanitize,
  json,
  unauthorized,
  sendTelegramMessage,
  requireConfig,
  checkAdminKey
} from './_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const cfg = requireConfig(env);
  if (!cfg.ok) return cfg.response;

  if (!checkAdminKey(request, cfg.adminKey)) {
    return unauthorized();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const asset = sanitize(body.asset, 20) || 'XAUUSD';
  const note = sanitize(body.note, 200);
  const action = sanitize(body.action, 20).toLowerCase();

  const templates = {
    close: `⛔ CLOSE ${asset} NOW`,
    'buy-now': `🟢 BUY NOW ${asset}`,
    'sell-now': `🔴 SELL NOW ${asset}`
  };

  const firstLine = templates[action];
  if (!firstLine) {
    return json({ error: 'Invalid urgent action' }, 400);
  }

  const lines = [firstLine];
  if (note) {
    lines.push('');
    lines.push(`Note: ${note}`);
  }

  const text = lines.join('\n');

  try {
    const messageId = await sendTelegramMessage(cfg.botToken, cfg.chatId, text);
    return json({ success: true, message_id: messageId });
  } catch (err) {
    return json({ error: `Failed to reach Telegram: ${err.message}` }, 502);
  }
}
