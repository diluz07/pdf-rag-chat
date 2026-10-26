import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, ArrowRight, X, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

import { BACKEND_URL } from '../config';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Sign in with Email
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            We will send a 6-digit verification code to your email
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email OTP Flow */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-sky-600/20 cursor-pointer"
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Change email
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2.5 text-center text-lg tracking-[0.3em] font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                Sent to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-sky-600/20 cursor-pointer"
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
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 transition-colors"
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
