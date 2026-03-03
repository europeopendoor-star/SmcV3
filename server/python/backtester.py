import pandas as pd
import sys
import os
import json
import traceback
from sqlalchemy import create_engine

# Try to import backtesting, or give a friendly error if it's not installed
try:
    from backtesting import Backtest, Strategy
    from backtesting.lib import crossover
except ImportError:
    print("Error: backtesting.py is not installed. Run: pip install backtesting")
    sys.exit(1)

def get_engine(db_url):
    """Create SQLAlchemy engine for Postgres."""
    # SQLAlchemy requires postgresql:// instead of postgres://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    return create_engine(db_url)

def get_data(db_url, pair, timeframe):
    """Fetch historical candle data from Postgres and convert to pandas DataFrame."""
    try:
        engine = get_engine(db_url)
        query = """
            SELECT time as Date, open as Open, high as High, low as Low, close as Close, volume as Volume
            FROM candles
            WHERE pair = %(pair)s AND timeframe = %(timeframe)s
            ORDER BY time ASC
        """

        # Read into pandas
        df = pd.read_sql_query(query, engine, params={"pair": pair, "timeframe": timeframe})

        if df.empty:
            return df

        # Convert JS timestamp (seconds) to datetime
        # (Note: In the original sqlite schema it seemed to be milliseconds, but in your new schema it might be seconds.
        # Let's handle both dynamically or assume seconds as stored in `Math.floor(Date.now()/1000)` )
        # Actually in dataIngestion.ts: `time: Math.floor(new Date(q.date).getTime() / 1000)` -> SECONDS
        df['Date'] = pd.to_datetime(df['Date'], unit='s')
        df.set_index('Date', inplace=True)
        return df
    except Exception as e:
        print(f"Error reading database: {e}")
        traceback.print_exc()
        sys.exit(1)

def get_signals(db_url, pair, entry_model):
    """Fetch generated signals to simulate execution."""
    try:
        engine = get_engine(db_url)
        query = """
            SELECT created_at, direction, entry_zone_low, entry_zone_high, stop_loss, take_profit_1
            FROM signals
            WHERE pair = %(pair)s AND entry_model = %(entry_model)s
            ORDER BY created_at ASC
        """
        signals = pd.read_sql_query(query, engine, params={"pair": pair, "entry_model": entry_model})

        if not signals.empty:
            # created_at is in seconds
            signals['created_at'] = pd.to_datetime(signals['created_at'], unit='s')
        return signals
    except Exception as e:
        print(f"Error fetching signals: {e}")
        return pd.DataFrame()


class SMA_Cross_Demo(Strategy):
    """
    A simple SMA Crossover strategy for demonstration if the db has no signals.
    """
    n1 = 10
    n2 = 20

    def init(self):
        price = self.data.Close
        # The simplest way to add an indicator to `backtesting` is via `self.I()`
        self.ma1 = self.I(self.SMA, price, self.n1)
        self.ma2 = self.I(self.SMA, price, self.n2)

    def next(self):
        if crossover(self.ma1, self.ma2):
            self.buy()
        elif crossover(self.ma2, self.ma1):
            self.sell()

    def SMA(self, arr, n):
        """Simple Moving Average"""
        return pd.Series(arr).rolling(n).mean()


class DB_Signal_Executor(Strategy):
    """
    Executes based on pre-calculated signals from the Node.js backend.
    """
    pair = "XAUUSD"
    db_url = ""
    entry_model = "sniper"

    def init(self):
        self.signals = get_signals(self.db_url, self.pair, self.entry_model)
        self.signal_idx = 0
        self.num_signals = len(self.signals)

    def next(self):
        if self.signal_idx >= self.num_signals:
            return

        current_time = self.data.index[-1]
        next_signal = self.signals.iloc[self.signal_idx]
        signal_time = next_signal['created_at']

        if current_time >= signal_time:
            direction = next_signal['direction']
            sl = next_signal['stop_loss']
            tp = next_signal['take_profit_1']

            # Simple execution logic
            if direction == "LONG" and not self.position.is_long:
                 self.buy(sl=sl, tp=tp)
            elif direction == "SHORT" and not self.position.is_short:
                 self.sell(sl=sl, tp=tp)

            self.signal_idx += 1


def run_backtest(db_url, pair, timeframe, entry_model, output_file):
    print(f"Fetching data for {pair} {timeframe} from Postgres...")
    df = get_data(db_url, pair, timeframe)

    if df.empty:
        print(f"Error: No data found for pair={pair} timeframe={timeframe} in DB.")
        print("Please ensure the Node.js backend has ingested data first.")
        sys.exit(1)

    print(f"Loaded {len(df)} candles.")

    # Check if we actually have signals in the DB for this pair/model
    signals = get_signals(db_url, pair, entry_model)

    # Decide which strategy to use
    if not signals.empty:
        print(f"Found {len(signals)} signals. Using DB_Signal_Executor strategy.")
        DB_Signal_Executor.db_url = db_url
        DB_Signal_Executor.pair = pair
        DB_Signal_Executor.entry_model = entry_model
        strategy_class = DB_Signal_Executor
    else:
        print(f"No signals found for {pair}/{entry_model}. Falling back to SMA_Cross_Demo strategy.")
        strategy_class = SMA_Cross_Demo

    # Ensure directory for output file exists
    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)

    # Initialize backtest
    print("Running backtest simulation...")
    # Using margin=1.0 for Forex/Crypto standard (no margin). Use 0.02 for 50x leverage.
    bt = Backtest(df, strategy_class, cash=10000, commission=.0002)

    # Run
    try:
        stats = bt.run()

        # Plot to HTML
        print(f"Saving report to {output_file}...")
        # open_browser=False to prevent popping open a browser tab on the server
        bt.plot(filename=output_file, open_browser=False)

        # Output results as JSON for Node.js
        results = {
            "Return [%]": float(stats["Return [%]"]) if pd.notna(stats["Return [%]"]) else 0,
            "Win Rate [%]": float(stats["Win Rate [%]"]) if pd.notna(stats["Win Rate [%]"]) else 0,
            "Total Trades": int(stats["# Trades"]),
            "Max Drawdown [%]": float(stats["Max. Drawdown [%]"]) if pd.notna(stats["Max. Drawdown [%]"]) else 0,
            "HTML_Report": output_file
        }

        # Print magic string block so Node.js can easily parse it from stdout
        print("---JSON_START---")
        print(json.dumps(results))
        print("---JSON_END---")

    except Exception as e:
        print(f"Error during backtesting: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python backtester.py <db_url> <pair> <timeframe> <entry_model> <output_file>")
        sys.exit(1)

    db_url = sys.argv[1]
    pair = sys.argv[2]
    timeframe = sys.argv[3]
    entry_model = sys.argv[4]
    output_file = sys.argv[5]

    run_backtest(db_url, pair, timeframe, entry_model, output_file)
