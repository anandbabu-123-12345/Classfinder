import React, { useState } from 'react';
import { NotificationProvider } from './context/NotificationContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { LoginView } from './components/LoginView.js';
import { RegisterView } from './components/RegisterView.js';
import { OtpModal } from './components/OtpModal.js';
import { ForgotPasswordModal } from './components/ForgotPasswordModal.js';
import { DevMailboxModal } from './components/DevMailboxModal.js';

import { StudentDashboard } from './pages/StudentDashboard.js';
import { LecturerDashboard } from './pages/LecturerDashboard.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { TimetableView } from './pages/TimetableView.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { VacancySearch } from './components/VacancySearch.js';
import { ReservationModal } from './components/ReservationModal.js';
import { Classroom } from './types.js';

function MainLayout() {
  const { user, isLoading, pendingOtp, setPendingOtp } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isDevMailboxOpen, setIsDevMailboxOpen] = useState(false);

  // Standalone booking modal if vacancy search is opened as a primary tab
  const [selectedRoom, setSelectedRoom] = useState<Classroom | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Connecting to University Portal...</p>
      </div>
    );
  }

  // If unauthenticated: show login/register views
  if (!user) {
    return (
      <>
        {authView === 'login' ? (
          <LoginView
            onOpenRegister={() => setAuthView('register')}
            onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
            onOpenDevMailbox={() => setIsDevMailboxOpen(true)}
          />
        ) : (
          <RegisterView onBackToLogin={() => setAuthView('login')} />
        )}

        {/* OTP Verification Modal (active when pendingOtp exists) */}
        <OtpModal
          isOpen={Boolean(pendingOtp)}
          onClose={() => setPendingOtp(null)}
          onSuccess={() => {
            setAuthView('login');
          }}
        />

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          onSuccess={() => {
            setIsForgotPasswordOpen(false);
            setAuthView('login');
          }}
        />

        {/* Dev OTP Mailbox Sandbox */}
        <DevMailboxModal
          isOpen={isDevMailboxOpen}
          onClose={() => setIsDevMailboxOpen(false)}
        />
      </>
    );
  }

  // Authenticated Application Shell
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenDevMailbox={() => setIsDevMailboxOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <>
            {user.role === 'admin' && <AdminDashboard />}
            {user.role === 'lecturer' && <LecturerDashboard />}
            {user.role === 'student' && <StudentDashboard />}
          </>
        )}

        {currentTab === 'vacancy' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <VacancySearch
              onOpenReserveModal={(room) => {
                setSelectedRoom(room);
                setIsBookingOpen(true);
              }}
            />
          </div>
        )}

        {currentTab === 'timetable' && <TimetableView />}

        {currentTab === 'reservations' && (
          <>
            {user.role === 'admin' && <AdminDashboard />}
            {user.role === 'lecturer' && <LecturerDashboard />}
            {user.role === 'student' && <StudentDashboard />}
          </>
        )}

        {currentTab === 'profile' && <ProfilePage />}

        {(currentTab === 'admin-users' || currentTab === 'admin-classrooms' || currentTab === 'admin-audit') && (
          <AdminDashboard />
        )}
      </main>

      {/* Global Booking Modal */}
      <ReservationModal
        room={selectedRoom}
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedRoom(null);
        }}
        onSuccess={() => {
          setIsBookingOpen(false);
        }}
      />

      {/* Dev OTP Mailbox Sandbox (available inside app anytime) */}
      <DevMailboxModal
        isOpen={isDevMailboxOpen}
        onClose={() => setIsDevMailboxOpen(false)}
      />

      {/* OTP Modal if an active user triggers a verification flow */}
      <OtpModal
        isOpen={Boolean(pendingOtp)}
        onClose={() => setPendingOtp(null)}
      />
    </div>
  );
}

export function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
