import { supabase } from './supabase';

export const fetchHistoricalData = async (symbol: string, interval: string, outputsize: number = 500) => {
    if (!supabase) throw new Error('Supabase is not configured');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twelve-data-proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
            symbol,
            interval,
            outputsize,
            type: 'time_series'
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch historical data');
    }

    return await response.json();
};

export const fetchLatestPrice = async (symbol: string) => {
    if (!supabase) throw new Error('Supabase is not configured');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twelve-data-proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
            symbol,
            type: 'price'
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch latest price');
    }

    return await response.json();
};
