import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
}

const db = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});

export default db;
