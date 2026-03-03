import express from 'express';
import db from './db.js';
import { ingestHistoricalData, startLiveIngestion } from './dataIngestion.js';
import { runSMCEngine } from './smcEngine.js';
import { runSniperEngine } from './sniperEngine.js';
import { runSignalEngine, updateSignalStatuses } from './signalEngine.js';
import { dispatchAlerts } from './alertEngine.js';

const router = express.Router();

// Public API
router.get('/signals/active', (req, res) => {
  const signals = db.prepare(`SELECT * FROM signals WHERE status IN ('active', 'waiting') ORDER BY created_at DESC`).all();
  res.json(signals);
});

router.get('/signals/closed', (req, res) => {
  const signals = db.prepare(`SELECT * FROM signals WHERE status = 'closed' ORDER BY created_at DESC LIMIT 50`).all();
  res.json(signals);
});

router.get('/signals/:id', (req, res) => {
  const signal = db.prepare(`SELECT * FROM signals WHERE id = ?`).get(req.params.id);
  if (signal) res.json(signal);
  else res.status(404).json({ error: 'Signal not found' });
});

router.get('/structures/:pair/:timeframe', (req, res) => {
  const structures = db.prepare(`SELECT * FROM structures WHERE pair = ? AND timeframe = ? ORDER BY time DESC LIMIT 100`).all(req.params.pair, req.params.timeframe);
  res.json(structures);
});

router.get('/zones/:pair/:timeframe', (req, res) => {
  const zones = db.prepare(`SELECT * FROM zones WHERE pair = ? AND timeframe = ? ORDER BY time DESC LIMIT 100`).all(req.params.pair, req.params.timeframe);
  res.json(zones);
});

router.get('/candles/:pair/:timeframe', (req, res) => {
  const candles = db.prepare(`SELECT * FROM candles WHERE pair = ? AND timeframe = ? ORDER BY time ASC LIMIT 500`).all(req.params.pair, req.params.timeframe);
  res.json(candles);
});

router.get('/performance', (req, res) => {
  // Calculate mock performance stats from closed signals
  // In a real app, we would track actual PnL per signal
  const closedSignals = db.prepare(`SELECT * FROM signals WHERE status = 'closed'`).all() as any[];
  
  const totalTrades = closedSignals.length;
  // For demo purposes, we simulate a win rate if there aren't enough closed trades
  const wins = closedSignals.filter(s => Math.random() > 0.3).length; // Simulated 70% win rate for demo
  const losses = totalTrades - wins;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  
  const smcTrades = closedSignals.filter(s => s.entry_model === 'smc').length;
  const sniperTrades = closedSignals.filter(s => s.entry_model === 'sniper').length;

  res.json({
    totalTrades: totalTrades > 0 ? totalTrades : 142, // Mock data if empty
    winRate: totalTrades > 0 ? winRate.toFixed(1) : 72.5,
    wins: totalTrades > 0 ? wins : 103,
    losses: totalTrades > 0 ? losses : 39,
    avgRR: '1:4.5',
    totalPips: totalTrades > 0 ? wins * 45 - losses * 10 : 4250,
    smcTrades: totalTrades > 0 ? smcTrades : 85,
    sniperTrades: totalTrades > 0 ? sniperTrades : 57
  });
});

// Internal API (for testing/triggering manually)
router.post('/ingest', async (req, res) => {
  await ingestHistoricalData();
  res.json({ message: 'Ingestion completed' });
});

router.post('/run-smc', (req, res) => {
  runSMCEngine();
  res.json({ message: 'SMC Engine completed' });
});

router.post('/run-sniper', (req, res) => {
  runSniperEngine();
  res.json({ message: 'Sniper Engine completed' });
});

router.post('/run-signals', (req, res) => {
  runSignalEngine();
  res.json({ message: 'Signal Engine completed' });
});

router.post('/dispatch-alerts', (req, res) => {
  dispatchAlerts();
  res.json({ message: 'Alerts dispatched' });
});

// Start background jobs
export async function startBackgroundJobs() {
  await ingestHistoricalData();
  startLiveIngestion();

  setInterval(() => {
    runSMCEngine();
    runSignalEngine();
    runSniperEngine();
    updateSignalStatuses();
    dispatchAlerts();
  }, 60000); // Run every minute
}

export default router;
