const fs = require('fs');

const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

// Fix the watermark option
code = code.replace(
  /watermark: \{\s*color: 'rgba\(255, 255, 255, 0\.05\)',\s*visible: true,\s*text: title,\s*fontSize: 48,\s*horzAlign: 'center',\s*vertAlign: 'center',\s*\},/,
  `layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d5db',
        attributionLogo: false,
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

// We made a mistake above by just putting 'watermark' inside 'createChart', it needs to be inside 'watermark: {...}'

code = code.replace(
      `layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d5db',
      },
      watermark: {
        color: 'rgba(255, 255, 255, 0.05)',
        visible: true,
        text: title,
        fontSize: 48,
        horzAlign: 'center',
        vertAlign: 'center',
      },
      grid: {`,
      `layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d5db',
        attributionLogo: false,
      },
      watermark: {
        color: 'rgba(255, 255, 255, 0.05)',
        visible: true,
        text: title,
        fontSize: 48,
        horzAlign: 'center',
        vertAlign: 'center',
      },
      grid: {`
)

fs.writeFileSync(path, code);
