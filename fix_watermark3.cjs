const fs = require('fs');
const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

// I will make the watermark using an absolute div underneath the chart instead of the native option which is removed in v5.
// We already have a good title in the top left, but a big watermark in the center looks great.
code = code.replace(
  /<div ref=\{chartContainerRef\} className="w-full flex-grow h-0 relative">/,
  `<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <span className="text-white/5 font-bold text-7xl select-none">{title}</span>
      </div>
      <div ref={chartContainerRef} className="w-full flex-grow h-0 relative z-10">`
);

fs.writeFileSync(path, code);
