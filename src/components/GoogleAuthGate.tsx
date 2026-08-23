import React from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = () => {
  const handleSignIn = () => {
    // Navigate directly to server-side Google OAuth 2.0 Authorization Code flow
    window.location.href = `${API_BASE}/api/auth/google/login`;
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-scaleUp">
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

        {/* Security Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed text-left flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Cryptographic identity verification via Google Accounts. Personal accounts (@gmail.com) are strictly blocked.
          </span>
        </div>

        {/* Single Primary Google SSO Button */}
        <button
          type="button"
          onClick={handleSignIn}
          className="w-full py-3.5 px-5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 text-white font-bold text-xs shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all group"
        >
          <div className="flex items-center gap-1 bg-white p-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC04]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          </div>
          <span>Sign In with Google SSO</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
