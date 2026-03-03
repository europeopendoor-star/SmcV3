import db from './db.js';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

let bot: TelegramBot | null = null;
if (token) {
  bot = new TelegramBot(token, { polling: false });
}

export function dispatchAlerts() {
  const newSignals = db.prepare(`
    SELECT * FROM signals WHERE status IN ('waiting', 'active') AND created_at > ?
  `).all(Math.floor(Date.now() / 1000) - 60) as any[]; // Signals created in the last minute

  for (const signal of newSignals) {
    const message = `
🚨 *New ${signal.entry_model.toUpperCase()} Signal* 🚨
*Pair:* ${signal.pair}
*Timeframe:* ${signal.timeframe}
*Direction:* ${signal.direction}
*Entry Zone:* ${signal.entry_zone_low} - ${signal.entry_zone_high}
*Stop Loss:* ${signal.stop_loss}
*Take Profit 1:* ${signal.take_profit_1}
*Take Profit 2:* ${signal.take_profit_2}
*Setup Type:* ${signal.setup_type}
${signal.entry_model === 'sniper' ? '🎯 *SNIPER ENTRY*' : ''}
    `;

    // Send Telegram alert if configured
    if (bot && channelId) {
      bot.sendMessage(channelId, message, { parse_mode: 'Markdown' })
        .then(() => console.log(`[Telegram] Sent alert for ${signal.pair}`))
        .catch(err => console.error(`[Telegram] Failed to send alert:`, err));
    } else {
      console.log(`[Telegram Alert Simulated] Sending message:\n${message}`);
    }

    // Simulate sending Email alert
    console.log(`[Email Alert] Sending email to subscribers for ${signal.pair}`);

    // Simulate Webhook trigger
    console.log(`[Webhook] Triggered for signal ${signal.id}`);
  }
}
