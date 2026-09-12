import React, { useState } from 'react';
import { motion } from 'motion/react';
import { School, Mail, Lock, Eye, EyeOff, LogIn, Sparkles, UserCheck, Shield, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types.js';

interface LoginViewProps {
  onOpenRegister: () => void;
  onOpenForgotPassword: () => void;
  onOpenDevMailbox: () => void;
}

export function LoginView({ onOpenRegister, onOpenForgotPassword, onOpenDevMailbox }: LoginViewProps) {
  const { login, loginAsDemo } = useAuth();
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      await login({ email, password, role });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    setIsLoading(true);
    setErrorMsg('');
    try {
      await loginAsDemo(selectedRole);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle decorative background circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Header with Logo */}
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-inner"
          >
            <School className="w-7 h-7" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Empty Classroom Finder</h1>
          <p className="text-xs text-slate-400 mt-1">University Resource & Real-Time Vacancy Portal</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-3 gap-1 mb-6">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              role === 'student'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole('lecturer')}
            className={`py-2 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              role === 'lecturer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Lecturer
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`py-2 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              role === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: [0, -4, 4, -2, 0] }}
            className="mb-5 text-xs font-medium text-rose-400 bg-rose-950/40 border border-rose-800/40 py-2.5 px-3.5 rounded-xl"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder={
                  role === 'admin'
                    ? 'admin@university.edu'
                    : role === 'lecturer'
                    ? 'dr.smith@university.edu'
                    : 'alex.student@university.edu'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-sm bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300">Remember credentials</span>
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In to Portal
              </>
            )}
          </motion.button>
        </form>

        {/* 1-Click Fast Sandbox Access for Quick Testing */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Demo Testing
            </span>
            <button
              type="button"
              onClick={onOpenDevMailbox}
              className="text-xs text-sky-400 hover:underline"
            >
              Dev OTP Box
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoSelect('admin')}
              className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-200 transition-colors text-center"
            >
              <div className="font-semibold text-white">Admin</div>
              <div className="text-[10px] text-slate-400">Registrar</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSelect('lecturer')}
              className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-200 transition-colors text-center"
            >
              <div className="font-semibold text-white">Lecturer</div>
              <div className="text-[10px] text-slate-400">Faculty</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoSelect('student')}
              className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-200 transition-colors text-center"
            >
              <div className="font-semibold text-white">Student</div>
              <div className="text-[10px] text-slate-400">Alex R.</div>
            </button>
          </div>
        </div>

        {/* Register link */}
        <div className="mt-6 text-center text-xs text-slate-400">
          New student or faculty member?{' '}
          <button
            type="button"
            onClick={onOpenRegister}
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create Account & Verify with OTP
          </button>
        </div>
      </motion.div>
    </div>
  );
}
