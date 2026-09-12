import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  MapPin,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { VacancySearch } from '../components/VacancySearch.js';
import { ReservationModal } from '../components/ReservationModal.js';
import { Classroom, Reservation, TimetableEntry } from '../types.js';
import { reservationApi, timetableApi } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';

export function StudentDashboard() {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Classroom | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch student's reservations
      const res = await reservationApi.getReservations();
      if (res.success) {
        setMyReservations(res.reservations.filter((r) => r.status === 'active'));
      }

      // 2. Fetch today's classes
      const ttRes = await timetableApi.getActive();
      if (ttRes.success && ttRes.entries) {
        const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const filtered = ttRes.entries.filter(
          (e) => e.day.toLowerCase() === todayDay.toLowerCase()
        );
        setTodayClasses(filtered.slice(0, 6));
      }
    } catch (err) {
      console.error('Error loading student data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      const res = await reservationApi.cancelReservation(id);
      if (res.success) {
        notify('info', 'Reservation cancelled.', 'Cancelled');
        fetchStudentData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to cancel reservation.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-2xl shadow-inner">
            {user?.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Welcome, {user?.name}!</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Student
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              ID: <span className="text-slate-300 font-mono">{user?.studentId || 'STU-2026-101'}</span> •{' '}
              {user?.department || 'Computer Science'} • Verified Account ✓
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-right">
            <div className="text-[11px] text-slate-400">My Active Bookings</div>
            <div className="text-xl font-bold text-indigo-400">{myReservations.length}</div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-right">
            <div className="text-[11px] text-slate-400">Classes Scheduled Today</div>
            <div className="text-xl font-bold text-emerald-400">{todayClasses.length}</div>
          </div>
        </div>
      </div>

      {/* Main Vacancy Finder Section */}
      <VacancySearch
        onOpenReserveModal={(room) => {
          setSelectedRoomForBooking(room);
          setIsBookingModalOpen(true);
        }}
      />

      {/* Side-by-Side: Today's Schedule & My Active Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Today's Campus Class Schedule
            </h3>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
          </div>

          {todayClasses.length > 0 ? (
            <div className="space-y-3">
              {todayClasses.map((cl, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>{cl.subject}</span>
                      <span className="text-xs font-mono text-indigo-300">({cl.courseCode})</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> Room {cl.roomNumber}
                      </span>
                      <span>Faculty: {cl.lecturer}</span>
                      <span>Sec {cl.section}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
                      {cl.startTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No campus classes scheduled for today in the active timetable.
            </div>
          )}
        </div>

        {/* My Reservations */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              My Classroom Reservations
            </h3>
            <span className="text-xs text-slate-400">{myReservations.length} Active</span>
          </div>

          {myReservations.length > 0 ? (
            <div className="space-y-3">
              {myReservations.map((res) => (
                <div
                  key={res.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>Room {res.classroom}</span>
                      <span className="text-xs text-slate-400">• {res.date}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Purpose: <span className="text-slate-200">{res.purpose}</span>
                    </div>
                    <div className="text-xs text-emerald-400 font-medium">
                      {res.startTime} - {res.endTime}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelReservation(res.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    title="Cancel Booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              You have no active classroom bookings. Select any available room above to reserve.
            </div>
          )}
        </div>
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        room={selectedRoomForBooking}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedRoomForBooking(null);
        }}
        onSuccess={() => {
          fetchStudentData();
        }}
      />
    </div>
  );
}
