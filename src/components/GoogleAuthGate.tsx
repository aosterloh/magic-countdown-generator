import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, KeyRound, User } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string; ldap?: string; picture?: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [authMode, setAuthMode] = useState<'google' | 'password'>('google');
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  });
  const [password, setPassword] = useState('');
  const [ldapInput, setLdapInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Auth Config from Server on Mount
  useEffect(() => {
    let isMounted = true;
    async function fetchConfig() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/config`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.googleClientId && !googleClientId) {
            setGoogleClientId(data.googleClientId);
          }
        }
      } catch {
        // Silently continue with fallback
      }
    }
    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Google Identity Services (GIS) Script
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGisLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGisLoaded(true);
    };
    script.onerror = () => {
      // If blocked or offline, fallback mode is available
    };
    document.body.appendChild(script);

    return () => {
      // Keep script tag in body
    };
  }, []);

  // 3. Initialize GIS and Render Google Button
  useEffect(() => {
    if (!gisLoaded || !window.google?.accounts?.id || !googleBtnRef.current || !googleClientId) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: 280,
      });
    } catch (err: any) {
      console.warn('GIS initialization error:', err);
    }
  }, [gisLoaded, googleClientId, authMode]);

  // Handle Google Token Callback
  const handleGoogleCredentialResponse = async (response: { credential?: string }) => {
    if (!response.credential) {
      setError('Google Sign-In failed: No credential received.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onAuthenticate({
          email: data.user.email,
          name: data.user.name,
          ldap: data.user.ldap,
          picture: data.user.picture,
        });
        return;
      }

      setError(data.error || 'Authentication error with Google account.');
    } catch (err: any) {
      setError(err.message || 'Network error verifying Google account.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Password Fallback Form Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password.trim(),
          ldap: ldapInput.trim() || undefined,
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
      setError(err.message || 'Authentication error.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 text-center animate-scaleUp">
        {/* Security Shield Lock Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Magic Countdown Generator
          </h1>
          <p className="text-xs text-slate-400">
            Corporate Access • Restricted to Google Workspace
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-slate-300 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>@google.com</span>
            <span className="text-slate-500">•</span>
            <span>@cloudspace.goog</span>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('google');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'google'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Sign-In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'password'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password Fallback</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug text-[11px]">{error}</span>
          </div>
        )}

        {/* Tab 1: Google OAuth Sign-In */}
        {authMode === 'google' && (
          <div className="space-y-4 py-2">
            {googleClientId ? (
              <div className="space-y-3">
                <div className="flex justify-center items-center min-h-[48px]">
                  <div ref={googleBtnRef} className="inline-block shadow-lg rounded-full"></div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Select your <code className="text-slate-400">@google.com</code> or{' '}
                  <code className="text-slate-400">@cloudspace.goog</code> account.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Google Client ID Pending Configuration</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To enable one-click Google Sign-In, provide a Google OAuth Client ID via{' '}
                  <code className="text-slate-300">GOOGLE_CLIENT_ID</code> environment variable, or enter it below to test:
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter Google Client ID (.apps.googleusercontent.com)..."
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value.trim())}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setAuthMode('password')}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Use Password Fallback Instead</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Password Fallback Form */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Corporate Access Password
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
                  placeholder="Enter corporate password..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Your LDAP Username
                </label>
                <span className="text-[10px] text-slate-500">For "My Projects" filter</span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={ldapInput}
                  onChange={(e) => setLdapInput(e.target.value)}
                  placeholder="e.g. aosterloh (default: aosterloh)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all group"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Unlock Application</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Note Footer */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secured via Google OAuth2 & GCP Secret Access</span>
        </div>
      </div>
    </div>
  );
};

