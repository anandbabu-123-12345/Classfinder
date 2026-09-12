import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Search, Filter, BookOpen, User as UserIcon, School } from 'lucide-react';
import { timetableApi } from '../services/api.js';
import { TimetableEntry } from '../types.js';

export function TimetableView() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [activeVersion, setActiveVersion] = useState<number>(0);
  const [isLive, setIsLive] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimetable = async () => {
    setIsLoading(true);
    try {
      const res = await timetableApi.getActive();
      if (res.success) {
        setIsLive(res.isActive);
        setActiveVersion(res.version);
        setEntries(res.entries);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const filteredEntries = entries.filter((e) => {
    if (e.day.toLowerCase() !== selectedDay.toLowerCase()) return false;
    if (departmentFilter !== 'All' && e.department !== departmentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.roomNumber.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.courseCode.toLowerCase().includes(q) ||
        e.lecturer.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const departments = ['All', ...Array.from(new Set(entries.map((e) => e.department).filter(Boolean)))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            University Official Timetable
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse published lecture schedules, allocated physical classrooms, and faculty hours.
          </p>
        </div>

        {isLive ? (
          <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            Active Dataset • Version {activeVersion}
          </span>
        ) : (
          <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            No Published Timetable
          </span>
        )}
      </div>

      {/* Controls & Day Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Day Pills */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-800">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                selectedDay === d
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room, course, faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Timetable Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-semibold">
                  {entry.courseCode}
                </span>
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {entry.startTime} - {entry.endTime}
                </span>
              </div>

              <h3 className="font-bold text-white text-sm">{entry.subject}</h3>
              <p className="text-xs text-slate-400 mt-1">Section: {entry.section}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                <MapPin className="w-3.5 h-3.5" />
                Room {entry.roomNumber}
              </span>
              <span className="text-slate-300 truncate max-w-[140px]">{entry.lecturer}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800">
          <Calendar className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <h3 className="text-base font-semibold text-white">No classes scheduled for {selectedDay}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {isLive ? 'No sessions mapped to your current filter.' : 'Upload official timetable to view schedule.'}
          </p>
        </div>
      )}
    </div>
  );
}
