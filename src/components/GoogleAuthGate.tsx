import React, { useState } from 'react';
import { Lock, AlertCircle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

const ALLOWED_DOMAINS = ['cloudspace.goog', 'google.com'];

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    // Strict Domain Whitelist Validation
    const isAllowed = ALLOWED_DOMAINS.some((d) => cleanEmail.endsWith(`@${d}`));
    if (!isAllowed) {
      setError(`Access Denied: '${cleanEmail}' is not an authorized corporate account. Access is restricted strictly to @cloudspace.goog and @google.com accounts. Personal accounts (@gmail.com) are disallowed.`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-scaleUp">
        {/* Security Shield Lock Icon */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">
            Corporate Single Sign-On
          </h2>
          <p className="text-xs text-slate-400">
            Access restricted strictly to authorized corporate accounts:
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 font-mono text-[11px] font-bold text-blue-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">@cloudspace.goog</span>
            <span className="text-slate-500">&bull;</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">@google.com</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug text-[11px]">{error}</span>
          </div>
        )}

        {/* Corporate Sign In Form */}
        <form onSubmit={handleDomainSubmit} className="space-y-4 text-left">
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
                <span>Sign In with Corporate Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
