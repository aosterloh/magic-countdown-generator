import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle, ShieldAlert, RefreshCw, LogIn } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';
const CLIENT_ID = '32555940559-q8kmhnepbvqm7u1g9b3p5q0b4d45p6k8.apps.googleusercontent.com'; // Standard Google Workspace Client

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services (GSI)
  useEffect(() => {
    const initGsi = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnRef.current) {
            (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_blue',
              size: 'large',
              width: 320,
              text: 'signin_with',
              shape: 'pill',
            });
          }
        } catch (e) {
          console.warn('GSI render notice:', e);
        }
      }
    };

    const timer = setTimeout(initGsi, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle Google Credential Token from Google Identity
  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setError('No credential received from Google.');
      return;
    }
    await verifyWithBackend({ idToken: response.credential });
  };

  // Verify Token with Backend API
  const verifyWithBackend = async (payload: { idToken?: string; accessToken?: string }) => {
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onAuthenticate({
          email: data.user.email,
          name: data.user.name || data.user.email.split('@')[0],
        });
      } else {
        setError(data.error || 'Access Denied: Account not authorized.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error communicating with authentication service.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Direct Google OAuth Popup Flow Fallback
  const handleTriggerGoogleOAuth = () => {
    setIsVerifying(true);
    setError(null);

    // Use Google Identity Token Client if available
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              await verifyWithBackend({ accessToken: tokenResponse.access_token });
            } else {
              setIsVerifying(false);
              if (tokenResponse?.error) {
                setError(`Google Sign-In error: ${tokenResponse.error}`);
              }
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.warn('OAuth2 client init failed:', e);
      }
    }

    // Fallback: Check Active Cloudspace / Google Session via ADC
    fetch(`${API_BASE}/api/auth/me`)
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && (data.email.endsWith('@cloudspace.goog') || data.email.endsWith('@google.com'))) {
          onAuthenticate({ email: data.email, name: data.name });
        } else {
          setError(`Access Denied: Account is not in authorized domains (@cloudspace.goog or @google.com).`);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsVerifying(false));
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-sm w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        {/* Minimal Shield Lock Icon */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#4285F4]">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Corporate Sign In
          </h2>
          <p className="text-xs text-slate-400">
            Access restricted strictly to authorized accounts:
          </p>
          <p className="text-xs font-mono font-bold text-blue-400">
            @cloudspace.goog &bull; @google.com
          </p>
        </div>

        {/* Error Notice if personal account or unauthorized domain used */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 text-left animate-shake">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Google Sign-In Container */}
        <div className="space-y-3 pt-2">
          <div ref={googleBtnRef} className="flex justify-center min-h-[44px]" />

          {/* Direct Sign-In Button */}
          <button
            type="button"
            onClick={handleTriggerGoogleOAuth}
            disabled={isVerifying}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Verifying Corporate Domain...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-[#4285F4]" />
                <span>Sign in with Google Workspace</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
