"use client";

import React, { useState } from "react";
import { X, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { validateEmail } from "@/lib/auth/validation";
import { formatAuthError } from "@/lib/auth/error-utils";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
  isWaitlist?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  redirectTo,
  isWaitlist = false,
}) => {
  const { signInWithEmail, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError } = await signInWithEmail(email.trim());
      if (authError) {
        setError(formatAuthError(authError));
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err as Error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "discord") => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      setError(formatAuthError(err as Error));
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-parchment-200 border-2 border-parchment-600 rounded-sm shadow-2xl panel-texture animate-fade-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 text-ink-faint hover:text-ink hover:bg-parchment-300 rounded-sm transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="p-8">
          {success ? (
            <SuccessMessage email={email} onClose={handleClose} isWaitlist={isWaitlist} />
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display text-ink mb-2">
                  {isWaitlist ? "Join the Waiting List" : "Begin Your Journey"}
                </h2>
                <p className="text-sm text-ink-light font-serif">
                  {isWaitlist
                    ? "Be the first to know when Waypoint launches"
                    : "Sign in to save your progress and continue your adventure"}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-burgundy/10 border border-burgundy/30 rounded-sm">
                  <p className="text-sm text-burgundy text-center">{error}</p>
                </div>
              )}

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="mb-6">
                <label className="block text-sm font-bold font-small-caps text-ink-light mb-2 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adventurer@example.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 bg-parchment-100 border-2 border-parchment-400 rounded-sm text-ink font-serif focus:border-gold focus:outline-none placeholder-ink-faint disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 py-3 bg-burgundy text-parchment-100 font-display text-lg rounded-sm shadow-md hover:bg-burgundy-dim border border-parchment-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>{isWaitlist ? "Join Waitlist" : "Send Magic Link"}</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-parchment-400" />
                <span className="text-xs font-bold font-small-caps text-ink-faint uppercase tracking-widest">
                  Or continue with
                </span>
                <div className="flex-1 h-px bg-parchment-400" />
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3">
                <OAuthButton
                  provider="google"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isLoading}
                />
                <OAuthButton
                  provider="discord"
                  onClick={() => handleOAuthSignIn("discord")}
                  disabled={isLoading}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface OAuthButtonProps {
  provider: "google" | "discord";
  onClick: () => void;
  disabled?: boolean;
}

const OAuthButton: React.FC<OAuthButtonProps> = ({
  provider,
  onClick,
  disabled,
}) => {
  const config = {
    google: {
      label: "Google",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      bgClass: "bg-white hover:bg-gray-50 text-gray-700 border-gray-300",
    },
    discord: {
      label: "Discord",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
        </svg>
      ),
      bgClass: "bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#4752C4]",
    },
  };

  const { label, icon, bgClass } = config[provider];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 px-4 rounded-sm border-2 font-bold font-small-caps uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${bgClass}`}
    >
      {icon}
      <span>Continue with {label}</span>
    </button>
  );
};

interface SuccessMessageProps {
  email: string;
  onClose: () => void;
  isWaitlist?: boolean;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ email, onClose, isWaitlist }) => (
  <div className="text-center py-4">
    <div className="w-16 h-16 mx-auto mb-6 bg-forest/10 rounded-full flex items-center justify-center">
      <Mail size={32} className="text-forest" />
    </div>
    <h2 className="text-2xl font-display text-ink mb-3">Check Your Email</h2>
    <p className="text-ink-light font-serif mb-2">
      {isWaitlist ? "We've sent a confirmation to" : "We've sent a magic link to"}
    </p>
    <p className="text-ink font-bold mb-6">{email}</p>
    <p className="text-sm text-ink-faint mb-6">
      {isWaitlist
        ? "Click the link to confirm your spot. We'll notify you when Waypoint launches!"
        : "Click the link in the email to sign in. The link expires in 1 hour."}
    </p>
    <button
      onClick={onClose}
      className="px-6 py-2 bg-parchment-400 text-ink font-bold font-small-caps uppercase tracking-wider rounded-sm hover:bg-parchment-800 hover:text-parchment-100 transition-all"
    >
      Got it
    </button>
  </div>
);
