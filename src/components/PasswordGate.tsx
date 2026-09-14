import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

interface PasswordGateProps {
  onAuthenticate: (user: { email: string; name: string; ldap?: string; picture?: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

export const PasswordGate: React.FC<PasswordGateProps> = ({ onAuthenticate }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the access password.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onAuthenticate({
          email: data.user.email,
          name: data.user.name,
          ldap: data.user.ldap,
        });
        return;
      }

      setError(data.error || 'Incorrect password. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Authentication error connecting to server.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 text-center animate-scaleUp">
        {/* Security Key Lock Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
          <KeyRound className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Magic Countdown Generator
          </h1>
          <p className="text-xs text-slate-400">
            Enter password to unlock the studio
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug text-[11px]">{error}</span>
          </div>
        )}

        {/* Pure Single-Field Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Access Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter password..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || !password.trim()}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all group cursor-pointer"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Unlocking Studio...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Unlock Studio</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Security Note Footer */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Magic Countdown Studio • Protected Access</span>
        </div>
      </div>
    </div>
  );
};
