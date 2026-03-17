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
  const tradeType = sanitize(body.tradeType, 20);
  const typeEmoji = sanitize(body.typeEmoji, 8);
  const entry = sanitize(body.entry, 30);
  const sl = sanitize(body.sl, 30);
  const tp = sanitize(body.tp, 30);
  const note = sanitize(body.note, 200);

  if (!tradeType || !entry || !sl || !tp) {
    return json({ error: 'Missing required fields: tradeType, entry, sl, tp' }, 400);
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
    const messageId = await sendTelegramMessage(cfg.botToken, cfg.chatId, text);
    return json({ success: true, message_id: messageId });
  } catch (err) {
    return json({ error: `Failed to reach Telegram: ${err.message}` }, 502);
  }
}
