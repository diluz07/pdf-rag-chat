import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, ArrowRight, X, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Lock } from 'lucide-react';

import { BACKEND_URL } from '../config';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, isMandatory = false }) {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Unable to send verification code.');
      }

      setStep('code');
      setCountdown(60);
      setSuccessMsg(`Verification code sent to ${cleanEmail}`);
    } catch (err) {
      setError(err.message || 'Network error while sending code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid verification code.');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (!isMandatory && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white/85 dark:bg-black/60 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/15 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl relative">
        {/* Close Button (Hidden if mandatory) */}
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/80 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shadow-xs border border-zinc-200/80 dark:border-white/15 backdrop-blur-xs">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">
            <span className="text-zinc-900 dark:text-white mr-1.5 font-normal">Sign in to</span>
            <span className="font-extrabold text-zinc-950 dark:text-white">PAGE</span>
            <span className="font-semibold text-zinc-400 dark:text-zinc-500">WISE</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enter your email to receive a 6-digit verification code
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-300 flex items-start gap-2 backdrop-blur-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email OTP Flow */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-800 hover:from-zinc-800 hover:to-zinc-700 disabled:opacity-50 text-white font-medium text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-black/25 border border-zinc-700/60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium hover:underline"
                >
                  Change email
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-3.5 py-2.5 text-center text-lg tracking-[0.3em] font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 text-center">
                Sent to <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-800 hover:from-zinc-800 hover:to-zinc-700 disabled:opacity-50 text-white font-medium text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-black/25 border border-zinc-700/60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>

            {/* Resend button */}
            <div className="text-center pt-1">
              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleSendOtp}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50 transition-colors"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
