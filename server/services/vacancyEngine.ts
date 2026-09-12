import { classroomRepo, timetableRepo, reservationRepo, IClassroom, ITimetableEntry, IReservation } from '../models/index.js';
import { areIntervalsOverlapping } from './timeUtils.js';

export interface OccupiedRoomInfo {
  classroom: IClassroom;
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
  availableRooms: IClassroom[];
  occupiedRooms: OccupiedRoomInfo[];
  stats: {
    totalRooms: number;
    availableCount: number;
    occupiedCount: number;
    occupancyRate: number;
  };
}

export const vacancyEngine = {
  /**
   * Check if any active timetable is published
   */
  hasActiveTimetable: async (): Promise<boolean> => {
    const activeEntries = await timetableRepo.findActive();
    return activeEntries.length > 0;
  },

  /**
   * Calculate classroom availability dynamically from MongoDB/Repository
   */
  calculateVacancy: async (params: {
    academicYear: string;
    day: string;
    date?: string;
    startTime: string;
    endTime: string;
    building?: string;
    roomType?: string;
  }): Promise<VacancyResult> => {
    const { academicYear, day, date, startTime, endTime, building, roomType } = params;

    // Critical rule check: Has an official timetable been published?
    const activeTimetable = await timetableRepo.findActive();
    if (activeTimetable.length === 0) {
      return {
        isTimetableActive: false,
        message: 'No timetable has been published. Upload and publish the administration timetable to view classroom availability.',
        query: { academicYear, day, date, startTime, endTime, building, roomType },
        totalActiveRooms: 0,
        availableRooms: [],
        occupiedRooms: [],
        stats: {
          totalRooms: 0,
          availableCount: 0,
          occupiedCount: 0,
          occupancyRate: 0,
        },
      };
    }

    // 1. Fetch all active classrooms from database
    let allClassrooms = await classroomRepo.find(c => c.isActive);

    // Apply building or room type filters if provided
    if (building && building !== 'All' && building !== 'ALL') {
      allClassrooms = allClassrooms.filter(c => c.building.toLowerCase() === building.toLowerCase());
    }
    if (roomType && roomType !== 'All' && roomType !== 'ALL') {
      allClassrooms = allClassrooms.filter(c => c.type.toLowerCase() === roomType.toLowerCase());
    }

    // 2. Fetch timetable slots that overlap with requested time & day/date/academicYear
    const overlappingTimetable = activeTimetable.filter(t => {
      // Academic year match (or fallback if wildcard)
      if (academicYear && t.academicYear && t.academicYear !== academicYear) {
        return false;
      }
      // Day match
      const dayMatches = !day || t.day.toLowerCase() === day.toLowerCase();
      const dateMatches = !date || !t.date || t.date === date;
      if (!dayMatches && !dateMatches) return false;

      // Interval overlap check: existingStart < requestedEnd && existingEnd > requestedStart
      return areIntervalsOverlapping(t.startTime, t.endTime, startTime, endTime);
    });

    // 3. Fetch active reservations that overlap
    const activeReservations = await reservationRepo.find(r => {
      if (r.status !== 'active') return false;
      // Date match
      if (date && r.date && r.date !== date) return false;
      // Interval overlap check
      return areIntervalsOverlapping(r.startTime, r.endTime, startTime, endTime);
    });

    const occupiedRoomsMap = new Map<string, OccupiedRoomInfo>();

    // Mark rooms occupied by Timetable
    overlappingTimetable.forEach(t => {
      const roomNumKey = t.roomNumber.trim().toUpperCase();
      const classroom = allClassrooms.find(c => c.roomNumber.trim().toUpperCase() === roomNumKey);
      if (classroom) {
        occupiedRoomsMap.set(roomNumKey, {
          classroom,
          reason: 'timetable',
          details: {
            subject: t.subject,
            courseCode: t.courseCode,
            section: t.section,
            lecturer: t.lecturer,
            department: t.department,
            startTime: t.startTime,
            endTime: t.endTime,
            dateOrDay: t.day || t.date || day,
          }
        });
      }
    });

    // Mark rooms occupied by Reservations / Lecturer Occupations
    activeReservations.forEach(r => {
      const roomNumKey = r.classroom.trim().toUpperCase();
      const classroom = allClassrooms.find(c => c.roomNumber.trim().toUpperCase() === roomNumKey);
      if (classroom && !occupiedRoomsMap.has(roomNumKey)) {
        occupiedRoomsMap.set(roomNumKey, {
          classroom,
          reason: r.isTemporaryOccupation ? 'lecturer_occupation' : 'reservation',
          details: {
            reservedBy: r.user.name,
            reservedRole: r.role,
            purpose: r.purpose,
            startTime: r.startTime,
            endTime: r.endTime,
            dateOrDay: r.date,
          }
        });
      }
    });

    // 4. Calculate available rooms: All Active Rooms - Occupied Rooms
    const availableRooms: IClassroom[] = [];
    const occupiedRooms: OccupiedRoomInfo[] = [];

    allClassrooms.forEach(c => {
      const key = c.roomNumber.trim().toUpperCase();
      if (occupiedRoomsMap.has(key)) {
        occupiedRooms.push(occupiedRoomsMap.get(key)!);
      } else {
        availableRooms.push(c);
      }
    });

    const totalRooms = allClassrooms.length;
    const availableCount = availableRooms.length;
    const occupiedCount = occupiedRooms.length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

    return {
      isTimetableActive: true,
      query: { academicYear, day, date, startTime, endTime, building, roomType },
      totalActiveRooms: totalRooms,
      availableRooms,
      occupiedRooms,
      stats: {
        totalRooms,
        availableCount,
        occupiedCount,
        occupancyRate,
      },
    };
  }
};
