import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symbol, interval, outputsize = 500, type = 'time_series' } = await req.json();

    const apiKey = Deno.env.get('TWELVEDATA_API_KEY');
    if (!apiKey) {
      throw new Error('TWELVEDATA_API_KEY is not configured');
    }

    if (!symbol || !interval) {
      throw new Error('Symbol and interval are required');
    }

    let url = '';

    if (type === 'time_series') {
        url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}&format=JSON`;
    } else if (type === 'price') {
        url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}&format=JSON`;
    } else {
        throw new Error('Invalid type parameter');
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'error') {
        throw new Error(`Twelve Data API Error: ${data.message}`);
    }

    // Format the data for lightweight-charts if it's time_series
    let formattedData = data;
    if (type === 'time_series' && data.values) {
        // Twelve Data returns newest first. Lightweight charts needs oldest first.
        formattedData = data.values.map((v: any) => ({
            time: Math.floor(new Date(v.datetime).getTime() / 1000), // Convert to UNIX timestamp
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
            volume: parseFloat(v.volume) || 0
        })).reverse();
    }

    return new Response(JSON.stringify(formattedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
