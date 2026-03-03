import { supabase } from './supabase';

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = '';

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      token = session.access_token;
    }
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  return fetch(url, { ...options, headers });
};
