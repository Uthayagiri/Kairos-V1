import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { authApi } from '../features/auth/authApi';
import { NetworkError } from '../features/api/errors/apiErrors';

interface AuthScreenProps {
  onBack: () => void;
  onSuccess?: (user: { id: string; email: string; name: string; onboardingCompleted?: boolean; avatarUrl?: string | null }) => void;
}

type AuthMode = 'create' | 'login';

// Module-level singletons to guarantee initialize is called strictly once across all renders/remounts
let globalGisInitializedClientId: string | null = null;
let activeGoogleCallback: ((response: any) => void) | null = null;

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBack, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const googleButtonContainerRef = useRef<HTMLDivElement | null>(null);
  const isGoogleAuthInProgressRef = useRef<boolean>(false);

  const toggleAuthMode = (newMode: AuthMode) => {
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
    } catch {
      // Fallback
    }
    setMode(newMode);
    setFeedbackMsg(null);
  };

  /**
   * Authoritative credential callback triggered by Google Identity Services popup
   */
  const handleGoogleCredentialResponse = useCallback(
    async (response: any) => {
      if (isGoogleAuthInProgressRef.current) return;
      isGoogleAuthInProgressRef.current = true;

      try {
        if (!response || !response.credential) {
          throw new Error('No credential returned from Google account selection.');
        }

        setIsLoading(true);
        setFeedbackMsg('Verifying Google credentials with Kairos backend...');

        const res = await authApi.loginWithGoogle({
          idToken: response.credential
        });

        setIsLoading(false);
        setFeedbackMsg(null);

        if (onSuccess && res.user) {
          onSuccess({
            id: res.user.id,
            email: res.user.email,
            name: res.user.profile?.name || res.user.email.split('@')[0],
            onboardingCompleted: Boolean(res.user.profile?.onboardingCompleted),
            avatarUrl: res.user.profile?.avatarUrl ?? null
          });
        }
      } catch (err: any) {
        setIsLoading(false);
        setFeedbackMsg(err.message || 'Google authentication failed. Please try again.');
      } finally {
        isGoogleAuthInProgressRef.current = false;
      }
    },
    [onSuccess]
  );

  // Keep active callback reference up to date without re-initializing GIS
  useEffect(() => {
    activeGoogleCallback = handleGoogleCredentialResponse;
    return () => {
      activeGoogleCallback = null;
    };
  }, [handleGoogleCredentialResponse]);

  /**
   * Single, idempotent GIS initialization & button rendering lifecycle
   */
  useEffect(() => {
    let isMounted = true;

    const googleClientId =
      (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID ||
      '138279147054-8po60obfaprn2c35o7lfueu3755akqgs.apps.googleusercontent.com';

    if (!googleClientId) return;

    const renderGoogleButton = () => {
      if (!isMounted || !googleButtonContainerRef.current) return;
      const googleObj = (window as any).google;
      if (!googleObj?.accounts?.id) return;

      try {
        // Initialize GIS strictly once per clientId across the app lifetime
        if (globalGisInitializedClientId !== googleClientId) {
          googleObj.accounts.id.initialize({
            client_id: googleClientId,
            callback: (resp: any) => {
              if (activeGoogleCallback) {
                activeGoogleCallback(resp);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true
          });
          globalGisInitializedClientId = googleClientId;
        }

        // Render official button into pure leaf DOM container (which has NO React children)
        if (googleButtonContainerRef.current) {
          while (googleButtonContainerRef.current.firstChild) {
            googleButtonContainerRef.current.removeChild(googleButtonContainerRef.current.firstChild);
          }
          googleObj.accounts.id.renderButton(googleButtonContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: mode === 'create' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 175
          });
        }
      } catch (err) {
        console.warn('Google Identity Services render warning:', err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const checkScript = () => {
        if ((window as any).google?.accounts?.id) {
          renderGoogleButton();
        }
      };

      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', checkScript);
      }

      const pollInterval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(pollInterval);
          renderGoogleButton();
        }
      }, 200);

      return () => {
        isMounted = false;
        clearInterval(pollInterval);
        if (existingScript) {
          existingScript.removeEventListener('load', checkScript);
        }
      };
    }

    return () => {
      isMounted = false;
    };
  }, [mode]);

  const handleSocialAuth = (provider: 'Apple' | 'Google') => {
    if (provider === 'Apple') {
      setFeedbackMsg('Apple Sign-In is available on iOS native builds.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
    } catch {
      // Fallback
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setFeedbackMsg('Please enter both your email address and passcode.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFeedbackMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'create' && trimmedPassword.length < 8) {
      setFeedbackMsg('Passcode must be at least 8 characters with letters and numbers.');
      return;
    }

    setIsLoading(true);
    setFeedbackMsg(null);

    try {
      if (mode === 'create') {
        const res = await authApi.register({
          email: trimmedEmail,
          password: trimmedPassword,
          name: trimmedEmail.split('@')[0]
        });
        setIsLoading(false);
        setIsSuccess(true);
        if (onSuccess) {
          onSuccess({
            id: res.user.id,
            email: res.user.email,
            name: res.user.profile?.name || res.user.email.split('@')[0],
            onboardingCompleted: Boolean(res.user.profile?.onboardingCompleted)
          });
        }
        return;
      } else {
        const res = await authApi.login({
          email: trimmedEmail,
          password: trimmedPassword
        });
        setIsLoading(false);
        setIsSuccess(true);
        if (onSuccess) {
          onSuccess({
            id: res.user.id,
            email: res.user.email,
            name: res.user.profile?.name || res.user.email.split('@')[0],
            onboardingCompleted: Boolean(res.user.profile?.onboardingCompleted)
          });
        }
        return;
      }
    } catch (err: any) {
      setIsLoading(false);
      setFeedbackMsg(err.message || 'Authentication failed. Please check your credentials.');
      return;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface overflow-hidden relative selection:bg-primary-fixed selection:text-on-primary-fixed antialiased animate-fade-in">
      {/* Subtle Ambient Radial Aura Blurs */}
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-primary-container/10 rounded-full blur-[60px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-20 w-64 h-64 bg-secondary-container/15 rounded-full blur-[70px] pointer-events-none -z-10" />

      {/* Main Scrollable App View */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-safe pb-4 flex flex-col justify-between">
        <div className="flex flex-col w-full space-y-4 pt-1">
          {/* Top Bar: Brand Logo & Back Action */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden shadow-xs border border-white/20"
                style={{
                  background:
                    'radial-gradient(circle at 35% 30%, rgb(96, 165, 250) 0%, rgb(129, 140, 248) 30%, rgb(192, 132, 252) 60%, rgb(244, 63, 94) 85%, rgb(236, 72, 153) 100%)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
                <span
                  className="relative text-on-primary font-bold text-[16px] leading-none select-none drop-shadow-sm"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  K
                </span>
              </div>
              <span className="font-headline-sm text-lg text-on-surface font-bold tracking-tight">
                Kairos
              </span>
            </div>

            {/* Back Button */}
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-surface-container-lowest/90 hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all active:scale-95 shadow-xs cursor-pointer"
              aria-label="Back to welcome screen"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-surface-container-low rounded-full border border-outline-variant/20 shadow-xs">
            <button
              type="button"
              id="tab-create"
              onClick={() => toggleAuthMode('create')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all text-center cursor-pointer ${mode === 'create'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              Create Account
            </button>
            <button
              type="button"
              id="tab-login"
              onClick={() => toggleAuthMode('login')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all text-center cursor-pointer ${mode === 'login'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
            >
              Log In
            </button>
          </div>

          {/* Header & Assurance Pitch */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight leading-snug">
              {mode === 'create' ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-on-surface-variant leading-normal">
              {mode === 'create'
                ? 'Your private sanctuary for memories, routines, and flow analytics.'
                : 'Access your private sanctuary for memories, routines, and flow analytics.'}
            </p>
          </div>

          {/* Quick Social Authentication */}
          <div className="space-y-2">
            <span className="text-xs text-outline uppercase tracking-wider font-semibold block">
              {mode === 'create' ? 'Sign up with' : 'Log in with'}
            </span>
            <div className="grid grid-cols-2 gap-3">
              {/* Apple Button */}
              <button
                onClick={() => handleSocialAuth('Apple')}
                className="flex items-center justify-center space-x-2 h-11 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant/30 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                type="button"
              >
                <svg className="w-4 h-4 fill-on-surface" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.67-1.09 1.74-.95 2.77.99.08 2.04-.52 2.67-1.27z" />
                </svg>
                <span className="text-sm text-on-surface font-semibold">Apple</span>
              </button>

              {/* Google Sign-In Button (Official GIS Rendered Button) */}
              <div
                id="google-signin-btn-container"
                ref={googleButtonContainerRef}
                className="flex items-center justify-center h-11 w-full overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-xs active:scale-[0.98] transition-all cursor-pointer [&_iframe]:!m-0 [&_iframe]:!w-full [&_iframe]:!max-w-full"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center space-x-3 py-1">
            <div className="flex-1 h-[1px] bg-surface-container-highest" />
            <span className="text-xs text-outline uppercase tracking-wider font-semibold">
              OR CONTINUE WITH USER ID
            </span>
            <div className="flex-1 h-[1px] bg-surface-container-highest" />
          </div>

          {/* Form Fields */}
          <form className="flex flex-col space-y-3.5" id="auth-form" onSubmit={handleSubmit}>
            {/* User ID Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface block" htmlFor="email-input">
                User ID
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                  alternate_email
                </span>
                <input
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-lowest text-on-surface text-base placeholder-outline/70 border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-xs transition-all"
                  id="email-input"
                  placeholder="your.flow@domain.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-semibold text-on-surface"
                  htmlFor="password-input"
                >
                  {mode === 'create' ? 'Safe Passcode' : 'Password'}
                </label>
                {mode === 'create' && (
                  <span className="text-xs text-primary bg-primary-fixed/60 px-2 py-0.5 rounded-full font-bold">
                    Min 8 chars
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
                  key
                </span>
                <input
                  className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-lowest text-on-surface text-base placeholder-outline/70 border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-xs transition-all"
                  id="password-input"
                  placeholder={mode === 'create' ? 'Create safe passcode' : 'Enter your passcode'}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-3 text-outline hover:text-on-surface p-1 cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {feedbackMsg && (
              <div className="p-3 rounded-xl bg-primary-fixed/40 border border-primary/20 text-primary text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>{feedbackMsg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Bottom Actions & Legal */}
        <div className="text-center pt-4 pb-2 flex flex-col items-center space-y-2.5 w-full mt-auto">
          <button
            form="auth-form"
            className="w-full h-13 rounded-full bg-gradient-to-r from-primary via-primary-container to-secondary text-on-primary text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-primary/25 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
            id="submit-cta"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Synchronizing...</span>
              </span>
            ) : (
              <>
                <span>
                  {mode === 'create' ? 'Continue to Kairos' : 'Enter Kairos Vault'}
                </span>
                <span className="material-symbols-outlined text-lg">
                  {mode === 'create' ? 'arrow_forward' : 'lock_open'}
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center space-x-1.5 py-0.5">
            <span className="text-xs text-on-surface-variant">
              {mode === 'create' ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              type="button"
              onClick={() => toggleAuthMode(mode === 'create' ? 'login' : 'create')}
              className="text-xs text-primary font-bold hover:underline cursor-pointer"
            >
              {mode === 'create' ? 'Log in' : 'Create one'}
            </button>
          </div>

          <p className="text-[11px] text-outline leading-normal">
            By continuing, you agree to Kairos's{' '}
            <a className="text-primary underline font-medium" href="#terms" onClick={(e) => e.preventDefault()}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a className="text-primary underline font-medium" href="#privacy" onClick={(e) => e.preventDefault()}>
              Privacy Architecture
            </a>
            .
          </p>
        </div>
      </div>

      {/* Success Modal */}
      {isSuccess && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25 mx-auto text-white">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-on-surface">
                {mode === 'create' ? 'Space Initialized!' : 'Vault Unlocked!'}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Welcome to your Kairos sanctuary. Your circadian rhythm and cognitive space are now ready.
              </p>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
              }}
              className="w-full h-12 rounded-full bg-primary text-on-primary text-sm font-bold shadow-md active:scale-98 cursor-pointer"
              type="button"
            >
              Enter Kairos Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

