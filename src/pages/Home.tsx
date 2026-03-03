import { Link } from 'react-router-dom';
import { ArrowRight, Target, Shield, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    fetch('/api/signals/active')
      .then((res) => res.json())
      .then((data) => setSignals(data.slice(0, 3)))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-16">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
          Precision Trading <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
            SMC + Sniper Execution
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Institutional-grade Forex signals focused on XAUUSD and major pairs.
          No indicators. Pure price action.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/signals"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            View Live Signals <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/education"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Learn the Strategy
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <Target className="w-10 h-10 text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Sniper Entries</h3>
          <p className="text-gray-400">
            LTF execution on M1/M5 after liquidity sweeps. Limit orders only for
            maximum R:R.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <Shield className="w-10 h-10 text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">SMC Context</h3>
          <p className="text-gray-400">
            HTF bias based on H1/H4 structure, Order Blocks, and Fair Value Gaps.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <Zap className="w-10 h-10 text-yellow-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Real-Time Alerts</h3>
          <p className="text-gray-400">
            Instant notifications via Telegram and Email when a setup forms.
          </p>
        </div>
      </section>

      {/* Recent Signals */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Recent Signals</h2>
          <Link to="/signals" className="text-yellow-500 hover:text-yellow-400 font-medium">
            View all &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {signals.map((signal: any) => (
            <div key={signal.id} className="bg-black border border-white/10 p-6 rounded-xl relative overflow-hidden">
              {signal.entry_model === 'sniper' && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                  SNIPER ENTRY
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">{signal.pair}</h3>
                  <p className="text-sm text-gray-400">{signal.timeframe} • {signal.setup_type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  signal.direction === 'LONG' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {signal.direction}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Entry Zone</span>
                  <span className="font-mono text-white">{signal.entry_zone_low.toFixed(5)} - {signal.entry_zone_high.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stop Loss</span>
                  <span className="font-mono text-red-400">{signal.stop_loss.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Take Profit 1</span>
                  <span className="font-mono text-green-400">{signal.take_profit_1.toFixed(5)}</span>
                </div>
              </div>
            </div>
          ))}
          {signals.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/10">
              No active signals at the moment. Waiting for the next setup...
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
