import React, { useState } from 'react';
import { Bell, Mail, Send } from 'lucide-react';

export default function Alerts() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Real-Time Alerts
        </h1>
        <p className="text-xl text-gray-400">
          Never miss a sniper entry. Get instant notifications when setups form.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Telegram Alerts */}
        <div className="bg-[#0088cc]/10 border border-[#0088cc]/30 rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-[#0088cc] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#0088cc]/20">
            <Send className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Telegram Bot</h2>
            <p className="text-gray-400">
              Get instant push notifications directly to your phone for every SMC and Sniper signal.
            </p>
          </div>
          <a
            href="https://t.me/your_bot_link"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Connect Telegram
          </a>
        </div>

        {/* Email Alerts */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Digest</h2>
            <p className="text-gray-400">
              Receive daily summaries of closed trades, performance stats, and upcoming HTF zones.
            </p>
          </div>
          
          {subscribed ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-lg flex items-center justify-center gap-2">
              <Bell className="w-5 h-5" />
              Subscribed Successfully!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-white/10 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
              />
              <button
                type="submit"
                className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Subscribe to Email
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="bg-black/50 border border-white/5 rounded-2xl p-8 text-center">
        <h3 className="text-lg font-bold text-white mb-2">How Alerts Work</h3>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Our backend continuously monitors the markets. When a HTF zone is reached and a LTF liquidity sweep occurs, the Sniper Engine generates a signal. Alerts are dispatched within milliseconds via webhooks to ensure you get the best possible entry price.
        </p>
      </div>
    </div>
  );
}
