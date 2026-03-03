import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Activity, Mail, Lock } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../lib/supabase';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { data } = await signUpWithEmail(email, password);
        if (data?.user) {
          setMessage('Successfully signed up! You are now logged in.');
          onLogin(data.user);
          setTimeout(() => navigate('/signals'), 1000);
        } else {
          setMessage('Check your email for the confirmation link.');
        }
      } else {
        const { data } = await signInWithEmail(email, password);
        if (data?.user) {
          onLogin(data.user);
          navigate('/signals');
        }
      }
    } catch (err: any) {
      setError(err.message || (isSignUp ? 'Failed to sign up' : 'Failed to sign in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-black border border-white/10 p-8 rounded-2xl w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50 mx-auto mb-6">
            <Activity className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">VIP Access</h2>
          <p className="text-gray-400">
            {isSignUp ? 'Create an account to view live signals.' : 'Sign in to view live signals and charts.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 mt-6"
          >
            {loading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="text-yellow-500 hover:text-yellow-400 text-sm font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>

        <div className="pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" /> Secure authentication via Supabase
          </p>
        </div>
      </div>
    </div>
  );
}
