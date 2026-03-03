import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Activity } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, supabase } from '../lib/supabase';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (isSignUp) {
        const { data } = await signUpWithEmail(email, password);
        if (data?.user?.identities?.length === 0) {
          setError('This email is already registered. Please sign in instead.');
        } else {
          setMessage('Successfully signed up! Check your email for verification link if required, or sign in.');
          // Optionally switch to sign in mode after successful sign up
          // setIsSignUp(false);
        }
      } else {
        const { data } = await signInWithEmail(email, password);
        if (data?.user) {
          onLogin(data.user);
          navigate('/signals');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 mt-6"
          >
            {loading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
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
