import { Router, Response } from 'express';
import { reservationRepo, classroomRepo, timetableRepo, auditLogRepo } from '../models/index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { areIntervalsOverlapping } from '../services/timeUtils.js';

const router = Router();

// GET /api/reservations
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let reservations = await reservationRepo.find();

    // If student: only their own
    if (userRole === 'student') {
      reservations = reservations.filter(r => r.user.id === userId);
    }
    // If lecturer: their own + temporary occupations
    else if (userRole === 'lecturer') {
      const viewAll = req.query.all === 'true';
      if (!viewAll) {
        reservations = reservations.filter(r => r.user.id === userId);
      }
    }
    // If admin: all reservations

    return res.json({ success: true, count: reservations.length, reservations });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/reservations
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { classroom, date, startTime, endTime, purpose, isTemporaryOccupation } = req.body;

    if (!classroom || !date || !startTime || !endTime || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Classroom, date, start time, end time, and purpose are required.',
      });
    }

    const roomNumber = classroom.trim().toUpperCase();

    // 1. Verify classroom exists and is active
    const targetRoom = await classroomRepo.findByRoomNumber(roomNumber);
    if (!targetRoom) {
      return res.status(404).json({ success: false, message: `Classroom ${roomNumber} not found.` });
    }
    if (!targetRoom.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ROOM_INACTIVE',
        message: `Classroom ${roomNumber} is currently marked inactive by administration.`,
      });
    }

    // 2. Check conflict against active Timetable entries
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const activeTimetable = await timetableRepo.findActive();

    const timetableConflict = activeTimetable.find(t => {
      if (t.roomNumber.trim().toUpperCase() !== roomNumber) return false;
      const dayMatches = t.day.toLowerCase() === dayOfWeek.toLowerCase() || t.date === date;
      if (!dayMatches) return false;
      return areIntervalsOverlapping(t.startTime, t.endTime, startTime, endTime);
    });

    if (timetableConflict) {
      return res.status(409).json({
        success: false,
        code: 'ROOM_OCCUPIED',
        message: `Room unavailable. This classroom is already occupied by ${timetableConflict.subject} (${timetableConflict.lecturer}) from ${timetableConflict.startTime} to ${timetableConflict.endTime}.`,
      });
    }

    // 3. Check conflict against existing active reservations
    const existingReservations = await reservationRepo.find(r => r.status === 'active');
    const resConflict = existingReservations.find(r => {
      if (r.classroom.trim().toUpperCase() !== roomNumber) return false;
      if (r.date !== date) return false;
      return areIntervalsOverlapping(r.startTime, r.endTime, startTime, endTime);
    });

    if (resConflict) {
      return res.status(409).json({
        success: false,
        code: 'ROOM_OCCUPIED',
        message: `Room unavailable. This classroom is already reserved by ${resConflict.user.name} from ${resConflict.startTime} to ${resConflict.endTime}.`,
      });
    }

    // 4. Create reservation
    const newReservation = await reservationRepo.create({
      classroom: roomNumber,
      user: {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
      },
      role: req.user!.role,
      date,
      startTime,
      endTime,
      purpose: purpose.trim(),
      status: 'active',
      isTemporaryOccupation: Boolean(isTemporaryOccupation),
    });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: isTemporaryOccupation ? 'OCCUPY_CLASSROOM' : 'CREATE_RESERVATION',
      resource: 'Reservation',
      resourceId: newReservation.id,
      details: { classroom: roomNumber, date, startTime, endTime, purpose },
    });

    return res.status(201).json({
      success: true,
      message: isTemporaryOccupation
        ? `Classroom ${roomNumber} has been temporarily occupied.`
        : `Reservation confirmed for ${roomNumber} on ${date}.`,
      reservation: newReservation,
    });
  } catch (err: any) {
    console.error('Create reservation error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/reservations/occupy (Lecturer quick temporary occupation)
router.post('/occupy', authenticate, requireRole(['lecturer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { classroom, durationMinutes = 60, purpose = 'Ad-hoc Faculty Lecture / Discussion' } = req.body;
    if (!classroom) return res.status(400).json({ success: false, message: 'Classroom is required.' });

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const currentHours = now.getHours();
    const currentMins = now.getMinutes();

    const startMinutes = currentHours * 60 + currentMins;
    const endMinutes = startMinutes + Number(durationMinutes);

    const formatM = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const dh = h % 12 === 0 ? 12 : h % 12;
      return `${dh}:${m < 10 ? '0' + m : m} ${period}`;
    };

    const startTime = formatM(startMinutes);
    const endTime = formatM(endMinutes);

    // Delegate creation
    const roomNumber = classroom.trim().toUpperCase();

    // Conflict check
    const activeReservations = await reservationRepo.find(r => r.status === 'active');
    const conflict = activeReservations.find(r => {
      if (r.classroom.trim().toUpperCase() !== roomNumber) return false;
      if (r.date !== dateStr) return false;
      return areIntervalsOverlapping(r.startTime, r.endTime, startTime, endTime);
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Classroom ${roomNumber} is currently reserved by ${conflict.user.name}.`,
      });
    }

    const newRes = await reservationRepo.create({
      classroom: roomNumber,
      user: {
        id: req.user!.id,
        name: req.user!.name,
        email: req.user!.email,
      },
      role: req.user!.role,
      date: dateStr,
      startTime,
      endTime,
      purpose,
      status: 'active',
      isTemporaryOccupation: true,
    });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'OCCUPY_CLASSROOM',
      resource: 'Classroom',
      resourceId: roomNumber,
      details: { startTime, endTime },
    });

    return res.json({
      success: true,
      message: `You are now occupying ${roomNumber} until ${endTime}.`,
      reservation: newRes,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/reservations/release/:id (Lecturer/Admin release room)
router.post('/release/:id', authenticate, requireRole(['lecturer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const resDoc = await reservationRepo.findById(req.params.id);
    if (!resDoc) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    if (req.user!.role !== 'admin' && resDoc.user.id !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You can only release your own occupied room.' });
    }

    await reservationRepo.updateOne(resDoc.id, { status: 'completed' });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'RELEASE_CLASSROOM',
      resource: 'Reservation',
      resourceId: resDoc.id,
      details: { classroom: resDoc.classroom },
    });

    return res.json({ success: true, message: `Classroom ${resDoc.classroom} has been released.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/reservations/:id (Cancel reservation)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const resDoc = await reservationRepo.findById(req.params.id);
    if (!resDoc) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    // Permissions: owner or admin
    if (req.user!.role !== 'admin' && resDoc.user.id !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own reservation.' });
    }

    await reservationRepo.cancelReservation(resDoc.id);

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'CANCEL_RESERVATION',
      resource: 'Reservation',
      resourceId: resDoc.id,
      details: { classroom: resDoc.classroom, date: resDoc.date },
    });

    return res.json({ success: true, message: 'Reservation cancelled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
