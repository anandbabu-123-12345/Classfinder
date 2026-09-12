import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, X, KeyRound, Clock, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api.js';

interface DevMailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseCode?: (code: string) => void;
}

export function DevMailboxModal({ isOpen, onClose, onUseCode }: DevMailboxModalProps) {
  const [latestMail, setLatestMail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMail = async () => {
    setIsLoading(true);
    try {
      const res = await authApi.getDevMailbox();
      if (res.success) {
        setLatestMail(res.latestMail);
      }
    } catch (err) {
      console.error('Failed to fetch dev mailbox:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMail();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">In-App OTP Mailbox (Sandbox)</h3>
              <p className="text-xs text-slate-400">View generated OTP emails without accessing external SMTP</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchMail}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Refresh Mailbox"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          {latestMail ? (
            <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">To: <strong className="text-slate-200">{latestMail.to}</strong></span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(latestMail.sentAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-200 border-t border-slate-800/80 pt-2">
                {latestMail.subject}
              </div>

              <div className="py-3 px-4 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-sky-400" />
                  <div>
                    <div className="text-xs text-sky-300 font-medium">Verification Code</div>
                    <div className="text-2xl font-mono font-bold tracking-widest text-white">{latestMail.code}</div>
                  </div>
                </div>
                {onUseCode && (
                  <button
                    onClick={() => {
                      onUseCode(latestMail.code);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                  >
                    Auto-Fill
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Purpose: <span className="capitalize text-slate-300">{latestMail.purpose.replace('_', ' ')}</span>. Valid for 2 minutes.
              </p>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No OTP emails sent yet.</p>
              <p className="text-xs text-slate-400 mt-1">Register an account or request password reset to generate an OTP.</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
