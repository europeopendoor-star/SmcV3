const fs = require('fs');

const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

// Update Legend UI
code = code.replace(
  /<div className="absolute top-4 left-4 z-10 text-white\/50 font-bold pointer-events-none text-2xl">\s*\{title\}\s*<\/div>/,
  `{/* Move Legend here */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1">
        <div className="text-white/30 font-bold text-2xl tracking-widest">{title}</div>
        {tooltipData && (
          <div className="flex gap-4 text-xs font-mono text-gray-300 bg-black/50 p-1.5 rounded backdrop-blur-sm border border-white/5">
             <div className="flex gap-1"><span className="text-gray-500">O</span><span className={Number(tooltipData.close) >= Number(tooltipData.open) ? 'text-green-400' : 'text-red-400'}>{tooltipData.open}</span></div>
             <div className="flex gap-1"><span className="text-gray-500">H</span><span className={Number(tooltipData.close) >= Number(tooltipData.open) ? 'text-green-400' : 'text-red-400'}>{tooltipData.high}</span></div>
             <div className="flex gap-1"><span className="text-gray-500">L</span><span className={Number(tooltipData.close) >= Number(tooltipData.open) ? 'text-green-400' : 'text-red-400'}>{tooltipData.low}</span></div>
             <div className="flex gap-1"><span className="text-gray-500">C</span><span className={Number(tooltipData.close) >= Number(tooltipData.open) ? 'text-green-400' : 'text-red-400'}>{tooltipData.close}</span></div>
          </div>
        )}
      </div>`
);

// Update Watermark
code = code.replace(
  /textColor: '#d1d5db',\n      },/,
  `textColor: '#d1d5db',
      },
      watermark: {
        color: 'rgba(255, 255, 255, 0.05)',
        visible: true,
        text: title,
        fontSize: 48,
        horzAlign: 'center',
        vertAlign: 'center',
      },`
);

// Update volume color
code = code.replace(
  /color: d\.close >= d\.open \? 'rgba\(34, 197, 94, 0\.4\)' : 'rgba\(239, 68, 68, 0\.4\)'/g,
  `color: d.close >= d.open ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'`
);

// Update volume scaleMargins
code = code.replace(
  /top: 0\.8, \/\/ leave top 80% for candlestick/,
  `top: 0.85, // leave top 85% for candlestick`
);

// Remove old tooltip bottom block
const oldTooltipRegex = /\{tooltipData && \(\s*<div\s*ref=\{tooltipRef\}[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\);\s*\};/;
code = code.replace(oldTooltipRegex, `    </div>\n  );\n};`);

// Add lucide-react import
if (!code.includes('import { Maximize } from \'lucide-react\';')) {
  code = `import { Maximize } from 'lucide-react';\n` + code;
}

// Add Auto Fit button
code = code.replace(
  /<RiskRewardTool chartRef=\{chartRef\} seriesRef=\{seriesRef\} \/>\s*\)\}/,
  `<RiskRewardTool chartRef={chartRef} seriesRef={seriesRef} />
       )}

       <div className="absolute bottom-4 right-4 z-20">
         <button
           onClick={() => {
             if (chartRef.current) {
               chartRef.current.timeScale().fitContent();
               chartRef.current.priceScale('right').applyOptions({ autoScale: true });
             }
           }}
           className="p-2 rounded-lg bg-black/50 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10 transition-colors"
           title="Auto Fit Data"
         >
           <Maximize className="w-5 h-5" />
         </button>
       </div>`
);

fs.writeFileSync(path, code);
