const fs = require('fs');
const path = 'src/components/chart/SupportResistanceTool.tsx';
let code = fs.readFileSync(path, 'utf-8');

// Lightweight charts v5 does not expose internal private variables like `_private__chartWidget`.
// So we will just use a global or pass the container in. Wait, `chartContainerStyle` was using it.
// Let's remove the hacky cursor code to avoid typescript and runtime errors.
code = code.replace(
`    if (isDrawing) {
      chart.subscribeClick(handleChartClick);
      // Optional: change cursor to crosshair
      chartContainerStyle(chart, 'crosshair');
    } else {
      chart.unsubscribeClick(handleChartClick);
      chartContainerStyle(chart, 'default');
    }

    return () => {
      chart.unsubscribeClick(handleChartClick);
      chartContainerStyle(chart, 'default');
    };
  }, [isDrawing, handleChartClick, chartRef]);

  // Helper to change cursor style
  const chartContainerStyle = (chart: IChartApi, cursor: string) => {
    // A bit hacky but works for lightweight-charts
    const container = (chart as any)._private__chartWidget?._private__containerElement;
    if (container) {
      container.style.cursor = cursor;
    }
  };`,
`    if (isDrawing) {
      chart.subscribeClick(handleChartClick);
    } else {
      chart.unsubscribeClick(handleChartClick);
    }

    return () => {
      chart.unsubscribeClick(handleChartClick);
    };
  }, [isDrawing, handleChartClick, chartRef]);`
);

// Actually, instead of trying to hack the container cursor, we can just do nothing for now, or use css class on parent.
// And adjust the positioning of the buttons because if both are absolute top-4 right-4, they overlap.
// I'll put SR tool right next to the RR tool by passing `right-[...px]`

code = code.replace(
  /className="absolute top-4 right-4 z-20 flex gap-2 mr-\[140px\]"/,
  `className="absolute top-4 right-[160px] z-20 flex gap-2"` // RR tool is around 140px wide
);

fs.writeFileSync(path, code);
