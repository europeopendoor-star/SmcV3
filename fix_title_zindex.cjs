const fs = require('fs');
const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

// The title (SMC Context, Sniper Entry) isn't showing up because it's behind the chart z-index
// Let's make sure the legend div has a high z-index and is positioned correctly.
code = code.replace(
  /<div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1">/,
  `<div className="absolute top-4 left-4 z-30 pointer-events-none flex flex-col gap-1">`
);

fs.writeFileSync(path, code);
