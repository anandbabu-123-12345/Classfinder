export type UserRole = 'student' | 'lecturer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

export type RoomType = 'Classroom' | 'Laboratory' | 'Seminar Hall' | 'Auditorium' | 'Workshop' | 'Computer Lab';

export interface Classroom {
  id: string;
  roomNumber: string;
  building: string;
  floor: number | string;
  capacity: number;
  type: RoomType;
  facilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntry {
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

export interface Reservation {
  id: string;
  classroom: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: UserRole;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'active' | 'cancelled' | 'completed';
  isTemporaryOccupation?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OccupiedRoomInfo {
  classroom: Classroom;
  reason: 'timetable' | 'reservation' | 'lecturer_occupation';
  details: {
    subject?: string;
    courseCode?: string;
    section?: string;
    lecturer?: string;
    department?: string;
    reservedBy?: string;
    reservedRole?: string;
    purpose?: string;
    startTime: string;
    endTime: string;
    dateOrDay: string;
  };
}

export interface VacancyResult {
  isTimetableActive: boolean;
  message?: string;
  query: {
    academicYear: string;
    day: string;
    date?: string;
    startTime: string;
    endTime: string;
    building?: string;
    roomType?: string;
  };
  totalActiveRooms: number;
  availableRooms: Classroom[];
  occupiedRooms: OccupiedRoomInfo[];
  stats: {
    totalRooms: number;
    availableCount: number;
    occupiedCount: number;
    occupancyRate: number;
  };
}

export interface ParseAnalysis {
  filename: string;
  totalRowsDetected: number;
  roomsDetectedCount: number;
  roomsDetectedList: string[];
  timeSlotsCount: number;
  timeSlotsList: string[];
  daysCount: number;
  daysList: string[];
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  validRows: Partial<TimetableEntry>[];
  invalidRows: { rowNumber: number; rowData: any; reason: string }[];
  duplicateRows: { rowNumber: number; rowData: any; reason: string }[];
}

export interface AuditLog {
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

export interface AdminStats {
  totalStudents: number;
  totalLecturers: number;
  totalClassrooms: number;
  availableNow: number;
  occupiedNow: number;
  activeReservations: number;
  hasLiveTimetable: boolean;
  activeTimetableEntries: number;
  activeVersion: number;
}
