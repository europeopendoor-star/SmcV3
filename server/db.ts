import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'trading.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS candles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    time INTEGER NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL,
    UNIQUE(pair, timeframe, time)
  );

  CREATE TABLE IF NOT EXISTS structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BOS', 'CHoCH'
    direction TEXT NOT NULL, -- 'bullish', 'bearish'
    price REAL NOT NULL,
    time INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    type TEXT NOT NULL, -- 'OB', 'FVG'
    direction TEXT NOT NULL, -- 'bullish', 'bearish'
    top REAL NOT NULL,
    bottom REAL NOT NULL,
    time INTEGER NOT NULL,
    mitigated INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    pair TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'LONG', 'SHORT'
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'waiting', 'active', 'closed'
    entry_model TEXT NOT NULL, -- 'smc', 'sniper'
    timeframe TEXT NOT NULL,
    
    entry_zone_low REAL NOT NULL,
    entry_zone_high REAL NOT NULL,
    stop_loss REAL NOT NULL,
    take_profit_1 REAL NOT NULL,
    take_profit_2 REAL NOT NULL,
    take_profit_3 REAL,
    setup_type TEXT NOT NULL,
    
    htf_timeframe TEXT,
    htf_structure_type TEXT,
    htf_zone_type TEXT,
    htf_zone_price_range TEXT,
    
    ltf_timeframe TEXT,
    sweep_type TEXT,
    sweep_price REAL,
    displacement_candle_time INTEGER,
    micro_zone_type TEXT,
    micro_structure_break_price REAL
  );
`);

export default db;
