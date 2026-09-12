import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Clock, RotateCw, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface OtpModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function OtpModal({ isOpen, onClose, onSuccess }: OtpModalProps) {
  const { pendingOtp, setPendingOtp, verifyOtp, resendOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [resendCooldown, setResendCooldown] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize countdown based on pendingOtp.expiresAt
  useEffect(() => {
    if (!isOpen || !pendingOtp) return;
    const remaining = Math.max(0, Math.floor((pendingOtp.expiresAt - Date.now()) / 1000));
    setTimeLeft(remaining > 0 ? remaining : 120);
    setResendCooldown(30);
    setDigits(['', '', '', '', '', '']);
    setErrorMsg('');

    // focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, [isOpen, pendingOtp]);

  // Expiry timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen || !pendingOtp) return null;

  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1);
    if (char && !/^\d$/.test(char)) return; // numbers only

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg('');

    // Advance focus
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all filled
    if (char && index === 5 && newDigits.every((d) => d !== '')) {
      handleSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const split = pasteData.split('');
      setDigits(split);
      handleSubmit(pasteData);
    }
  };

  const handleSubmit = async (codeToSubmit?: string) => {
    const code = codeToSubmit || digits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMsg('This code has expired. Please click Resend OTP.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const ok = await verifyOtp(code);
      if (ok) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg('Invalid code entered. Please verify and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendOtp();
      setResendCooldown(30);
      setTimeLeft(120);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-100 relative">
        {onClose && (
          <button
            onClick={() => {
              setPendingOtp(null);
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Account</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            We have dispatched a 6-digit security code to{' '}
            <span className="font-semibold text-slate-200">{pendingOtp.email}</span>
          </p>
        </div>

        {/* Sandbox quick-fill badge if devOtp is present */}
        {pendingOtp.devOtp && (
          <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span className="font-mono">
              Dev Sandbox Code: <strong>{pendingOtp.devOtp}</strong>
            </span>
            <button
              onClick={() => {
                const arr = pendingOtp.devOtp!.split('');
                setDigits(arr);
                handleSubmit(pendingOtp.devOtp);
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
            >
              Fill & Verify
            </button>
          </div>
        )}

        {/* 6 Digit Inputs */}
        <div className="mt-6 flex justify-center gap-2 sm:gap-3">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border bg-slate-950/70 transition-all outline-hidden ${
                digit
                  ? 'border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                  : 'border-slate-700 text-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="mt-3 text-center text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-800/40 py-2 px-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Timer & Resend */}
        <div className="mt-5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              {timeLeft > 0 ? (
                <>OTP expires in <strong className="text-indigo-400 font-mono">{formatTimer(timeLeft)}</strong></>
              ) : (
                <strong className="text-rose-400">Code expired</strong>
              )}
            </span>
          </div>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={`flex items-center gap-1 font-medium transition-colors ${
              resendCooldown > 0
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-indigo-400 hover:text-indigo-300'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={isSubmitting || digits.join('').length !== 6 || timeLeft <= 0}
          className="mt-6 w-full py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Verify Account
            </>
          )}
        </button>
      </div>
    </div>
  );
}
