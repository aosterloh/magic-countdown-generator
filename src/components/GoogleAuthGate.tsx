import React, { useState, useEffect, useRef } from 'react';
import { Lock, AlertCircle, RefreshCw } from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string }) => void;
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';
const GOOGLE_CLIENT_ID = '557450838719-nv89pcpaspal8ngipt0ev4jb90c4ilki.apps.googleusercontent.com';

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    const initGsi = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            hosted_domain: 'cloudspace.goog',
          });

          if (googleButtonRef.current) {
            (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
              theme: 'filled_blue',
              size: 'large',
              width: 300,
              text: 'signin_with',
              shape: 'pill',
            });
          }
        } catch (err) {
          console.warn('GSI init notice:', err);
        }
      }
    };

    const timer = setTimeout(initGsi, 400);
    return () => clearTimeout(timer);
  }, []);

  // Handle Google ID Token returned by Google
  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setError('No credentials returned from Google.');
      return;
    }
    await verifyTokenWithBackend({ idToken: response.credential });
  };

  // Backend verification against Google's token servers
  const verifyTokenWithBackend = async (payload: { idToken?: string; accessToken?: string }) => {
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
        const email = (data.user.email || '').trim().toLowerCase();
        if (email.endsWith('@cloudspace.goog') || email.endsWith('@google.com')) {
          onAuthenticate({
            email,
            name: data.user.name || email.split('@')[0],
          });
          return;
        }
      }
      setError(data.error || 'Access Denied: You must sign in with an authorized @cloudspace.goog or @google.com account. Personal accounts (@gmail.com) are strictly disallowed.');
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Interactive Google OAuth Popup
  const handleTriggerOAuth = () => {
    setIsVerifying(true);
    setError(null);

    if ((window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
          hd: 'cloudspace.goog',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              await verifyTokenWithBackend({ accessToken: tokenResponse.access_token });
            } else {
              setIsVerifying(false);
              if (tokenResponse?.error) {
                setError(`Google Sign-In failed: ${tokenResponse.error}`);
              }
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err: any) {
        setError(err.message);
        setIsVerifying(false);
        return;
      }
    }

    setError('Google Identity client is loading. Please wait 2 seconds and click again.');
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-scaleUp">
        {/* Security Lock Icon */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#4285F4] shadow-lg shadow-blue-500/10">
          <Lock className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-white tracking-tight">
            Sign In with Google
          </h2>
          <p className="text-[11px] text-slate-400">
            Internal access restricted to:
          </p>
          <div className="text-[11px] font-mono font-bold text-blue-400">
            @cloudspace.goog &bull; @google.com
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug text-[11px]">{error}</span>
          </div>
        )}

        {/* Real Google Sign-In Actions */}
        <div className="space-y-3 pt-1">
          {/* GSI Standard Button */}
          <div ref={googleButtonRef} className="flex justify-center min-h-[44px]" />

          {/* Interactive Google Sign-In Button */}
          <button
            type="button"
            onClick={handleTriggerOAuth}
            disabled={isVerifying}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-slate-100 active:scale-98 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                  <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                  <span className="w-2 h-2 rounded-full bg-[#FBBC04]" />
                  <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                </div>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
