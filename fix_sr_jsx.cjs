const fs = require('fs');
const path = 'src/components/chart/TradingChart.tsx';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
`       {chartRef.current && seriesRef.current && (
           <SupportResistanceTool chartRef={chartRef} seriesRef={seriesRef} />
           <RiskRewardTool chartRef={chartRef} seriesRef={seriesRef} />
       )}`,
`       {chartRef.current && seriesRef.current && (
           <>
             <SupportResistanceTool chartRef={chartRef} seriesRef={seriesRef} />
             <RiskRewardTool chartRef={chartRef} seriesRef={seriesRef} />
           </>
       )}`
);

fs.writeFileSync(path, code);
