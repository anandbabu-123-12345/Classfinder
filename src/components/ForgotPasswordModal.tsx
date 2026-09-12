import React, { useState } from 'react';
import { X, KeyRound, Mail, Lock, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose, onSuccess }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword' | 'completed'>('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { notify } = useNotification();

  if (!isOpen) return null;

  // Password requirements
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const strengthScore = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.success) {
        setUserId(res.userId);
        setDevOtp(res.devOtp || '');
        setStep('otp');
        notify('info', 'Verification code dispatched to your email.', 'Code Sent');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Email not found.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP.');
      return;
    }
    // Proceed to set new password
    setStep('newPassword');
    setErrorMsg('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strengthScore < 5) {
      setErrorMsg('Please ensure password fulfills all security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authApi.resetPassword({
        userId,
        enteredOtp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setStep('completed');
        notify('success', 'Your password has been successfully reset!', 'Password Updated');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Reset Account Password</h2>
          <p className="text-xs text-slate-400 mt-1">
            {step === 'email' && 'Enter your institutional email to receive an authorization code.'}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'newPassword' && 'Define a new compliant password for your account.'}
            {step === 'completed' && 'Account credentials updated successfully.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-800/40 py-2.5 px-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: ENTER EMAIL */}
        {step === 'email' && (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">University Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Checking...' : 'Send Verification OTP'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: ENTER OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {devOtp && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <span>Dev Sandbox Code: <strong>{devOtp}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950"
                >
                  Fill
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">6-Digit Security OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-widest font-mono text-xl py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={otp.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Verify Code
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Strength meter */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Password Strength</span>
                <span className={strengthScore >= 4 ? 'text-emerald-400' : 'text-amber-400'}>
                  {strengthScore <= 2 ? 'Weak' : strengthScore <= 4 ? 'Moderate' : 'Strong'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 h-1.5">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`rounded-full transition-all ${
                      idx <= strengthScore
                        ? strengthScore >= 4
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Criteria checklist */}
            <div className="text-xs space-y-1 text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : ''}`}>
                <Check className="w-3.5 h-3.5" /> At least 8 characters
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper && hasLower ? 'text-emerald-400' : ''}`}>
                <Check className="w-3.5 h-3.5" /> Upper and lowercase letters
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
                <Check className="w-3.5 h-3.5" /> At least one number
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : ''}`}>
                <Check className="w-3.5 h-3.5" /> At least one special character (!@#$%^&*)
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || strengthScore < 5 || !passwordsMatch}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* STEP 4: COMPLETED */}
        {step === 'completed' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check className="w-7 h-7" />
            </div>
            <p className="text-sm text-slate-300">
              Your password has been reset. You may now return to the login screen.
            </p>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Proceed to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
