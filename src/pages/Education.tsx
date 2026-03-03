import { BookOpen, Shield, Target, Zap } from 'lucide-react';

export default function Education() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          SMC + Sniper Strategy
        </h1>
        <p className="text-xl text-gray-400">
          Learn the institutional concepts behind our trading signals.
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
              <Shield className="w-6 h-6 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Smart Money Concepts (SMC)</h2>
          </div>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              SMC is based on the idea that institutional players (banks, hedge funds) leave footprints in the market. We track these footprints to determine the Higher Timeframe (HTF) bias.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-400">
              <li><strong className="text-white">BOS (Break of Structure):</strong> Continuation of the current trend.</li>
              <li><strong className="text-white">CHoCH (Change of Character):</strong> The first sign of a trend reversal.</li>
              <li><strong className="text-white">Order Blocks (OB):</strong> The last opposite candle before a strong displacement. This is where institutions placed their orders.</li>
              <li><strong className="text-white">Fair Value Gaps (FVG):</strong> Imbalances created by rapid price movement, leaving a gap between the wicks of the surrounding candles.</li>
            </ul>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
              <Target className="w-6 h-6 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Sniper Execution Model</h2>
          </div>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              While SMC gives us the <em>where</em> (HTF Zone) and the <em>why</em> (Bias), the Sniper model gives us the <em>when</em> (LTF Trigger). We never enter blindly at a HTF zone.
            </p>
            <div className="bg-black/50 p-6 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-lg font-bold text-white">The 4-Step Sniper Entry:</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-400">
                <li><strong className="text-white">HTF Context:</strong> Price must be inside a confirmed H1/H4 Order Block or FVG.</li>
                <li><strong className="text-white">Liquidity Sweep:</strong> On the M1/M5 timeframe, price must sweep a recent high/low (inducing retail traders).</li>
                <li><strong className="text-white">Displacement & CHoCH:</strong> A strong move in the opposite direction that breaks internal structure, leaving a micro FVG or OB.</li>
                <li><strong className="text-white">Limit Entry:</strong> We place a limit order at the micro FVG/OB. Stop loss goes just beyond the swept liquidity extreme.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Risk Management</h2>
          </div>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              The power of the Sniper model is the Risk-to-Reward (R:R) ratio. Because our stop loss is placed on the M1/M5 timeframe, it is extremely tight (often 5-10 pips).
            </p>
            <p>
              Targeting HTF liquidity (H1/H4 highs or lows) allows for trades with 1:5, 1:10, or even 1:20 R:R. This means you can have a 30% win rate and still be highly profitable.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
