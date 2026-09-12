import React, { useState, useEffect } from 'react';
import {
  Shield,
  UploadCloud,
  FileSpreadsheet,
  Users,
  School,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Trash2,
  RotateCw,
  Search,
  KeyRound,
  Filter,
  Eye,
  Clock,
  Database,
  Lock,
} from 'lucide-react';
import { adminApi, timetableApi, classroomApi, userApi, reservationApi } from '../services/api.js';
import { AdminStats, Classroom, User, Reservation, AuditLog, TimetableEntry } from '../types.js';
import { TimetableUploadModal } from '../components/TimetableUploadModal.js';
import { VacancySearch } from '../components/VacancySearch.js';
import { useNotification } from '../context/NotificationContext.js';

export function AdminDashboard() {
  const { notify } = useNotification();

  // Active section in Admin view
  const [adminTab, setAdminTab] = useState<'overview' | 'timetable' | 'classrooms' | 'users' | 'reservations' | 'audit'>('overview');

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [occupancyByBuilding, setOccupancyByBuilding] = useState<{ building: string; total: number }[]>([]);

  // Timetable
  const [activeTimetable, setActiveTimetable] = useState<{ isActive: boolean; version: number; count: number; entries: TimetableEntry[] }>({
    isActive: false,
    version: 0,
    count: 0,
    entries: [],
  });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [timetableSearch, setTimetableSearch] = useState('');

  // Classrooms
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isAddClassroomModalOpen, setIsAddClassroomModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newBuilding, setNewBuilding] = useState('Main Academic Block');
  const [newFloor, setNewFloor] = useState(1);
  const [newCapacity, setNewCapacity] = useState(50);
  const [newType, setNewType] = useState('Classroom');
  const [newFacilities, setNewFacilities] = useState('Whiteboard, Projector, Wi-Fi');

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Reservations
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Stats
      const statsRes = await adminApi.getStatistics();
      if (statsRes.success) {
        setStats(statsRes.stats);
        setOccupancyByBuilding(statsRes.occupancyByBuilding);
      }

      // 2. Active Timetable
      const ttRes = await timetableApi.getActive();
      if (ttRes.success) {
        setActiveTimetable(ttRes);
      }

      // 3. Classrooms
      const crRes = await classroomApi.getClassrooms();
      if (crRes.success) {
        setClassrooms(crRes.classrooms);
      }

      // 4. Users
      const uRes = await userApi.getUsers();
      if (uRes.success) {
        setUsers(uRes.users);
      }

      // 5. Reservations
      const rRes = await reservationApi.getReservations({ all: true });
      if (rRes.success) {
        setReservations(rRes.reservations);
      }

      // 6. Audit logs
      const logRes = await adminApi.getAuditLogs(50);
      if (logRes.success) {
        setAuditLogs(logRes.logs);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Classroom handlers
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const facilitiesArr = newFacilities.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await classroomApi.createClassroom({
        roomNumber: newRoomNumber.toUpperCase().trim(),
        building: newBuilding,
        floor: newFloor,
        capacity: newCapacity,
        type: newType as any,
        facilities: facilitiesArr,
      });

      if (res.success) {
        notify('success', `Classroom ${newRoomNumber} added.`, 'Classroom Created');
        setIsAddClassroomModalOpen(false);
        setNewRoomNumber('');
        fetchDashboardData();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to create classroom.');
    }
  };

  const handleDeleteClassroom = async (id: string, roomNum: string) => {
    if (!confirm(`Are you sure you want to remove Classroom ${roomNum}?`)) return;
    try {
      const res = await classroomApi.deleteClassroom(id);
      if (res.success) {
        notify('info', `Classroom ${roomNum} deleted.`, 'Deleted');
        fetchDashboardData();
      }
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleToggleClassroomStatus = async (room: Classroom) => {
    try {
      await classroomApi.updateClassroom(room.id, { isActive: !room.isActive });
      notify('info', `Classroom ${room.roomNumber} status toggled.`, 'Updated');
      fetchDashboardData();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // User handlers
  const handleResetPassword = async (u: User) => {
    if (!confirm(`Reset temporary password for ${u.name}?`)) return;
    try {
      const res = await userApi.resetUserPassword(u.id);
      if (res.success) {
        notify('success', res.message, 'Password Reset');
      }
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!confirm(`Delete user account ${u.name} (${u.email})?`)) return;
    try {
      const res = await userApi.deleteUser(u.id);
      if (res.success) {
        notify('info', 'User deleted.', 'User Removed');
        fetchDashboardData();
      }
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Timetable Deactivate
  const handleDeactivateAllTimetables = async () => {
    if (!confirm('Deactivate all active timetables? Classroom availability will become unavailable until a timetable is published.')) return;
    try {
      const res = await timetableApi.deactivateAll();
      if (res.success) {
        notify('warning', res.message, 'Timetables Deactivated');
        fetchDashboardData();
      }
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Cancel reservation
  const handleCancelReservation = async (id: string) => {
    if (!confirm('Cancel this active reservation?')) return;
    try {
      const res = await reservationApi.cancelReservation(id);
      if (res.success) {
        notify('info', 'Reservation cancelled by administrator.', 'Cancelled');
        fetchDashboardData();
      }
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  // Filtered timetable entries
  const filteredTimetableEntries = activeTimetable.entries.filter(
    (e) =>
      e.roomNumber.toLowerCase().includes(timetableSearch.toLowerCase()) ||
      e.subject.toLowerCase().includes(timetableSearch.toLowerCase()) ||
      e.lecturer.toLowerCase().includes(timetableSearch.toLowerCase()) ||
      e.courseCode.toLowerCase().includes(timetableSearch.toLowerCase())
  );

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.studentId && u.studentId.toLowerCase().includes(q)) ||
        (u.lecturerId && u.lecturerId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-2xl shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">University Administration Portal</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time timetable lifecycle, classroom registry, RBAC user directory, and audit logs.
            </p>
          </div>
        </div>

        {/* Quick Timetable Upload button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Official Timetable
          </button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Total Students</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.totalStudents ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Total Lecturers</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.totalLecturers ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-slate-400">Classrooms</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.totalClassrooms ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-emerald-400">Available Now</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.availableNow ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-rose-400">Occupied Now</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats?.occupiedNow ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="text-xs text-indigo-400">Active Bookings</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{stats?.activeReservations ?? 0}</div>
        </div>
      </div>

      {/* Admin Navigation Pills */}
      <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1">
        {[
          { id: 'overview', label: 'Vacancy Live Search', icon: Eye },
          { id: 'timetable', label: 'Official Timetable', icon: FileSpreadsheet },
          { id: 'classrooms', label: 'Classrooms Directory', icon: School },
          { id: 'users', label: 'User Directory', icon: Users },
          { id: 'reservations', label: 'All Reservations', icon: Calendar },
          { id: 'audit', label: 'Audit Trail', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: VACANCY SEARCH OVERVIEW */}
      {adminTab === 'overview' && (
        <VacancySearch onOpenUploadModal={() => setIsUploadModalOpen(true)} />
      )}

      {/* TAB 2: TIMETABLE MANAGEMENT */}
      {adminTab === 'timetable' && (
        <div className="space-y-6">
          {/* Active Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-400">Current Timetable State:</span>
                {activeTimetable.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active (Version {activeTimetable.version})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Inactive / No Timetable Published
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeTimetable.count} active class slot schedules currently governing room vacancy.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload New Version
              </button>

              {activeTimetable.isActive && (
                <button
                  onClick={handleDeactivateAllTimetables}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Deactivate All Timetables
                </button>
              )}
            </div>
          </div>

          {/* Active Timetable Entries Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-base">Active Timetable Entries</h3>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by room, course, faculty..."
                  value={timetableSearch}
                  onChange={(e) => setTimetableSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Time Interval</th>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Lecturer</th>
                    <th className="py-3 px-4">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredTimetableEntries.slice(0, 20).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white font-mono">{entry.roomNumber}</td>
                      <td className="py-3 px-4 font-medium">{entry.day}</td>
                      <td className="py-3 px-4 text-indigo-300 font-mono">
                        {entry.startTime} - {entry.endTime}
                      </td>
                      <td className="py-3 px-4 font-mono">{entry.courseCode}</td>
                      <td className="py-3 px-4 font-medium text-white">{entry.subject}</td>
                      <td className="py-3 px-4">{entry.section}</td>
                      <td className="py-3 px-4 text-slate-200">{entry.lecturer}</td>
                      <td className="py-3 px-4 text-slate-400">{entry.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTimetableEntries.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                No entries found. Click "Upload Official Timetable" to populate data.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLASSROOMS DIRECTORY */}
      {adminTab === 'classrooms' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Classrooms Registry</h3>
              <p className="text-xs text-slate-400">Manage all registered physical lecture spaces on campus.</p>
            </div>
            <button
              onClick={() => setIsAddClassroomModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Classroom
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Room Number</th>
                  <th className="py-3 px-4">Building</th>
                  <th className="py-3 px-4">Floor</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Facilities</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {classrooms.map((cr) => (
                  <tr key={cr.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white font-mono">{cr.roomNumber}</td>
                    <td className="py-3 px-4">{cr.building}</td>
                    <td className="py-3 px-4">{cr.floor}</td>
                    <td className="py-3 px-4 font-semibold">{cr.capacity} seats</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                        {cr.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">
                      {cr.facilities.join(', ')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleClassroomStatus(cr)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cr.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {cr.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteClassroom(cr.id, cr.roomNumber)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Delete Classroom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">User Directory & Role-Based Access</h3>
              <p className="text-xs text-slate-400">Total {users.length} registered campus users.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="lecturer">Lecturers / Faculty</option>
                <option value="admin">Administrators</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Institutional ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : u.role === 'lecturer'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {u.studentId || u.lecturerId || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.department || '—'}</td>
                    <td className="py-3 px-4">
                      {u.isVerified ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium">Pending OTP</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 rounded-lg transition-colors"
                          title="Reset Password to Temporary"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ALL RESERVATIONS */}
      {adminTab === 'reservations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base">Campus Classroom Reservations</h3>
            <p className="text-xs text-slate-400">All bookings across student and faculty sessions.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Room</th>
                  <th className="py-3 px-4">Reserved By</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Interval</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white font-mono">{r.classroom}</td>
                    <td className="py-3 px-4 font-medium">{r.user.name}</td>
                    <td className="py-3 px-4 capitalize">{r.role}</td>
                    <td className="py-3 px-4 text-slate-300">{r.date}</td>
                    <td className="py-3 px-4 font-mono text-indigo-300">
                      {r.startTime} - {r.endTime}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate">{r.purpose}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          r.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'active' && (
                        <button
                          onClick={() => handleCancelReservation(r.id)}
                          className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reservations.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No reservations recorded in the database.
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {adminTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base">Administrative Audit Trail</h3>
            <p className="text-xs text-slate-400">Immutable security logs of institutional system actions.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white font-sans text-xs">
                      {log.userName || 'System'}
                    </td>
                    <td className="py-2.5 px-4 capitalize font-sans text-xs">{log.userRole || 'System'}</td>
                    <td className="py-2.5 px-4 text-indigo-300 font-semibold">{log.action}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">{log.resource}</td>
                    <td className="py-2.5 px-4 text-slate-400 max-w-[250px] truncate font-sans text-xs">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Classroom Modal */}
      {isAddClassroomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Add Physical Classroom</h3>
            <form onSubmit={handleCreateClassroom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C-301 or LAB-105"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Campus Building</label>
                <select
                  value={newBuilding}
                  onChange={(e) => setNewBuilding(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="Main Academic Block">Main Academic Block</option>
                  <option value="Engineering Wing">Engineering Wing</option>
                  <option value="Technology Complex">Technology Complex</option>
                  <option value="University Center">University Center</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Floor</label>
                  <input
                    type="number"
                    value={newFloor}
                    onChange={(e) => setNewFloor(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Capacity (Seats)</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Classroom Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="Classroom">Classroom</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Seminar Hall">Seminar Hall</option>
                  <option value="Auditorium">Auditorium</option>
                  <option value="Computer Lab">Computer Lab</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Facilities (Comma Separated)</label>
                <input
                  type="text"
                  value={newFacilities}
                  onChange={(e) => setNewFacilities(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassroomModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timetable Upload Modal */}
      <TimetableUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
}
