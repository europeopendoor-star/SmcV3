const fs = require('fs');
const path = 'src/components/chart/RiskRewardTool.tsx';
let code = fs.readFileSync(path, 'utf-8');

// I am going to keep the boxes but ALSO add `PriceLine`s to the chart series so they show up on the price axis.
// First let's check what lightweight-charts imports we need.
if (!code.includes('IPriceLine')) {
  code = code.replace(/import \{ (.*) \} from 'lightweight-charts';/, `import { $1, IPriceLine } from 'lightweight-charts';`);
}

// Now we need a ref to keep track of the price lines we added so we can clean them up or update them.
// Let's rewrite the logic inside the updateBoxes or handleChartClick to also create PriceLines.

const newImportsAndState = `
  const [targetRR, setTargetRR] = useState<number>(3); // Selectable RR ratio
  const priceLinesRef = useRef<IPriceLine[]>([]);

  // Function to clear all price lines
  const clearPriceLines = useCallback(() => {
     if (seriesRef.current) {
         priceLinesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
         priceLinesRef.current = [];
     }
  }, [seriesRef]);

  // Sync Price Lines whenever boxes change
  useEffect(() => {
     clearPriceLines();
     if (!seriesRef.current) return;

     boxes.forEach(box => {
         const entryLine = seriesRef.current!.createPriceLine({
            price: box.entryPrice,
            color: '#a3a3a3',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Entry',
         });
         const slLine = seriesRef.current!.createPriceLine({
            price: box.slPrice,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'SL',
         });
         const tpLine = seriesRef.current!.createPriceLine({
            price: box.tpPrice,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'TP',
         });
         priceLinesRef.current.push(entryLine, slLine, tpLine);
     });

     // also handle temp drawing lines
     if (drawingState === 'setting_sl' && tempEntry && tempSl) {
        // temp Sl is just current crosshair essentially
         const entryLine = seriesRef.current!.createPriceLine({
            price: tempEntry.price,
            color: '#a3a3a3',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'Entry',
         });
         const currentLine = seriesRef.current!.createPriceLine({
            price: tempSl.price,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'SL',
         });

         const direction = tempSl.price < tempEntry.price ? 'long' : 'short';
         const risk = Math.abs(tempEntry.price - tempSl.price);
         const tpPrice = direction === 'long'
             ? tempEntry.price + (risk * targetRR)
             : tempEntry.price - (risk * targetRR);

         const tpLine = seriesRef.current!.createPriceLine({
            price: tpPrice,
            color: '#22c55e',
            lineWidth: 1,
            lineStyle: 3,
            axisLabelVisible: true,
            title: 'TP',
         });
         priceLinesRef.current.push(entryLine, currentLine, tpLine);
     }
  }, [boxes, drawingState, tempEntry, tempSl, targetRR, clearPriceLines, seriesRef]);

  // Clean up on unmount
  useEffect(() => {
      return () => clearPriceLines();
  }, [clearPriceLines]);
`;

code = code.replace(/const \[targetRR, setTargetRR\] = useState<number>\(3\); \/\/ Selectable RR ratio/, newImportsAndState);
// Also add useRef import
if (!code.includes('useRef')) {
    code = code.replace(/import React, \{ /, 'import React, { useRef, ');
}

fs.writeFileSync(path, code);
