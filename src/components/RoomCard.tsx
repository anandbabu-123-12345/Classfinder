import React from 'react';
import {
  School,
  Users,
  Wifi,
  Video,
  Tv,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  User as UserIcon,
  Calendar,
  Lock,
} from 'lucide-react';
import { Classroom, OccupiedRoomInfo } from '../types.js';
import { useAuth } from '../context/AuthContext.js';

interface RoomCardProps {
  key?: React.Key;
  room: Classroom;
  isAvailable: boolean;
  occupiedInfo?: OccupiedRoomInfo;
  onReserve?: (room: Classroom) => void;
  onQuickOccupy?: (room: Classroom) => void;
  onRelease?: (reservationId: string) => void;
}

export function RoomCard({
  room,
  isAvailable,
  occupiedInfo,
  onReserve,
  onQuickOccupy,
  onRelease,
}: RoomCardProps) {
  const { user } = useAuth();
  const isLecturer = user?.role === 'lecturer';
  const isAdmin = user?.role === 'admin';

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        isAvailable
          ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80 opacity-90'
      }`}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">{room.roomNumber}</h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {room.type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {room.building} • Floor {room.floor}
            </p>
          </div>

          {/* Status Badge */}
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <XCircle className="w-3.5 h-3.5" />
              Occupied
            </span>
          )}
        </div>

        {/* Room Metrics & Facilities */}
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-3">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Capacity: <strong>{room.capacity} seats</strong>
          </span>
        </div>

        {/* Facilities badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {room.facilities.map((fac, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-slate-400"
            >
              {fac}
            </span>
          ))}
        </div>

        {/* Occupied Details Card if room is Occupied */}
        {!isAvailable && occupiedInfo && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-900/30 text-xs space-y-2 mt-2">
            <div className="flex items-center justify-between text-rose-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                {occupiedInfo.details.startTime} - {occupiedInfo.details.endTime}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300">
                {occupiedInfo.reason === 'timetable' ? 'Official Timetable' : 'Reserved Session'}
              </span>
            </div>

            {occupiedInfo.reason === 'timetable' ? (
              <div className="space-y-1 text-slate-300">
                <div className="font-medium text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  {occupiedInfo.details.subject}
                  {occupiedInfo.details.courseCode && (
                    <span className="text-slate-400 text-[10px]">({occupiedInfo.details.courseCode})</span>
                  )}
                </div>
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <UserIcon className="w-3 h-3 text-slate-400" />
                  Lecturer: <span className="text-slate-200">{occupiedInfo.details.lecturer}</span>
                  {occupiedInfo.details.section && (
                    <span>• Sec {occupiedInfo.details.section}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-300">
                <div className="font-medium text-white">
                  Purpose: {occupiedInfo.details.purpose || 'Department Session'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Reserved by: <span className="text-slate-200">{occupiedInfo.details.reservedBy}</span> (
                  {occupiedInfo.details.reservedRole})
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center gap-2">
        {isAvailable ? (
          <>
            {onReserve && (
              <button
                onClick={() => onReserve(room)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Calendar className="w-3.5 h-3.5" />
                Reserve Room
              </button>
            )}

            {(isLecturer || isAdmin) && onQuickOccupy && (
              <button
                onClick={() => onQuickOccupy(room)}
                className="py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-1.5"
                title="Quick 60-minute temporary occupation"
              >
                Occupy (1h)
              </button>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              Unavailable during this slot
            </span>
            {onReserve && (
              <button
                onClick={() => onReserve(room)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Book other time
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
