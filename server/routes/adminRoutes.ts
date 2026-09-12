import { Router, Response } from 'express';
import { userRepo, classroomRepo, timetableRepo, reservationRepo, auditLogRepo } from '../models/index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { vacancyEngine } from '../services/vacancyEngine.js';
import { seedInitialData } from '../services/seedData.js';

const router = Router();

// GET /api/admin/statistics
router.get('/statistics', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await userRepo.find();
    const students = users.filter(u => u.role === 'student');
    const lecturers = users.filter(u => u.role === 'lecturer');
    const classrooms = await classroomRepo.find(c => c.isActive);
    const reservations = await reservationRepo.find(r => r.status === 'active');
    const activeTimetable = await timetableRepo.findActive();

    // Calculate current day and time vacancy
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const formatT = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const dh = h % 12 === 0 ? 12 : h % 12;
      return `${dh}:${m < 10 ? '0' + m : m} ${period}`;
    };

    const startTime = formatT(currentH, currentM);
    const endTime = formatT((currentH + 1) % 24, currentM);

    let availableNow = 0;
    let occupiedNow = 0;
    let hasLiveTimetable = activeTimetable.length > 0;

    if (hasLiveTimetable) {
      const vacancy = await vacancyEngine.calculateVacancy({
        academicYear: '2026-27',
        day: dayOfWeek,
        startTime,
        endTime,
      });
      availableNow = vacancy.stats.availableCount;
      occupiedNow = vacancy.stats.occupiedCount;
    }

    // Occupancy by Building
    const buildingMap: Record<string, { total: number; occupied: number }> = {};
    classrooms.forEach(c => {
      if (!buildingMap[c.building]) buildingMap[c.building] = { total: 0, occupied: 0 };
      buildingMap[c.building].total++;
    });

    // Reservations by date
    const dateMap: Record<string, number> = {};
    const allReservations = await reservationRepo.find();
    allReservations.forEach(r => {
      dateMap[r.date] = (dateMap[r.date] || 0) + 1;
    });

    const dailyReservations = Object.keys(dateMap).slice(-7).map(date => ({
      date,
      count: dateMap[date],
    }));

    return res.json({
      success: true,
      stats: {
        totalStudents: students.length,
        totalLecturers: lecturers.length,
        totalClassrooms: classrooms.length,
        availableNow,
        occupiedNow,
        activeReservations: reservations.length,
        hasLiveTimetable,
        activeTimetableEntries: activeTimetable.length,
        activeVersion: activeTimetable.length > 0 ? activeTimetable[0].version : 0,
      },
      occupancyByBuilding: Object.keys(buildingMap).map(name => ({
        building: name,
        total: buildingMap[name].total,
      })),
      dailyReservations,
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = await auditLogRepo.find(limit);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/seed (Reseed database)
router.post('/seed', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    await seedInitialData(true);
    return res.json({ success: true, message: 'Database reseeded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
