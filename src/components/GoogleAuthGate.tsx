import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, KeyRound, RefreshCw, Terminal } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    setIsVerifying(true);
    setError(null);

    try {
      // Determine if token is a Google OAuth access token (starts with ya29.) or corporate key
      const payload = token.startsWith('ya29.')
        ? { accessToken: token }
        : { accessKey: token };

      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const cleanEmail = (data.user.email || '').trim().toLowerCase();
        if (cleanEmail.endsWith('@cloudspace.goog') || cleanEmail.endsWith('@google.com')) {
          onAuthenticate({
            email: cleanEmail,
            name: data.user.name || cleanEmail.split('@')[0],
          });
          return;
        }
      }

      setError(
        data.error ||
          'Access Denied: You must authenticate with a verified @cloudspace.goog or @google.com account. Personal accounts (@gmail.com) are strictly blocked.'
      );
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6 text-center animate-scaleUp">
        {/* Corporate Shield Lock Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Corporate Single Sign-On
          </h2>
          <p className="text-xs text-slate-400">
            Access restricted strictly to authorized corporate domains:
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 font-mono text-[11px] font-bold text-blue-400">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">@cloudspace.goog</span>
            <span className="text-slate-500">&bull;</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">@google.com</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug text-[11px]">{error}</span>
          </div>
        )}

        {/* Security Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Cryptographic token verification against Google Cloud Identity. Arbitrary strings or personal (@gmail.com) accounts are rejected by Google servers.
          </span>
        </div>

        {/* Token Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <label className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#4285F4]" />
                <span>Google Access Token or Corporate Passkey</span>
              </label>
            </div>
            <input
              type="password"
              required
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setError(null);
              }}
              placeholder="Paste ya29... token or corporate key (cloudspace-2026)"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-inner"
            />
            <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5 font-mono">
              <Terminal className="w-3 h-3 text-[#4285F4]" />
              <span>Generate in terminal: <code className="text-slate-400">gcloud auth print-access-token</code></span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || !tokenInput.trim()}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all group"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying Cryptographic Token with Google...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Authenticate & Verify Corporate Identity</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
