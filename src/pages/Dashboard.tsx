import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Activity,
  XCircle,
  Edit2,
  RefreshCw,
  Clock,
  Briefcase
} from 'lucide-react';

export default function Dashboard() {
  const [account, setAccount] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Trade Form State
  const [tradeForm, setTradeForm] = useState({
    symbol: 'XAUUSD',
    type: 'market',
    action: 'buy',
    volume: 0.1,
    price: '',
    sl: '',
    tp: ''
  });

  const [submittingTrade, setSubmittingTrade] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDashboardData(session);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchDashboardData(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchDashboardData = async (activeSession: any) => {
    if (!activeSession) return;
    setLoading(true);
    setError(null);
    try {
      const headers = {
        'Authorization': `Bearer ${activeSession.access_token}`
      };

      const [accRes, posRes, ordRes] = await Promise.all([
        fetch('/api/mt5/account', { headers }),
        fetch('/api/mt5/positions', { headers }),
        fetch('/api/mt5/orders/pending', { headers })
      ]);

      if (!accRes.ok) throw new Error('Failed to fetch account info. Is MT5 running?');
      if (!posRes.ok) throw new Error('Failed to fetch active positions');
      if (!ordRes.ok) throw new Error('Failed to fetch pending orders');

      const accData = await accRes.json();
      const posData = await posRes.json();
      const ordData = await ordRes.json();

      setAccount(accData.account);
      setPositions(posData.positions || []);
      setPendingOrders(ordData.orders || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred fetching MT5 data.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (ticket: number) => {
    if (!session) return;
    if (!confirm(`Are you sure you want to close position #${ticket}?`)) return;

    try {
      const res = await fetch('/api/mt5/trade/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ticket })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close position');

      alert(`Successfully closed position #${ticket}`);
      fetchDashboardData(session);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancelOrder = async (ticket: number) => {
    if (!session) return;
    if (!confirm(`Are you sure you want to cancel pending order #${ticket}?`)) return;

    try {
      const res = await fetch('/api/mt5/trade/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ticket })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');

      alert(`Successfully canceled order #${ticket}`);
      fetchDashboardData(session);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmittingTrade(true);
    setTradeMessage(null);

    try {
      let endpoint = '/api/mt5/trade';
      let payload: any = {
        symbol: tradeForm.symbol,
        volume: parseFloat(tradeForm.volume.toString())
      };

      if (tradeForm.sl) payload.sl = parseFloat(tradeForm.sl);
      if (tradeForm.tp) payload.tp = parseFloat(tradeForm.tp);

      if (tradeForm.type === 'market') {
        payload.action = tradeForm.action;
      } else {
        endpoint = '/api/mt5/trade/pending';
        payload.action = `${tradeForm.action}_${tradeForm.type}`; // e.g., buy_limit
        if (!tradeForm.price) throw new Error('Price is required for pending orders');
        payload.price = parseFloat(tradeForm.price);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trade execution failed');

      setTradeMessage({ type: 'success', text: `Trade placed successfully! Order #${data.order_id}` });
      fetchDashboardData(session); // Refresh data
    } catch (err: any) {
      setTradeMessage({ type: 'error', text: err.message });
    } finally {
      setSubmittingTrade(false);
    }
  };

  if (!session) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-400">Please sign in to view the Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Trade Terminal</h1>
          <p className="text-gray-400">Manage your MT5 account and execute trades.</p>
        </div>
        <button
          onClick={() => fetchDashboardData(session)}
          disabled={loading}
          className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-gray-300 flex items-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Account Overview Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Balance</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            ${account?.balance?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Equity</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            ${account?.equity?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Margin Level</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            {account?.margin_level ? `${account.margin_level.toFixed(2)}%` : '0.00%'}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-gray-400 font-medium">Free Margin</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            ${account?.margin_free?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Manual Trade Execution Panel */}
        <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            New Order
          </h2>

          <form onSubmit={handleTradeSubmit} className="space-y-4 flex-1">
            {tradeMessage && (
              <div className={`p-3 rounded-lg text-sm ${tradeMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {tradeMessage.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                value={tradeForm.symbol}
                onChange={(e) => setTradeForm({...tradeForm, symbol: e.target.value.toUpperCase()})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Order Type</label>
                <select
                  value={tradeForm.type}
                  onChange={(e) => setTradeForm({...tradeForm, type: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                  <option value="stop">Stop</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Action</label>
                <select
                  value={tradeForm.action}
                  onChange={(e) => setTradeForm({...tradeForm, action: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Volume (Lots)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={tradeForm.volume}
                onChange={(e) => setTradeForm({...tradeForm, volume: parseFloat(e.target.value)})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {tradeForm.type !== 'market' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Entry Price</label>
                <input
                  type="number"
                  step="0.00001"
                  value={tradeForm.price}
                  onChange={(e) => setTradeForm({...tradeForm, price: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="0.00001"
                  value={tradeForm.sl}
                  onChange={(e) => setTradeForm({...tradeForm, sl: e.target.value})}
                  placeholder="Optional"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Take Profit</label>
                <input
                  type="number"
                  step="0.00001"
                  value={tradeForm.tp}
                  onChange={(e) => setTradeForm({...tradeForm, tp: e.target.value})}
                  placeholder="Optional"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingTrade}
              className={`w-full py-3 rounded-lg font-bold text-white transition-colors mt-4 flex justify-center items-center gap-2 ${
                tradeForm.action === 'buy'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
              } ${submittingTrade ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submittingTrade ? 'Processing...' : `${tradeForm.action.toUpperCase()} ${tradeForm.type === 'market' ? 'BY MARKET' : tradeForm.type.toUpperCase()}`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Active Trades/Positions Manager */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-400" />
              Active Positions
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-700 text-sm text-gray-400">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Volume</th>
                    <th className="py-3 px-4">Open Price</th>
                    <th className="py-3 px-4">SL / TP</th>
                    <th className="py-3 px-4 text-right">Profit</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-500">
                        No active positions
                      </td>
                    </tr>
                  ) : (
                    positions.map((pos) => (
                      <tr key={pos.ticket} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors text-sm">
                        <td className="py-3 px-4 text-gray-300">#{pos.ticket}</td>
                        <td className="py-3 px-4 font-bold text-white">{pos.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${pos.type === 'buy' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                            {pos.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{pos.volume}</td>
                        <td className="py-3 px-4 text-gray-300">{pos.price_open}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {pos.sl > 0 ? pos.sl : '-'} / {pos.tp > 0 ? pos.tp : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${pos.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${pos.profit.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleClosePosition(pos.ticket)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Close Position"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Orders Table */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Pending Orders
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-700 text-sm text-gray-400">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Volume</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">SL / TP</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500">
                        No pending orders
                      </td>
                    </tr>
                  ) : (
                    pendingOrders.map((ord) => (
                      <tr key={ord.ticket} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors text-sm">
                        <td className="py-3 px-4 text-gray-300">#{ord.ticket}</td>
                        <td className="py-3 px-4 font-bold text-white">{ord.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${ord.type.includes('buy') ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                            {ord.type.toUpperCase().replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{ord.volume}</td>
                        <td className="py-3 px-4 text-gray-300">{ord.price_open}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {ord.sl > 0 ? ord.sl : '-'} / {ord.tp > 0 ? ord.tp : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleCancelOrder(ord.ticket)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Cancel Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
