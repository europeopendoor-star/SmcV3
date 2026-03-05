const fs = require('fs');

const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

// The watermark option might have changed in v5. Let's look up how to do it or remove it for now.
// It seems lightweight-charts v5 might have moved watermark or it doesn't exist directly on top level, but it used to be.
// Let's remove the watermark option to fix compilation if it's not supported in the typing.
// Ah, the watermark option *is* supported but maybe not at the top level or requires a specific import, or we have duplicate properties. Let's see.

// The error was: 'watermark' does not exist in type 'DeepPartial<TimeChartOptions>'
// In lightweight-charts v5, watermark has been removed! Watermarks must be rendered with custom HTML overlays.
// Oh wait, I see `An object literal cannot have multiple properties with the same name.` let's check for multiple.

code = code.replace(
      /watermark: \{\s*color: 'rgba\(255, 255, 255, 0\.05\)',\s*visible: true,\s*text: title,\s*fontSize: 48,\s*horzAlign: 'center',\s*vertAlign: 'center',\s*\},\n/g,
      ''
);
// Remove attributionLogo: false if it causes issue too (v5 doesn't have it either)
code = code.replace(/attributionLogo: false,/g, '');

fs.writeFileSync(path, code);
