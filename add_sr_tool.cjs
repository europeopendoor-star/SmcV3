const fs = require('fs');
const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

if (!code.includes('SupportResistanceTool')) {
  code = code.replace(/import \{ RiskRewardTool \} from '.\/RiskRewardTool';/, `import { RiskRewardTool } from './RiskRewardTool';\nimport { SupportResistanceTool } from './SupportResistanceTool';`);

  code = code.replace(
    /<RiskRewardTool chartRef=\{chartRef\} seriesRef=\{seriesRef\} \/>/,
    `<SupportResistanceTool chartRef={chartRef} seriesRef={seriesRef} />\n           <RiskRewardTool chartRef={chartRef} seriesRef={seriesRef} />`
  );

  fs.writeFileSync(path, code);
}
