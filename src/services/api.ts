import axios from 'axios';
import {
  User,
  Classroom,
  TimetableEntry,
  Reservation,
  VacancyResult,
  ParseAnalysis,
  AuditLog,
  AdminStats,
} from '../types.js';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('university_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for clear error message extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.message || error.message || 'Network request failed';
    return Promise.reject(new Error(customMessage));
  }
);

export const authApi = {
  login: async (credentials: { email: string; password: string; role?: string }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: any) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  sendOtp: async (data: { userId?: string; email?: string; purpose?: string }) => {
    const res = await api.post('/auth/send-otp', data);
    return res.data;
  },
  verifyOtp: async (data: { userId: string; enteredOtp: string; purpose?: string }) => {
    const res = await api.post('/auth/verify-otp', data);
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (data: { userId: string; enteredOtp: string; newPassword: string; confirmPassword: string }) => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },
  getDevMailbox: async (email?: string) => {
    const res = await api.get('/auth/dev-mailbox', { params: { email } });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
  },
};

export const userApi = {
  getMe: async (): Promise<{ success: boolean; user: User }> => {
    const res = await api.get('/users/me');
    return res.data;
  },
  updateMe: async (updates: Partial<User>): Promise<{ success: boolean; message: string; user: User }> => {
    const res = await api.put('/users/me', updates);
    return res.data;
  },
  changePassword: async (passwords: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const res = await api.put('/users/me/password', passwords);
    return res.data;
  },
  getUsers: async (params?: { role?: string; search?: string }): Promise<{ success: boolean; users: User[] }> => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  updateUser: async (id: string, updates: Partial<User>) => {
    const res = await api.put(`/users/${id}`, updates);
    return res.data;
  },
  resetUserPassword: async (id: string) => {
    const res = await api.post(`/users/${id}/reset`);
    return res.data;
  },
  deleteUser: async (id: string) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

export const classroomApi = {
  getClassrooms: async (params?: { building?: string; type?: string }): Promise<{ success: boolean; classrooms: Classroom[] }> => {
    const res = await api.get('/classrooms', { params });
    return res.data;
  },
  getClassroom: async (id: string): Promise<{ success: boolean; classroom: Classroom }> => {
    const res = await api.get(`/classrooms/${id}`);
    return res.data;
  },
  createClassroom: async (data: Partial<Classroom>) => {
    const res = await api.post('/classrooms', data);
    return res.data;
  },
  updateClassroom: async (id: string, updates: Partial<Classroom>) => {
    const res = await api.put(`/classrooms/${id}`, updates);
    return res.data;
  },
  deleteClassroom: async (id: string) => {
    const res = await api.delete(`/classrooms/${id}`);
    return res.data;
  },
};

export const timetableApi = {
  uploadFile: async (file: File): Promise<{ success: boolean; message: string; analysis: ParseAnalysis }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/timetable/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  autoUploadSample: async (): Promise<{ success: boolean; message: string; analysis: ParseAnalysis; version: number }> => {
    const res = await api.post('/timetable/auto-upload-sample');
    return res.data;
  },
  publish: async (analysis?: ParseAnalysis): Promise<{ success: boolean; message: string; version: number; entriesCount: number }> => {
    const res = await api.post('/timetable/publish', { analysis });
    return res.data;
  },
  getActive: async (): Promise<{ success: boolean; isActive: boolean; version: number; count: number; entries: TimetableEntry[] }> => {
    const res = await api.get('/timetable/active');
    return res.data;
  },
  getAll: async (): Promise<{ success: boolean; count: number; entries: TimetableEntry[] }> => {
    const res = await api.get('/timetable');
    return res.data;
  },
  deleteVersion: async (version: number) => {
    const res = await api.delete(`/timetable/${version}`);
    return res.data;
  },
  deactivateAll: async () => {
    const res = await api.delete('/timetable');
    return res.data;
  },
};

export const vacancyApi = {
  getVacancy: async (params: {
    academicYear?: string;
    day?: string;
    date?: string;
    startTime: string;
    endTime: string;
    building?: string;
    roomType?: string;
  }): Promise<{ success: boolean } & VacancyResult> => {
    const res = await api.get('/vacancy', { params });
    return res.data;
  },
  getStatus: async (): Promise<{ success: boolean; isTimetableActive: boolean; message: string }> => {
    const res = await api.get('/vacancy/status');
    return res.data;
  },
};

export const reservationApi = {
  getReservations: async (params?: { all?: boolean }): Promise<{ success: boolean; count: number; reservations: Reservation[] }> => {
    const res = await api.get('/reservations', { params });
    return res.data;
  },
  createReservation: async (data: {
    classroom: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
  }): Promise<{ success: boolean; message: string; reservation: Reservation }> => {
    const res = await api.post('/reservations', data);
    return res.data;
  },
  occupyClassroom: async (data: { classroom: string; durationMinutes?: number; purpose?: string }) => {
    const res = await api.post('/reservations/occupy', data);
    return res.data;
  },
  releaseClassroom: async (id: string) => {
    const res = await api.post(`/reservations/release/${id}`);
    return res.data;
  },
  cancelReservation: async (id: string) => {
    const res = await api.delete(`/reservations/${id}`);
    return res.data;
  },
};

export const adminApi = {
  getStatistics: async (): Promise<{
    success: boolean;
    stats: AdminStats;
    occupancyByBuilding: { building: string; total: number }[];
    dailyReservations: { date: string; count: number }[];
  }> => {
    const res = await api.get('/admin/statistics');
    return res.data;
  },
  getAuditLogs: async (limit: number = 100): Promise<{ success: boolean; count: number; logs: AuditLog[] }> => {
    const res = await api.get('/admin/audit-logs', { params: { limit } });
    return res.data;
  },
  seedDatabase: async () => {
    const res = await api.post('/admin/seed');
    return res.data;
  },
};

export default api;
