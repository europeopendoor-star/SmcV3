/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase only if config is provided
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const signUpWithEmail = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signals`
      }
    });
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error("Error signing up with email", error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { data };
  } catch (error) {
    console.error("Error signing in with email", error);
    throw error;
  }
};

export const logout = async () => {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
