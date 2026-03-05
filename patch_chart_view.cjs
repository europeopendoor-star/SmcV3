const fs = require('fs');
let content = fs.readFileSync('src/pages/ChartView.tsx', 'utf8');

// replace imports
content = content.replace(
  "import { MultiChartLayout } from '../components/chart/MultiChartLayout';",
  "import { MultiChartLayout } from '../components/chart/MultiChartLayout';\nimport { fetchHistoricalData } from '../lib/marketApi';"
);

// We need to map our pair to twelve data symbol
// XAUUSD -> XAU/USD
const mapToTwelveDataSymbol = (pair) => {
    return pair.slice(0, 3) + '/' + pair.slice(3);
};

// We need to map our timeframe to twelve data interval
const mapToTwelveDataInterval = (tf) => {
    switch (tf) {
        case 'M1': return '1min';
        case 'M5': return '5min';
        case 'H1': return '1h';
        case 'H4': return '4h';
        default: return '1h';
    }
}

const replacement = `
  useEffect(() => {
    if (!supabase) return;

    const twelveDataSymbol = pair.slice(0, 3) + '/' + pair.slice(3);
    const htfInterval = htfTimeframe === 'H1' ? '1h' : '4h';
    const ltfInterval = ltfTimeframe === 'M1' ? '1min' : '5min';

    // Fetch HTF candles from Twelve Data proxy
    fetchHistoricalData(twelveDataSymbol, htfInterval)
      .then((data) => {
        if (!data || data.length === 0) {
           setHtfData([]);
           return;
        }

        // Ensure data is array
        const dataArr = Array.isArray(data) ? data : [];

        const formattedData = dataArr.map((d: any, index: number) => {
           let markers = [];
           // Mock BOS/CHoCH markers
           if (index % 50 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'aboveBar', color: '#eab308', shape: 'arrowDown', text: 'BOS' });
           } else if (index % 80 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'belowBar', color: '#ec4899', shape: 'arrowUp', text: 'CHoCH' });
           }

           return {
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || Math.random() * 1000,
            markers
          };
        });
        setHtfData(formattedData);

        // Fetch Real Zones from Backend (we still use local DB for structure)
        supabase.from('zones')
          .select('*')
          .eq('pair', pair)
          .eq('timeframe', htfTimeframe)
          .order('time', { ascending: false })
          .limit(100)
          .then(({ data: zones, error }) => {
             if (error) {
                 console.error(error);
                 return;
             }
             if (zones && formattedData.length > 0) {
                const time1 = formattedData[Math.max(0, formattedData.length - 50)]?.time;
                const time2 = formattedData[formattedData.length - 1]?.time;

                if (time1 && time2) {
                    const mappedZones = zones.map((zone: any) => ({
                        time1: time1,
                        time2: time2,
                        price1: zone.top,
                        price2: zone.bottom,
                        color: zone.type === 'OB' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'
                    }));
                    setHtfZones(mappedZones);
                }
             }
          });
      })
      .catch((err) => {
          console.error("Error fetching HTF from Twelve Data:", err);
      });

    // Fetch LTF candles from Twelve Data
    fetchHistoricalData(twelveDataSymbol, ltfInterval)
      .then((data) => {
        if (!data || data.length === 0) {
           setLtfData([]);
           return;
        }

        const dataArr = Array.isArray(data) ? data : [];
        const formattedData = dataArr.map((d: any, index: number) => {
           let markers = [];

           if (index % 60 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'belowBar', color: '#3b82f6', shape: 'circle', text: 'Liquidity Sweep' });
           }

           // Mock Trade Execution Sequence
           if (index === dataArr.length - 30) {
               markers.push({ time: d.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'ENTRY' });
           }
           if (index === dataArr.length - 25) {
               markers.push({ time: d.time, position: 'belowBar', color: '#ef4444', shape: 'circle', text: 'SL Hit' });
           }
           if (index === dataArr.length - 15) {
               markers.push({ time: d.time, position: 'aboveBar', color: '#22c55e', shape: 'arrowDown', text: 'ENTRY (Short)' });
           }
           if (index === dataArr.length - 5) {
               markers.push({ time: d.time, position: 'belowBar', color: '#22c55e', shape: 'square', text: 'TP Hit (WIN)' });
           }

           return {
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || Math.random() * 500,
            markers
          };
        });
        setLtfData(formattedData);
      })
      .catch(err => {
          console.error("Error fetching LTF from Twelve Data:", err);
      });

  }, [pair, htfTimeframe, ltfTimeframe]);`;

const oldEffect = `  useEffect(() => {
    // Fetch HTF candles
    if (!supabase) return;
    supabase.from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', htfTimeframe)
      .order('time', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
           console.error(error);
           return;
        }
        if (!data || data.length === 0) {
           setHtfData([]);
           return;
        }
        const formattedData = data.map((d: any, index: number) => {
           let markers = [];
           // Mock BOS/CHoCH markers
           if (index % 50 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'aboveBar', color: '#eab308', shape: 'arrowDown', text: 'BOS' });
           } else if (index % 80 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'belowBar', color: '#ec4899', shape: 'arrowUp', text: 'CHoCH' });
           }

           return {
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || Math.random() * 1000,
            markers
          };
        });
        setHtfData(formattedData);

        // Fetch Real Zones from Backend
        supabase.from('zones')
          .select('*')
          .eq('pair', pair)
          .eq('timeframe', htfTimeframe)
          .order('time', { ascending: false })
          .limit(100)
          .then(({ data: zones, error }) => {
             if (error) {
                 console.error(error);
                 return;
             }
             if (zones && formattedData.length > 0) {
                // Since the backend currently only returns top/bottom prices for unmitigated zones,
                // we will render them as rectangles extending from 50 candles ago to the latest candle.
                // In the future, the backend should be updated to return creation_time for the start of the box.
                const time1 = formattedData[Math.max(0, formattedData.length - 50)].time;
                const time2 = formattedData[formattedData.length - 1].time;

                const mappedZones = zones.map((zone: any) => ({
                    time1: time1,
                    time2: time2,
                    price1: zone.top,
                    price2: zone.bottom,
                    color: zone.type === 'OB' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'
                }));
                setHtfZones(mappedZones);
             }
          });
      });

    // Fetch LTF candles
    supabase.from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', ltfTimeframe)
      .order('time', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
           console.error(error);
           return;
        }
        if (!data || data.length === 0) {
           setLtfData([]);
           return;
        }
        const formattedData = data.map((d: any, index: number) => {
           let markers = [];

           if (index % 60 === 0 && index > 0) {
              markers.push({ time: d.time, position: 'belowBar', color: '#3b82f6', shape: 'circle', text: 'Liquidity Sweep' });
           }

           // Mock Trade Execution Sequence
           if (index === data.length - 30) {
               markers.push({ time: d.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'ENTRY' });
           }
           if (index === data.length - 25) {
               markers.push({ time: d.time, position: 'belowBar', color: '#ef4444', shape: 'circle', text: 'SL Hit' });
           }
           if (index === data.length - 15) {
               markers.push({ time: d.time, position: 'aboveBar', color: '#22c55e', shape: 'arrowDown', text: 'ENTRY (Short)' });
           }
           if (index === data.length - 5) {
               markers.push({ time: d.time, position: 'belowBar', color: '#22c55e', shape: 'square', text: 'TP Hit (WIN)' });
           }

           return {
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume || Math.random() * 500,
            markers
          };
        });
        setLtfData(formattedData);
      });
  }, [pair, htfTimeframe, ltfTimeframe]);`;

content = content.replace(oldEffect, replacement);
fs.writeFileSync('src/pages/ChartView.tsx', content);
