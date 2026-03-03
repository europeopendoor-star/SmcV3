import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!supabase) {
    // If Supabase is not configured on the backend, we should fail secure
    return res.status(500).json({ error: 'Authentication service is not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Optionally add user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Unexpected auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
