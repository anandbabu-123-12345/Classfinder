import React, { useState, useEffect } from 'react';
import {
  School,
  LogOut,
  User as UserIcon,
  Shield,
  GraduationCap,
  UserCheck,
  Calendar,
  Layers,
  Clock,
  Mail,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { timetableApi } from '../services/api.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDevMailbox: () => void;
}

export function Navbar({ currentTab, onSelectTab, onOpenDevMailbox }: NavbarProps) {
  const { user, logout } = useAuth();
  const [timetableStatus, setTimetableStatus] = useState<{ isActive: boolean; version: number }>({
    isActive: false,
    version: 0,
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await timetableApi.getActive();
      setTimetableStatus({ isActive: res.isActive, version: res.version });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const role = user.role;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'vacancy', label: 'Find Classrooms', icon: Clock },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    ...(role === 'student'
      ? [{ id: 'reservations', label: 'My Bookings', icon: Calendar }]
      : role === 'lecturer'
      ? [{ id: 'reservations', label: 'Reservations', icon: Calendar }]
      : [
          { id: 'reservations', label: 'All Bookings', icon: Calendar },
          { id: 'admin-users', label: 'User Directory', icon: UserIcon },
          { id: 'admin-classrooms', label: 'Classrooms', icon: School },
          { id: 'admin-audit', label: 'Audit Trail', icon: Shield },
        ]),
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight flex items-center gap-2">
                <span>Empty Classroom Finder</span>
                {/* Role Pill */}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    role === 'admin'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : role === 'lecturer'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Academic Infrastructure & Vacancy</p>
            </div>
          </div>

          {/* Timetable Status Badge (Desktop) */}
          <div className="hidden lg:flex items-center">
            {timetableStatus.isActive ? (
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-medium">Timetable Active (v{timetableStatus.version})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">No Active Timetable</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Controls & Dev Mailbox */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Dev Mailbox Button */}
            <button
              onClick={onOpenDevMailbox}
              title="Open In-App OTP Mailbox Sandbox"
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>Dev OTP</span>
            </button>

            {/* Profile quick pill */}
            <button
              onClick={() => onSelectTab('profile')}
              className={`flex items-center gap-2 py-1 px-2.5 rounded-xl border transition-all ${
                currentTab === 'profile'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {user.name.charAt(0)}
              </div>
              <div className="text-left text-xs">
                <div className="font-medium text-white max-w-[100px] truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">{user.role}</div>
              </div>
            </button>

            {/* Sign out */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenDevMailbox}
              className="p-2 rounded-lg bg-slate-800 text-slate-300"
              title="Dev OTP Mailbox"
            >
              <Mail className="w-4 h-4 text-sky-400" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-6 space-y-1">
          {/* Status badge in mobile */}
          <div className="py-2 mb-2 border-b border-slate-800">
            {timetableStatus.isActive ? (
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Timetable Active (v{timetableStatus.version})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs w-fit">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>No Active Timetable</span>
              </div>
            )}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-white text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">{user.name}</div>
                <div className="text-slate-400">{user.email}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-xs text-rose-400 hover:underline"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
