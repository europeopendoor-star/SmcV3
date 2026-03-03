import db from './db.js';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

const bot = token ? new TelegramBot(token, { polling: false }) : null;

export async function dispatchAlerts() {
  if (!bot || !channelId) return;

  // Find signals that are active or waiting but haven't been alerted yet
  // For simplicity, we can alert on any new signal created in the last 2 minutes
  const now = Math.floor(Date.now() / 1000);
  const twoMinutesAgo = now - 120;

  const { data: newSignals, error } = await db.from('signals')
    .select('*')
    .gt('created_at', twoMinutesAgo)
    .order('created_at', { ascending: false });

  if (error || !newSignals) return;

  for (const signal of newSignals) {
    // Only send if we haven't already (in a real app, track alert status in DB)
    // To prevent spam, we'd add an `alerted` boolean column to the `signals` table
    const msg = formatMessage(signal);
    try {
      await bot.sendMessage(channelId, msg, { parse_mode: 'HTML' });
      // Here you would mark it as alerted in DB
    } catch (err) {
      console.error('Failed to send telegram alert', err);
    }
  }
}

function formatMessage(signal: any) {
  const emoji = signal.direction === 'LONG' ? '🟢' : '🔴';
  return `
<b>${emoji} NEW ${signal.entry_model.toUpperCase()} SIGNAL: ${signal.pair}</b>

<b>Direction:</b> ${signal.direction}
<b>Timeframe:</b> ${signal.timeframe}
<b>Setup:</b> ${signal.setup_type}

<b>Entry Zone:</b> ${signal.entry_zone_low.toFixed(4)} - ${signal.entry_zone_high.toFixed(4)}
<b>Stop Loss:</b> ${signal.stop_loss.toFixed(4)}
<b>Take Profit 1:</b> ${signal.take_profit_1.toFixed(4)}
${signal.take_profit_2 ? `<b>Take Profit 2:</b> ${signal.take_profit_2.toFixed(4)}` : ''}

<i>HTF Context: ${signal.htf_timeframe} ${signal.htf_zone_type}</i>
  `;
}
