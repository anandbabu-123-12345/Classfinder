import { Schema, model } from 'mongoose';
import { localDb } from '../config/db.js';

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'lecturer' | 'admin';
  phone?: string;
  profileImage?: string;
  isVerified: boolean;
  isActive: boolean;
  studentId?: string;
  lecturerId?: string;
  department?: string;
  designation?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface IClassroom {
  id: string;
  roomNumber: string;
  building: string;
  floor: number | string;
  capacity: number;
  type: 'Classroom' | 'Laboratory' | 'Seminar Hall' | 'Auditorium' | 'Workshop' | 'Computer Lab';
  facilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITimetableEntry {
  id: string;
  academicYear: string;
  semester: string;
  day: string;
  date?: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  subject: string;
  courseCode: string;
  section: string;
  lecturer: string;
  department: string;
  status: 'active' | 'inactive';
  version: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface IReservation {
  id: string;
  classroom: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: 'student' | 'lecturer' | 'admin';
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "10:55 AM"
  purpose: string;
  status: 'active' | 'cancelled' | 'completed';
  isTemporaryOccupation?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IOtp {
  id: string;
  userId: string;
  email: string;
  otpHash: string;
  purpose: 'registration' | 'forgot_password' | 'login';
  expiresAt: number; // timestamp in ms
  attempts: number;
  verified: boolean;
  createdAt: string;
}

export interface IAuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// Mongoose Schemas for Atlas MongoDB when MONGODB_URI is provided
export const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'lecturer', 'admin'], required: true },
  phone: { type: String },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  studentId: { type: String, index: true },
  lecturerId: { type: String, index: true },
  department: { type: String },
  designation: { type: String },
  createdAt: { type: String },
  updatedAt: { type: String },
  lastLogin: { type: String }
}, { timestamps: false });

export const ClassroomSchema = new Schema<IClassroom>({
  id: { type: String, required: true, unique: true },
  roomNumber: { type: String, required: true, unique: true, index: true },
  building: { type: String, required: true },
  floor: { type: Schema.Types.Mixed, required: true },
  capacity: { type: Number, required: true },
  type: { type: String, required: true },
  facilities: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: String },
  updatedAt: { type: String }
});

export const TimetableSchema = new Schema<ITimetableEntry>({
  id: { type: String, required: true, unique: true },
  academicYear: { type: String, required: true, index: true },
  semester: { type: String, required: true },
  day: { type: String, required: true, index: true },
  date: { type: String, index: true },
  startTime: { type: String, required: true, index: true },
  endTime: { type: String, required: true, index: true },
  roomNumber: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  courseCode: { type: String, required: true },
  section: { type: String, required: true },
  lecturer: { type: String, required: true },
  department: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  version: { type: Number, default: 1 },
  uploadedBy: { type: String },
  uploadedAt: { type: String }
});

export const ReservationSchema = new Schema<IReservation>({
  id: { type: String, required: true, unique: true },
  classroom: { type: String, required: true, index: true },
  user: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  role: { type: String, required: true },
  date: { type: String, required: true, index: true },
  startTime: { type: String, required: true, index: true },
  endTime: { type: String, required: true, index: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active', index: true },
  isTemporaryOccupation: { type: Boolean, default: false },
  createdAt: { type: String },
  updatedAt: { type: String }
});

export const OtpSchema = new Schema<IOtp>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, enum: ['registration', 'forgot_password', 'login'], required: true },
  expiresAt: { type: Number, required: true, index: true },
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  createdAt: { type: String }
});

export const AuditLogSchema = new Schema<IAuditLog>({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  userName: { type: String },
  userRole: { type: String },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: String, required: true }
});

// Repositories for unified data access
export const userRepo = {
  find: async (filter?: (u: IUser) => boolean): Promise<IUser[]> => {
    const list = localDb.get('users');
    return filter ? list.filter(filter) : [...list];
  },
  findOne: async (filter: (u: IUser) => boolean): Promise<IUser | null> => {
    const list = localDb.get('users');
    return list.find(filter) || null;
  },
  findById: async (id: string): Promise<IUser | null> => {
    const list = localDb.get('users');
    return list.find(u => u.id === id) || null;
  },
  create: async (data: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<IUser> => {
    const list = localDb.get('users');
    const newUser: IUser = {
      ...data,
      id: data.id || 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newUser);
    localDb.set('users', list);
    return newUser;
  },
  updateOne: async (id: string, update: Partial<IUser>): Promise<IUser | null> => {
    const list = localDb.get('users');
    const idx = list.findIndex(u => u.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...update, updatedAt: new Date().toISOString() };
    localDb.set('users', list);
    return list[idx];
  },
  deleteOne: async (id: string): Promise<boolean> => {
    const list = localDb.get('users');
    const filtered = list.filter(u => u.id !== id);
    const deleted = filtered.length !== list.length;
    localDb.set('users', filtered);
    return deleted;
  }
};

export const classroomRepo = {
  find: async (filter?: (c: IClassroom) => boolean): Promise<IClassroom[]> => {
    const list = localDb.get('classrooms');
    return filter ? list.filter(filter) : [...list];
  },
  findById: async (id: string): Promise<IClassroom | null> => {
    const list = localDb.get('classrooms');
    return list.find(c => c.id === id) || null;
  },
  findByRoomNumber: async (roomNumber: string): Promise<IClassroom | null> => {
    const list = localDb.get('classrooms');
    const normalized = roomNumber.trim().toUpperCase();
    return list.find(c => c.roomNumber.trim().toUpperCase() === normalized) || null;
  },
  create: async (data: Omit<IClassroom, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<IClassroom> => {
    const list = localDb.get('classrooms');
    const newClassroom: IClassroom = {
      ...data,
      id: data.id || 'cls_' + Math.random().toString(36).substring(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newClassroom);
    localDb.set('classrooms', list);
    return newClassroom;
  },
  updateOne: async (id: string, update: Partial<IClassroom>): Promise<IClassroom | null> => {
    const list = localDb.get('classrooms');
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...update, updatedAt: new Date().toISOString() };
    localDb.set('classrooms', list);
    return list[idx];
  },
  deleteOne: async (id: string): Promise<boolean> => {
    const list = localDb.get('classrooms');
    const filtered = list.filter(c => c.id !== id);
    const deleted = filtered.length !== list.length;
    localDb.set('classrooms', filtered);
    return deleted;
  }
};

export const timetableRepo = {
  find: async (filter?: (t: ITimetableEntry) => boolean): Promise<ITimetableEntry[]> => {
    const list = localDb.get('timetables');
    return filter ? list.filter(filter) : [...list];
  },
  findActive: async (): Promise<ITimetableEntry[]> => {
    const list = localDb.get('timetables');
    return list.filter(t => t.status === 'active');
  },
  getMaxVersion: async (): Promise<number> => {
    const list = localDb.get('timetables');
    if (!list.length) return 0;
    return Math.max(...list.map(t => t.version || 1), 0);
  },
  insertMany: async (entries: Omit<ITimetableEntry, 'id'>[]): Promise<ITimetableEntry[]> => {
    const list = localDb.get('timetables');
    const now = new Date().toISOString();
    const created: ITimetableEntry[] = entries.map(e => ({
      ...e,
      id: 'tt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      uploadedAt: e.uploadedAt || now,
    }));
    list.push(...created);
    localDb.set('timetables', list);
    return created;
  },
  deactivateAll: async (): Promise<void> => {
    const list = localDb.get('timetables');
    list.forEach(t => {
      t.status = 'inactive';
    });
    localDb.set('timetables', list);
  },
  deleteByVersion: async (version: number): Promise<number> => {
    const list = localDb.get('timetables');
    const filtered = list.filter(t => t.version !== version);
    const count = list.length - filtered.length;
    localDb.set('timetables', filtered);
    return count;
  },
  deleteAll: async (): Promise<void> => {
    localDb.set('timetables', []);
  }
};

export const reservationRepo = {
  find: async (filter?: (r: IReservation) => boolean): Promise<IReservation[]> => {
    const list = localDb.get('reservations');
    return filter ? list.filter(filter) : [...list];
  },
  findById: async (id: string): Promise<IReservation | null> => {
    const list = localDb.get('reservations');
    return list.find(r => r.id === id) || null;
  },
  create: async (data: Omit<IReservation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<IReservation> => {
    const list = localDb.get('reservations');
    const newRes: IReservation = {
      ...data,
      id: data.id || 'res_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    list.push(newRes);
    localDb.set('reservations', list);
    return newRes;
  },
  updateOne: async (id: string, update: Partial<IReservation>): Promise<IReservation | null> => {
    const list = localDb.get('reservations');
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...update, updatedAt: new Date().toISOString() };
    localDb.set('reservations', list);
    return list[idx];
  },
  cancelReservation: async (id: string): Promise<IReservation | null> => {
    const list = localDb.get('reservations');
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    list[idx].status = 'cancelled';
    list[idx].updatedAt = new Date().toISOString();
    localDb.set('reservations', list);
    return list[idx];
  }
};

export const otpRepo = {
  create: async (data: Omit<IOtp, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<IOtp> => {
    const list = localDb.get('otps');
    // Invalidate prior unverified OTPs for same user and purpose
    const filtered = list.filter(o => !(o.userId === data.userId && o.purpose === data.purpose && !o.verified));
    const newOtp: IOtp = {
      ...data,
      id: data.id || 'otp_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      createdAt: data.createdAt || new Date().toISOString(),
    };
    filtered.push(newOtp);
    localDb.set('otps', filtered);
    return newOtp;
  },
  findLatest: async (userId: string, purpose: string): Promise<IOtp | null> => {
    const list = localDb.get('otps');
    const matches = list.filter(o => o.userId === userId && o.purpose === purpose && !o.verified);
    if (!matches.length) return null;
    return matches[matches.length - 1];
  },
  update: async (id: string, update: Partial<IOtp>): Promise<void> => {
    const list = localDb.get('otps');
    const idx = list.findIndex(o => o.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
      localDb.set('otps', list);
    }
  }
};

export const auditLogRepo = {
  log: async (log: Omit<IAuditLog, 'id' | 'timestamp'>): Promise<IAuditLog> => {
    const list = localDb.get('auditLogs');
    const newLog: IAuditLog = {
      ...log,
      id: 'log_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    list.unshift(newLog); // prepend newest first
    // keep up to 1000 logs
    if (list.length > 1000) {
      list.length = 1000;
    }
    localDb.set('auditLogs', list);
    return newLog;
  },
  find: async (limit: number = 100): Promise<IAuditLog[]> => {
    const list = localDb.get('auditLogs');
    return list.slice(0, limit);
  }
};
