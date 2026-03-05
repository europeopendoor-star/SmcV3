const fs = require('fs');
const file = 'src/pages/ChartView.tsx';
let code = fs.readFileSync(file, 'utf8');

// We need to rewrite the useEffect in ChartView.tsx to fetch directly from Supabase candles table instead of twelveDataSymbol/fetchHistoricalData

const newUseEffect = `
  useEffect(() => {
    if (!supabase) return;

    // Fetch HTF candles directly from Supabase DB
    supabase.from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', htfTimeframe)
      .order('time', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
           console.error("Error fetching HTF from DB:", error);
           setHtfData([]);
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
            volume: d.volume || 0,
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
      });

    // Fetch LTF candles directly from Supabase DB
    supabase.from('candles')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', ltfTimeframe)
      .order('time', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
           console.error("Error fetching LTF from DB:", error);
           setLtfData([]);
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
            volume: d.volume || 0,
            markers
          };
        });
        setLtfData(formattedData);
      });

  }, [pair, htfTimeframe, ltfTimeframe]);
`;

// Replace everything inside the useEffect definition
const regex = /useEffect\(\(\) => \{[\s\S]*?\}, \[pair, htfTimeframe, ltfTimeframe\]\);/m;
code = code.replace(regex, newUseEffect.trim());

// Remove import of fetchHistoricalData if it exists
code = code.replace(/import { fetchHistoricalData } from '\.\.\/lib\/marketApi';\n/, '');

fs.writeFileSync(file, code);
