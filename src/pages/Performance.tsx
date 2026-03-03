import { useEffect, useState } from 'react';
import { TrendingUp, Award, Target, Activity, Play } from 'lucide-react';

export default function Performance() {
  const [stats, setStats] = useState<any>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/performance')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err));
  }, []);

  const handleRunBacktest = async () => {
    setIsBacktesting(true);
    setBacktestResult(null);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: 'XAUUSD', timeframe: '1h', entry_model: 'sniper' })
      });
      const data = await response.json();
      if (data.success) {
        setBacktestResult(data);
      } else {
        alert(`Backtest failed: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error running backtest.');
    } finally {
      setIsBacktesting(false);
    }
  };

  if (!stats) return <div className="text-center py-20 text-gray-500">Loading performance data...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Performance Dashboard</h1>
          <p className="text-gray-400 mt-2">Historical win rate and statistics from closed signals.</p>
        </div>

        {/* Developer Backtesting Tool */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          <div className="text-sm">
            <h4 className="text-white font-medium">Developer Tools</h4>
            <p className="text-gray-400">Run Python <code>backtesting.py</code></p>
          </div>
          <button
            onClick={handleRunBacktest}
            disabled={isBacktesting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          >
            {isBacktesting ? (
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin" /> Running...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" /> Run XAUUSD Sniper
              </span>
            )}
          </button>
        </div>
      </div>

      {backtestResult && (
        <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Backtest Completed!</h2>
            <a
              href={backtestResult.reportUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 underline font-medium text-sm"
            >
              Open Interactive HTML Report
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400 text-xs mb-1">Return</div>
              <div className={`text-lg font-bold ${backtestResult.results['Return [%]'] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {backtestResult.results['Return [%]'].toFixed(2)}%
              </div>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400 text-xs mb-1">Win Rate</div>
              <div className="text-lg font-bold text-white">
                {backtestResult.results['Win Rate [%]'].toFixed(1)}%
              </div>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400 text-xs mb-1">Trades</div>
              <div className="text-lg font-bold text-white">
                {backtestResult.results['Total Trades']}
              </div>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <div className="text-gray-400 text-xs mb-1">Max Drawdown</div>
              <div className="text-lg font-bold text-red-400">
                {backtestResult.results['Max Drawdown [%]'].toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <h3 className="text-gray-400 font-medium">Win Rate</h3>
          </div>
          <div className="text-4xl font-bold text-white">{stats.winRate}%</div>
          <div className="text-sm text-gray-500 mt-2">{stats.wins} W / {stats.losses} L</div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-gray-400 font-medium">Total Pips</h3>
          </div>
          <div className="text-4xl font-bold text-green-400">+{stats.totalPips}</div>
          <div className="text-sm text-gray-500 mt-2">Across {stats.totalTrades} total trades</div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="text-gray-400 font-medium">Average R:R</h3>
          </div>
          <div className="text-4xl font-bold text-white">{stats.avgRR}</div>
          <div className="text-sm text-gray-500 mt-2">Risk to Reward Ratio</div>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-purple-500" />
            <h3 className="text-gray-400 font-medium">Entry Models</h3>
          </div>
          <div className="text-2xl font-bold text-white">{stats.sniperTrades} <span className="text-sm font-normal text-gray-500">Sniper</span></div>
          <div className="text-2xl font-bold text-white">{stats.smcTrades} <span className="text-sm font-normal text-gray-500">SMC</span></div>
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-2xl p-8 mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Disclaimer</h2>
        <p className="text-gray-400 leading-relaxed">
          The performance metrics shown above are based on historical signals generated by the SMC + Sniper engine. Past performance is not indicative of future results. Trading foreign exchange on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade foreign exchange, you should carefully consider your investment objectives, level of experience, and risk appetite.
        </p>
      </div>
    </div>
  );
}
