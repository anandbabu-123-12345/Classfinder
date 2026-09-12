import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Trash2,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { VacancySearch } from '../components/VacancySearch.js';
import { ReservationModal } from '../components/ReservationModal.js';
import { Classroom, Reservation, TimetableEntry } from '../types.js';
import { reservationApi, timetableApi, classroomApi } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';

export function LecturerDashboard() {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Classroom | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [myClassesToday, setMyClassesToday] = useState<TimetableEntry[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [isQuickOccupyOpen, setIsQuickOccupyOpen] = useState(false);
  const [occupyRoom, setOccupyRoom] = useState('');
  const [occupyPurpose, setOccupyPurpose] = useState('Faculty Lecture / Discussion');
  const [occupyDuration, setOccupyDuration] = useState(60);

  const fetchLecturerData = async () => {
    try {
      // 1. Fetch lecturer reservations
      const res = await reservationApi.getReservations();
      if (res.success) {
        setMyReservations(res.reservations);
      }

      // 2. Fetch all classrooms for quick occupy selection
      const crRes = await classroomApi.getClassrooms();
      if (crRes.success) {
        setAllClassrooms(crRes.classrooms);
        if (crRes.classrooms.length > 0 && !occupyRoom) {
          setOccupyRoom(crRes.classrooms[0].roomNumber);
        }
      }

      // 3. Fetch timetable for today
      const ttRes = await timetableApi.getActive();
      if (ttRes.success && ttRes.entries) {
        const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const filtered = ttRes.entries.filter(
          (e) =>
            e.day.toLowerCase() === todayDay.toLowerCase() &&
            (e.lecturer.toLowerCase().includes(user?.name.toLowerCase() || '') ||
              (user?.name && e.lecturer.toLowerCase().includes(user.name.split(' ').pop()?.toLowerCase() || '')))
        );
        setMyClassesToday(filtered.length > 0 ? filtered : ttRes.entries.slice(0, 4));
      }
    } catch (err) {
      console.error('Error loading lecturer data:', err);
    }
  };

  useEffect(() => {
    fetchLecturerData();
  }, [user]);

  const handleQuickOccupy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupyRoom) return;
    try {
      const res = await reservationApi.occupyClassroom({
        classroom: occupyRoom,
        durationMinutes: occupyDuration,
        purpose: occupyPurpose,
      });

      if (res.success) {
        notify('success', res.message, 'Classroom Occupied');
        setIsQuickOccupyOpen(false);
        fetchLecturerData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Could not occupy classroom.', 'Conflict');
    }
  };

  const handleRelease = async (resId: string) => {
    try {
      const res = await reservationApi.releaseClassroom(resId);
      if (res.success) {
        notify('success', res.message, 'Classroom Released');
        fetchLecturerData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to release room.');
    }
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await reservationApi.cancelReservation(id);
      if (res.success) {
        notify('info', 'Booking cancelled.', 'Cancelled');
        fetchLecturerData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to cancel reservation.');
    }
  };

  const activeOccupations = myReservations.filter(
    (r) => r.status === 'active' && r.isTemporaryOccupation
  );
  const activeBookings = myReservations.filter(
    (r) => r.status === 'active' && !r.isTemporaryOccupation
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-inner">
            {user?.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">{user?.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Faculty / Lecturer
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Designation: <span className="text-slate-200">{user?.designation || 'Associate Professor'}</span> •{' '}
              {user?.department || 'Department of Computer Science'} • ID: {user?.lecturerId || 'FAC-2024-08'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsQuickOccupyOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/25"
          >
            <Lock className="w-4 h-4" />
            Quick Occupy Classroom
          </button>
        </div>
      </div>

      {/* Active Occupations Alert Banner if occupying any room right now */}
      {activeOccupations.length > 0 && (
        <div className="p-5 rounded-3xl bg-indigo-950/40 border border-indigo-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              You are currently occupying {activeOccupations.length} classroom(s)
            </h3>
            <span className="text-xs text-indigo-300 font-mono">Live Session</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeOccupations.map((occ) => (
              <div
                key={occ.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white text-base">Classroom {occ.classroom}</div>
                  <div className="text-xs text-slate-400">
                    Occupied until {occ.endTime} • {occ.purpose}
                  </div>
                </div>
                <button
                  onClick={() => handleRelease(occ.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Release Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Occupy Modal */}
      {isQuickOccupyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Quick Occupy Classroom</h3>
            <p className="text-xs text-slate-400 mb-4">
              Instantly mark a room as occupied for your current lecture, test, or seminar session.
            </p>

            <form onSubmit={handleQuickOccupy} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Classroom</label>
                <select
                  value={occupyRoom}
                  onChange={(e) => setOccupyRoom(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                >
                  {allClassrooms.map((cr) => (
                    <option key={cr.id} value={cr.roomNumber}>
                      {cr.roomNumber} ({cr.building} - {cr.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
                <select
                  value={occupyDuration}
                  onChange={(e) => setOccupyDuration(Number(e.target.value))}
                  className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                >
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={90}>90 Minutes (1.5 Hours)</option>
                  <option value={120}>120 Minutes (2 Hours)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Academic Purpose</label>
                <input
                  type="text"
                  value={occupyPurpose}
                  onChange={(e) => setOccupyPurpose(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickOccupyOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Occupy Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vacancy Search Tool */}
      <VacancySearch
        onOpenReserveModal={(room) => {
          setSelectedRoomForBooking(room);
          setIsBookingModalOpen(true);
        }}
        onQuickOccupy={(room) => {
          setOccupyRoom(room.roomNumber);
          setIsQuickOccupyOpen(true);
        }}
      />

      {/* Teaching Schedule & Reservations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Teaching Schedule */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Faculty Teaching Schedule
            </h3>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
          </div>

          {myClassesToday.length > 0 ? (
            <div className="space-y-3">
              {myClassesToday.map((cl, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                      <span>{cl.subject}</span>
                      <span className="text-xs font-mono text-emerald-300">({cl.courseCode})</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-300 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Room {cl.roomNumber}
                      </span>
                      <span>Sec {cl.section}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                      {cl.startTime} - {cl.endTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No classes scheduled for today in the active timetable.
            </div>
          )}
        </div>

        {/* My Reserved Classrooms */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Faculty Reservations & History
            </h3>
            <span className="text-xs text-slate-400">{activeBookings.length} Active</span>
          </div>

          {activeBookings.length > 0 ? (
            <div className="space-y-3">
              {activeBookings.map((res) => (
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
                    <div className="text-xs text-indigo-400 font-medium">
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
              You have no pending classroom reservations.
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
          fetchLecturerData();
        }}
      />
    </div>
  );
}
