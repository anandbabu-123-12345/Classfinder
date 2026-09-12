import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { timetableParser } from '../services/timetableParser.js';
import { timetableRepo, classroomRepo, auditLogRepo } from '../models/index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { localDb } from '../config/db.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Cache the latest parsed analysis per session/server for preview before publishing
let latestAnalysisCache: any = null;

// POST /api/timetable/upload (Admin only)
router.post('/upload', authenticate, requireRole(['admin']), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.' });
    }

    const filename = req.file.originalname;
    const analysis = timetableParser.parseBuffer(req.file.buffer, filename);
    latestAnalysisCache = analysis;

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'ANALYZE_TIMETABLE',
      resource: 'Timetable',
      details: {
        filename,
        totalRows: analysis.totalRowsDetected,
        validRows: analysis.validRowsCount,
        invalidRows: analysis.invalidRowsCount,
        duplicateRows: analysis.duplicateRowsCount,
      },
    });

    return res.json({
      success: true,
      message: 'Timetable analyzed successfully.',
      analysis,
    });
  } catch (err: any) {
    console.error('Timetable upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error processing spreadsheet.' });
  }
});

// POST /api/timetable/auto-upload-sample
// Fulfills: "upload the file named 'sample-timetablessample_official_timetable.xlsx'. Once uploaded, automatically click the 'Analyze & Auto-Upload Vacancy (All)' button to parse the timetable and fill all the available vacancies in the system."
router.post('/auto-upload-sample', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const candidates = [
      path.join(process.cwd(), 'sample-timetablessample_official_timetable.xlsx'),
      path.join(process.cwd(), 'public', 'sample-timetablessample_official_timetable.xlsx'),
      path.join(process.cwd(), 'sample_official_timetable.xlsx'),
      path.join(process.cwd(), 'public', 'sample_official_timetable.xlsx'),
      path.join(process.cwd(), 'public', 'sample-timetables', 'sample_official_timetable.xlsx'),
    ];

    let foundPath = '';
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return res.status(404).json({
        success: false,
        message: "Sample timetable file 'sample-timetablessample_official_timetable.xlsx' not found on server.",
      });
    }

    const buffer = fs.readFileSync(foundPath);
    const filename = 'sample-timetablessample_official_timetable.xlsx';
    const analysis = timetableParser.parseBuffer(buffer, filename);
    latestAnalysisCache = analysis;

    // Immediately publish and activate
    const publishResult = await timetableParser.publish(analysis, {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
    });

    return res.json({
      success: true,
      message: `Sample official timetable parsed and published successfully as Version ${publishResult.version}. Classroom availability is now live!`,
      analysis,
      version: publishResult.version,
      entriesCount: publishResult.count,
    });
  } catch (err: any) {
    console.error('Auto-upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error auto-uploading sample timetable.' });
  }
});

// POST /api/timetable/publish (Admin only)
router.post('/publish', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const analysisToPublish = req.body.analysis || latestAnalysisCache;
    if (!analysisToPublish) {
      return res.status(400).json({
        success: false,
        message: 'No analyzed timetable found to publish. Please upload and analyze a file first.',
      });
    }

    const result = await timetableParser.publish(analysisToPublish, {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
    });

    latestAnalysisCache = null; // reset cache

    return res.json({
      success: true,
      message: `Timetable successfully published as Version ${result.version}. Classroom availability system is now active!`,
      version: result.version,
      entriesCount: result.count,
    });
  } catch (err: any) {
    console.error('Publish error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/timetable/active
router.get('/active', async (req, res) => {
  try {
    const activeEntries = await timetableRepo.findActive();
    const version = activeEntries.length > 0 ? activeEntries[0].version : 0;
    return res.json({
      success: true,
      isActive: activeEntries.length > 0,
      version,
      count: activeEntries.length,
      entries: activeEntries,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/timetable
router.get('/', async (req, res) => {
  try {
    const all = await timetableRepo.find();
    return res.json({ success: true, count: all.length, entries: all });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/timetable/:version (Admin only)
router.delete('/:version', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const ver = parseInt(req.params.version, 10);
    const count = await timetableRepo.deleteByVersion(ver);

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'DELETE_TIMETABLE_VERSION',
      resource: 'Timetable',
      resourceId: `v${ver}`,
      details: { deletedEntries: count },
    });

    return res.json({ success: true, message: `Timetable version ${ver} removed (${count} entries).` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/timetable (Admin only - Deactivate all active timetables)
router.delete('/', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    await timetableRepo.deactivateAll();

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'DEACTIVATE_ALL_TIMETABLES',
      resource: 'Timetable',
    });

    return res.json({
      success: true,
      message: 'All active timetables deactivated. Classroom availability is now temporarily unavailable until a new timetable is published.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/timetable/official - Cross-device timetable retrieval
router.get('/official', async (req, res) => {
  try {
    const officialTimetables = localDb.get('officialTimetables') || {};
    return res.json({ success: true, officialTimetables });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/timetable/official - Cross-device timetable upload and publishing
router.post('/official', async (req, res) => {
  try {
    const { year, rows, filename } = req.body;
    if (!year || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. year and rows array are required.' });
    }

    const officialTimetables = localDb.get('officialTimetables') || {};
    officialTimetables[year] = rows;
    localDb.set('officialTimetables', officialTimetables);

    // Auto-create any missing classrooms in classroomRepo so vacancy engine knows them
    const existingClassrooms = await classroomRepo.find();
    const existingSet = new Set(existingClassrooms.map(c => c.roomNumber.trim().toUpperCase()));
    for (const r of rows) {
      const roomStr = String(r.room || '').trim().toUpperCase();
      if (roomStr && !existingSet.has(roomStr)) {
        await classroomRepo.create({
          roomNumber: roomStr,
          building: roomStr.startsWith('CR') ? 'Classroom Complex' : (roomStr.startsWith('L') ? 'Lecture Hall Complex' : 'Main Academic Block'),
          floor: 1,
          capacity: 60,
          type: /lab|cc/i.test(roomStr) ? 'Laboratory' : (roomStr.startsWith('L') ? 'Seminar Hall' : 'Classroom'),
          facilities: ['Projector', 'Air Conditioned', 'Whiteboard', 'Wi-Fi'],
          isActive: true,
        });
        existingSet.add(roomStr);
      }
    }

    // Convert rows to ITimetableEntry and save to timetableRepo
    const currentMax = await timetableRepo.getMaxVersion();
    const newVersion = currentMax + 1;
    await timetableRepo.deactivateAll();

    const entriesToInsert = rows.map((r: any) => ({
      academicYear: year,
      semester: '1',
      day: r.day || '',
      date: r.date || '',
      startTime: r.startTime,
      endTime: r.endTime,
      roomNumber: r.room || '',
      subject: r.courseName || 'General Course',
      courseCode: r.courseName ? r.courseName.split(' ')[0] : 'CRS',
      section: r.section || '',
      lecturer: r.teacherName || '',
      department: 'Academics',
      status: 'active' as const,
      version: newVersion,
      uploadedBy: 'admin',
      uploadedAt: new Date().toISOString(),
    }));

    if (entriesToInsert.length > 0) {
      await timetableRepo.insertMany(entriesToInsert);
    }

    return res.json({
      success: true,
      message: `Successfully synchronized and published ${rows.length} timetable entries for ${year} across all devices.`,
      count: rows.length,
      version: newVersion,
      officialTimetables,
    });
  } catch (err: any) {
    console.error('Error in POST /api/timetable/official:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/timetable/official/:year - Remove timetable across all devices
router.delete('/official/:year', async (req, res) => {
  try {
    const year = req.params.year;
    const officialTimetables = localDb.get('officialTimetables') || {};
    if (officialTimetables[year]) {
      delete officialTimetables[year];
      localDb.set('officialTimetables', officialTimetables);
    }
    return res.json({ success: true, message: `Timetable for ${year} deleted from all devices.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
