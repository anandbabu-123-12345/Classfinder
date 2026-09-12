import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Clock,
  Building,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UploadCloud,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { vacancyApi } from '../services/api.js';
import { VacancyResult, Classroom } from '../types.js';
import { RoomCard } from './RoomCard.js';
import { useAuth } from '../context/AuthContext.js';

interface VacancySearchProps {
  onOpenUploadModal?: () => void;
  onOpenReserveModal?: (room: Classroom) => void;
  onQuickOccupy?: (room: Classroom) => void;
}

export function VacancySearch({
  onOpenUploadModal,
  onOpenReserveModal,
  onQuickOccupy,
}: VacancySearchProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Search parameters
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [day, setDay] = useState('Monday');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 10:55 AM');
  const [customStartTime, setCustomStartTime] = useState('10:00 AM');
  const [customEndTime, setCustomEndTime] = useState('10:55 AM');
  const [building, setBuilding] = useState('All');
  const [roomType, setRoomType] = useState('All');
  const [filterView, setFilterView] = useState<'all' | 'available' | 'occupied'>('all');
  const [minCapacity, setMinCapacity] = useState<number>(0);

  // Results
  const [results, setResults] = useState<VacancyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const standardTimeSlots = [
    '09:00 AM - 09:55 AM',
    '10:00 AM - 10:55 AM',
    '11:00 AM - 11:55 AM',
    '01:00 PM - 01:55 PM',
    '02:00 PM - 02:55 PM',
    '03:00 PM - 03:55 PM',
    '04:00 PM - 04:55 PM',
    'Custom Time',
  ];

  const handleSearch = async () => {
    setIsLoading(true);
    setErrorMsg('');

    let startTime = '10:00 AM';
    let endTime = '10:55 AM';

    if (selectedSlot !== 'Custom Time') {
      const parts = selectedSlot.split(' - ');
      startTime = parts[0];
      endTime = parts[1];
    } else {
      startTime = customStartTime;
      endTime = customEndTime;
    }

    try {
      const data = await vacancyApi.getVacancy({
        academicYear,
        day,
        startTime,
        endTime,
        building: building !== 'All' ? building : undefined,
        roomType: roomType !== 'All' ? roomType : undefined,
      });

      if (data.success) {
        setResults(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching classroom vacancies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  // Filter classrooms by capacity and view filter
  const displayedAvailable = results?.availableRooms.filter((r) => r.capacity >= minCapacity) || [];
  const displayedOccupied =
    results?.occupiedRooms.filter((item) => item.classroom.capacity >= minCapacity) || [];

  return (
    <div className="space-y-6">
      {/* Search Header Banner & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Find Empty Classrooms</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time availability calculated from the official published timetable & active faculty reservations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Vacancy
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Day */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Day of Week
            </label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
            </select>
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Time Slot
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
            >
              {standardTimeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Building */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              Building
            </label>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="All">All Campus Buildings</option>
              <option value="Main Academic Block">Main Academic Block</option>
              <option value="Engineering Wing">Engineering Wing</option>
              <option value="Technology Complex">Technology Complex</option>
              <option value="University Center">University Center</option>
            </select>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Classroom Type
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="All">All Room Types</option>
              <option value="Classroom">Classroom</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Seminar Hall">Seminar Hall</option>
              <option value="Auditorium">Auditorium</option>
              <option value="Computer Lab">Computer Lab</option>
            </select>
          </div>
        </div>

        {/* Custom time slots if selected */}
        {selectedSlot === 'Custom Time' && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Time</label>
              <input
                type="text"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">End Time</label>
              <input
                type="text"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                placeholder="e.g. 11:30 AM"
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* Minimum capacity & Execute button */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Min Capacity:</span>
            <div className="flex items-center gap-1.5">
              {[0, 30, 60, 100].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setMinCapacity(cap)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    minCapacity === cap
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cap === 0 ? 'Any' : `${cap}+`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="py-2.5 px-6 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Find Available Classrooms
          </button>
        </div>
      </div>

      {/* No Active Timetable Banner */}
      {results && !results.isTimetableActive && (
        <div className="p-6 rounded-3xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-100 text-base">No Timetable has been published</h3>
              <p className="text-xs sm:text-sm text-amber-300/90 mt-0.5">
                Classroom availability is temporarily unavailable. The administration official timetable must be uploaded and published for vacancy detection to function.
              </p>
            </div>
          </div>

          {isAdmin && onOpenUploadModal && (
            <button
              onClick={onOpenUploadModal}
              className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-2 shadow-md"
            >
              <UploadCloud className="w-4 h-4" />
              Upload & Publish Timetable
            </button>
          )}
        </div>
      )}

      {/* Statistics & Overview Bar if Timetable is Active */}
      {results && results.isTimetableActive && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-slate-400">Total Rooms</div>
              <div className="text-2xl font-bold text-white">{results.stats.totalRooms}</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Available Rooms
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {results.stats.availableCount}
                <span className="text-xs font-normal text-emerald-400/80 ml-1.5">
                  ({Math.round((results.stats.availableCount / (results.stats.totalRooms || 1)) * 100)}%)
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Occupied Rooms
              </div>
              <div className="text-2xl font-bold text-rose-400">
                {results.stats.occupiedCount}
                <span className="text-xs font-normal text-rose-400/80 ml-1.5">
                  ({results.stats.occupancyRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* View Filter Tabs */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setFilterView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterView === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Rooms ({results.stats.totalRooms})
            </button>
            <button
              onClick={() => setFilterView('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterView === 'available'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              Available ({results.stats.availableCount})
            </button>
            <button
              onClick={() => setFilterView('occupied')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterView === 'occupied'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              Occupied ({results.stats.occupiedCount})
            </button>
          </div>
        </div>
      )}

      {/* Classroom Cards Grid */}
      {results && results.isTimetableActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Available Rooms */}
          {(filterView === 'all' || filterView === 'available') &&
            displayedAvailable.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isAvailable={true}
                onReserve={onOpenReserveModal}
                onQuickOccupy={onQuickOccupy}
              />
            ))}

          {/* Occupied Rooms */}
          {(filterView === 'all' || filterView === 'occupied') &&
            displayedOccupied.map((item) => (
              <RoomCard
                key={item.classroom.id}
                room={item.classroom}
                isAvailable={false}
                occupiedInfo={item}
                onReserve={onOpenReserveModal}
              />
            ))}
        </div>
      )}

      {/* Empty State */}
      {results && results.isTimetableActive && displayedAvailable.length === 0 && displayedOccupied.length === 0 && (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Filter className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <h3 className="text-base font-semibold text-white">No classrooms match your criteria</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting the building, type, or capacity filters.</p>
        </div>
      )}
    </div>
  );
}
