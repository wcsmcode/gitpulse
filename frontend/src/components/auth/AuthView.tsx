import React, { useState, useEffect } from 'react';
import { Zap, Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const AuthView: React.FC = () => {
  const { login, register, fetchUserWorkspaces } = useAppStore();

  // Read URL query parameter mode ('register' or 'login') on initial render
  const initialMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mode')
    : null;

  const [tab, setTab] = useState<'login' | 'register'>(initialMode === 'register' ? 'register' : 'login');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'register') {
      setTab('register');
    } else if (mode === 'login') {
      setTab('login');
    }
  }, []);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (tab === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Full name is required.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), fullName.trim(), password);
      }

      // Clean up URL query parameters and load workspaces immediately
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }
      await fetchUserWorkspaces();
    } catch (err: any) {
      const respData = err.response?.data;
      if (respData) {
        if (respData.non_field_errors) {
          setErrorMessage(respData.non_field_errors.join(' '));
        } else if (respData.detail) {
          setErrorMessage(respData.detail);
        } else if (respData.email) {
          setErrorMessage(`Email: ${respData.email.join(' ')}`);
        } else if (respData.password) {
          setErrorMessage(`Password: ${respData.password.join(' ')}`);
        } else {
          setErrorMessage('Authentication failed. Please verify credentials.');
        }
      } else {
        setErrorMessage(err.message || 'Network error connecting to backend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Ambient background glows (Linear / Framer signature) */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-8 z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-3 border border-white/10">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-white">GitPulse</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              v1.0
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs">
            Micro-Bounty Issue Tracker for high-velocity engineering teams
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5 font-sans animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Linus Torvalds"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-white/5 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In to Workspace' : 'Create Developer Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Login Pills (Helpful for reviewers & testing) */}
        {tab === 'login' && (
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block mb-2 text-center">
              Quick Fill Demo Accounts
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo('owner_rbac@test.com', 'password123')}
                className="flex-1 p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition text-center font-mono"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => fillDemo('maintainer_rbac@test.com', 'password123')}
                className="flex-1 p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition text-center font-mono"
              >
                Maintainer
              </button>
              <button
                type="button"
                onClick={() => fillDemo('dev_rbac@test.com', 'password123')}
                className="flex-1 p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition text-center font-mono"
              >
                Developer
              </button>
            </div>
          </div>
        )}

        {/* Footer info: Classic Django Auth link */}
        <div className="mt-6 text-center">
          <a
            href="http://127.0.0.1:8000/accounts/login/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-zinc-400 hover:text-indigo-400 font-mono transition"
          >
            Classic Django Server Template Auth ↗
          </a>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
