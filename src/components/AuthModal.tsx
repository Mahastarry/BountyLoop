import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import { X, Lock, Mail, User, Shield, Briefcase } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialIsLogin?: boolean;
}

export default function AuthModal({ onClose, onSuccess, initialIsLogin }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialIsLogin !== undefined ? initialIsLogin : true);
  const [role, setRole] = useState<'COMPANY' | 'BUILDER'>('BUILDER');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        onSuccess(res.user);
      } else {
        const payload = {
          name,
          email,
          password,
          role
        };

        const res = await api.register(payload);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl animate-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {isLogin ? 'Sign in to BountyLoop' : 'Create your credentials'}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {isLogin ? 'Welcome back to the decentralized developer marketplace.' : 'Join BountyLoop to post tasks or claim code bounties.'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Auth Mode Tabs */}
        {!isLogin && (
          <div className="mb-5 flex rounded-lg border border-neutral-100 bg-neutral-50/50 p-1">
            <button
              type="button"
              onClick={() => setRole('BUILDER')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                role === 'BUILDER' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              I am a Developer
            </button>
            <button
              type="button"
              onClick={() => setRole('COMPANY')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                role === 'COMPANY' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              I am a Creator
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Name Field (Sign Up Only) */}
          {!isLogin && (
            <div>
              <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Satoshi Nakamoto"
                  className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. satoshi@bitcoin.org"
                className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Security Key / Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-lg bg-black py-3 px-4 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In with Email' : 'Create Account'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-5 border-t border-neutral-100 pt-4 text-center text-xs">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
