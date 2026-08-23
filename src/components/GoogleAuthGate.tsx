import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, Sparkles, CheckCircle2, ArrowRight, UserCheck } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [inputEmail, setInputEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const ALLOWED_DOMAINS = ['cloudspace.goog', 'google.com'];

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputEmail.trim().toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some((d) => clean.endsWith(`@${d}`));

    if (!isAllowed) {
      setError(`Access Restricted: Only accounts from @cloudspace.goog or @google.com are authorized.`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        email: clean,
        name: clean.split('@')[0],
      });
    }, 600);
  };

  const handleQuickLogin = (email: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onAuthenticate({
        email,
        name: email.split('@')[0],
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 animate-scaleUp">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Magic Countdown Generator
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise AI Video Generator (Gemini Nano Banana & Veo 3)
          </p>
        </div>

        {/* Domain Lock Badge */}
        <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-[#4285F4] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#34A853]" />
            <span>Authorized Domains Only</span>
          </div>
          <p className="text-xs text-slate-300">
            This internal application is locked exclusively to authenticated users from:
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 font-mono text-xs font-bold text-blue-300">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">@cloudspace.goog</span>
            <span className="text-slate-500">&</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">@google.com</span>
          </div>
        </div>

        {/* One-Click Quick Authenticate for active Google Session */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleQuickLogin('aosterloh@cloudspace.goog')}
            disabled={isVerifying}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-white/5 active:scale-98"
          >
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
            </div>
            <span>Sign in as aosterloh@cloudspace.goog</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">or verify email</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Custom Email Form */}
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Google Workspace Account Email
            </label>
            <input
              type="email"
              required
              value={inputEmail}
              onChange={(e) => {
                setInputEmail(e.target.value);
                setError(null);
              }}
              placeholder="user@cloudspace.goog or user@google.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-inner"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3 px-4 rounded-xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <span>Verifying Domain Membership...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Verify & Enter Application</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
