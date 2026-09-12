import { Router, Request, Response } from 'express';
import { vacancyEngine } from '../services/vacancyEngine.js';

const router = Router();

// GET /api/vacancy
router.get('/', async (req: Request, res: Response) => {
  try {
    const academicYear = (req.query.academicYear as string) || '2026-27';
    const day = (req.query.day as string) || 'Monday';
    const date = req.query.date as string | undefined;
    const startTime = (req.query.startTime as string) || '10:00 AM';
    const endTime = (req.query.endTime as string) || '10:55 AM';
    const building = req.query.building as string | undefined;
    const roomType = req.query.roomType as string | undefined;

    const result = await vacancyEngine.calculateVacancy({
      academicYear,
      day,
      date,
      startTime,
      endTime,
      building,
      roomType,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Vacancy calculation error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error calculating room vacancy.' });
  }
});

// GET /api/vacancy/status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isLive = await vacancyEngine.hasActiveTimetable();
    return res.json({
      success: true,
      isTimetableActive: isLive,
      message: isLive
        ? 'Timetable Active ✓ Availability system is now live.'
        : 'No timetable has been published. Upload and publish the administration timetable to view classroom availability.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
