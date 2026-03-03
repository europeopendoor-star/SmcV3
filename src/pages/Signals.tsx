import { fetchWithAuth } from '../lib/api';
import { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';

export default function Signals() {
  const [signals, setSignals] = useState([]);
  const [filter, setFilter] = useState('all'); // all, smc, sniper
  const [pairFilter, setPairFilter] = useState('ALL');

  useEffect(() => {
    fetchWithAuth('/api/signals/active')
      .then((res) => res.json())
      .then((data) => setSignals(data))
      .catch((err) => console.error(err));
  }, []);

  const filteredSignals = signals.filter((s: any) => {
    if (filter !== 'all' && s.entry_model !== filter) return false;
    if (pairFilter !== 'ALL' && s.pair !== pairFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Live Signals</h1>
          <p className="text-gray-400 mt-2">Real-time SMC and Sniper setups.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
            className="bg-black border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 outline-none"
          >
            <option value="ALL">All Pairs</option>
            <option value="XAUUSD">XAUUSD</option>
            <option value="EURUSD">EURUSD</option>
            <option value="GBPUSD">GBPUSD</option>
            <option value="USDJPY">USDJPY</option>
            <option value="AUDUSD">AUDUSD</option>
            <option value="USDCAD">USDCAD</option>
          </select>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-yellow-500 outline-none"
          >
            <option value="all">All Models</option>
            <option value="smc">SMC Context Only</option>
            <option value="sniper">Sniper Entries Only</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSignals.map((signal: any) => (
          <div key={signal.id} className="bg-black border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-500/50 transition-colors">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    {signal.pair}
                    {signal.pair === 'XAUUSD' && <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{signal.timeframe} • {signal.setup_type}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    signal.direction === 'LONG' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {signal.direction}
                  </span>
                  {signal.entry_model === 'sniper' && (
                    <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Sniper Entry
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entry Zone</div>
                  <div className="font-mono text-lg text-white">
                    {signal.entry_zone_low.toFixed(5)} - {signal.entry_zone_high.toFixed(5)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                    <div className="text-xs text-red-400/70 uppercase tracking-wider mb-1">Stop Loss</div>
                    <div className="font-mono text-red-400">{signal.stop_loss.toFixed(5)}</div>
                  </div>
                  <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/10">
                    <div className="text-xs text-green-400/70 uppercase tracking-wider mb-1">Take Profit 1</div>
                    <div className="font-mono text-green-400">{signal.take_profit_1.toFixed(5)}</div>
                  </div>
                </div>

                {signal.entry_model === 'sniper' && (
                  <div className="pt-4 mt-4 border-t border-white/10 text-xs text-gray-400 space-y-2">
                    <div className="flex justify-between">
                      <span>HTF Context:</span>
                      <span className="text-white">{signal.htf_timeframe} {signal.htf_zone_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LTF Trigger:</span>
                      <span className="text-white">{signal.sweep_type} + {signal.micro_zone_type}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/5 px-6 py-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {new Date(signal.created_at * 1000).toLocaleTimeString()}
              </span>
              <span className="flex items-center gap-2 text-xs font-medium text-yellow-500">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                {signal.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}

        {filteredSignals.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/20 rounded-2xl">
            <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No signals found</h3>
            <p className="text-gray-400">Try adjusting your filters or wait for a new setup.</p>
          </div>
        )}
      </div>
    </div>
  );
}
