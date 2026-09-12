import React, { useState } from 'react';
import { Calendar, Clock, BookOpen, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Classroom } from '../types.js';
import { reservationApi } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.js';

interface ReservationModalProps {
  room: Classroom | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationModal({ room, isOpen, onClose, onSuccess }: ReservationModalProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('11:00 AM');
  const [endTime, setEndTime] = useState('11:55 AM');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const { notify } = useNotification();

  if (!isOpen || !room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) return;

    setIsLoading(true);
    setConflictError(null);

    try {
      const res = await reservationApi.createReservation({
        classroom: room.roomNumber,
        date,
        startTime,
        endTime,
        purpose: purpose.trim(),
      });

      if (res.success) {
        notify('success', `Room ${room.roomNumber} reserved for ${date} (${startTime} - ${endTime}).`, 'Reservation Confirmed');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setConflictError(err.message || 'Unable to reserve classroom.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Reserve Classroom {room.roomNumber}</h2>
            <p className="text-xs text-slate-400">
              {room.building} • Floor {room.floor} • Capacity: {room.capacity}
            </p>
          </div>
        </div>

        {conflictError && (
          <div className="mb-4 text-xs font-medium text-rose-300 bg-rose-950/50 border border-rose-800/50 py-2.5 px-3.5 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{conflictError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Reservation Date</label>
            <input
              type="date"
              required
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> End Time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="09:55 AM">09:55 AM</option>
                <option value="10:55 AM">10:55 AM</option>
                <option value="11:55 AM">11:55 AM</option>
                <option value="01:55 PM">01:55 PM</option>
                <option value="02:55 PM">02:55 PM</option>
                <option value="03:55 PM">03:55 PM</option>
                <option value="04:55 PM">04:55 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Academic Purpose</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Peer study group, project collaboration, faculty seminar"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !purpose.trim()}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm Reservation
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
