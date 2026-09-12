import { Router, Request, Response } from 'express';
import { classroomRepo, auditLogRepo } from '../models/index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/classrooms (Public or authenticated)
router.get('/', async (req: Request, res: Response) => {
  try {
    const building = req.query.building as string;
    const type = req.query.type as string;

    let list = await classroomRepo.find(c => c.isActive);

    if (building && building !== 'All' && building !== 'ALL') {
      list = list.filter(c => c.building.toLowerCase() === building.toLowerCase());
    }
    if (type && type !== 'All' && type !== 'ALL') {
      list = list.filter(c => c.type.toLowerCase() === type.toLowerCase());
    }

    return res.json({ success: true, count: list.length, classrooms: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/classrooms/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const classroom = await classroomRepo.findById(req.params.id);
    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found.' });
    return res.json({ success: true, classroom });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/classrooms (Admin only)
router.post('/', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { roomNumber, building, floor, capacity, type, facilities } = req.body;

    if (!roomNumber || !building || !capacity || !type) {
      return res.status(400).json({
        success: false,
        message: 'Room number, building, capacity, and type are required.',
      });
    }

    const existing = await classroomRepo.findByRoomNumber(roomNumber);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Classroom ${roomNumber} already exists in ${existing.building}.`,
      });
    }

    const created = await classroomRepo.create({
      roomNumber: roomNumber.trim().toUpperCase(),
      building: building.trim(),
      floor: floor || 1,
      capacity: Number(capacity),
      type,
      facilities: Array.isArray(facilities) ? facilities : facilities ? [facilities] : ['Whiteboard', 'Wi-Fi'],
      isActive: true,
    });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'CREATE_CLASSROOM',
      resource: 'Classroom',
      resourceId: created.id,
      details: { roomNumber: created.roomNumber, building: created.building },
    });

    return res.status(201).json({ success: true, message: 'Classroom added successfully.', classroom: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/classrooms/:id (Admin only)
router.put('/:id', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { roomNumber, building, floor, capacity, type, facilities, isActive } = req.body;
    const existing = await classroomRepo.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Classroom not found.' });

    const updates: any = {};
    if (roomNumber) updates.roomNumber = roomNumber.trim().toUpperCase();
    if (building) updates.building = building.trim();
    if (floor !== undefined) updates.floor = floor;
    if (capacity !== undefined) updates.capacity = Number(capacity);
    if (type) updates.type = type;
    if (facilities) updates.facilities = Array.isArray(facilities) ? facilities : [facilities];
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await classroomRepo.updateOne(existing.id, updates);

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'UPDATE_CLASSROOM',
      resource: 'Classroom',
      resourceId: existing.id,
      details: updates,
    });

    return res.json({ success: true, message: 'Classroom updated.', classroom: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/classrooms/:id (Admin only)
router.delete('/:id', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await classroomRepo.deleteOne(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Classroom not found.' });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'DELETE_CLASSROOM',
      resource: 'Classroom',
      resourceId: req.params.id,
    });

    return res.json({ success: true, message: 'Classroom deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
