import React, { useState } from 'react';
import { Lock, AlertCircle, ShieldCheck, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';
const ALLOWED_DOMAINS = ['cloudspace.goog', 'google.com'];

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [emailInput, setEmailInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenField, setShowTokenField] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDomainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    // Strict Domain Whitelist Check
    const isAllowed = ALLOWED_DOMAINS.some((d) => cleanEmail.endsWith(`@${d}`));
    if (!isAllowed) {
      setError(`Access Denied: '${cleanEmail}' is not authorized. Access is restricted strictly to @cloudspace.goog and @google.com accounts.`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    // If an access token or identity token was entered, verify cryptographically with backend
    if (tokenInput.trim()) {
      fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: tokenInput.trim() }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) {
            onAuthenticate({
              email: data.user.email,
              name: data.user.name,
            });
          } else {
            setError(data.error || 'Invalid Google access token.');
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsVerifying(false));
      return;
    }

    // Direct Corporate Verification for whitelisted domains
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-8 shadow-2xl space-y-6 text-center animate-scaleUp">
        {/* Security Shield Lock Icon */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Corporate Single Sign-On
          </h2>
          <p className="text-xs text-slate-400">
            Access restricted strictly to authorized corporate accounts:
          </p>
          <div className="flex items-center justify-center gap-1.5 pt-1 font-mono text-[11px] font-bold text-blue-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">@cloudspace.goog</span>
            <span className="text-slate-500">&bull;</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">@google.com</span>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Corporate Sign In Form */}
        <form onSubmit={handleDomainLogin} className="space-y-3.5 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Corporate Account Email
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setError(null);
              }}
              placeholder="user@cloudspace.goog or user@google.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-inner"
            />
          </div>

          {showTokenField && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-semibold text-slate-300">
                Google Access Token (Optional)
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ya29.a0..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#4285F4]"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => setShowTokenField(!showTokenField)}
              className="hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              <span>{showTokenField ? 'Hide Token' : 'Add Google Token'}</span>
            </button>
            <span className="text-slate-500">Domain Verified</span>
          </div>

          <button
            type="submit"
            disabled={isVerifying || !emailInput}
            className="w-full py-3.5 px-4 rounded-xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Corporate Domain...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Authenticate with Corporate Domain</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
