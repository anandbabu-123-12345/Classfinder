import * as XLSX from 'xlsx';
import { ITimetableEntry, classroomRepo, timetableRepo, auditLogRepo } from '../models/index.js';

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
  validRows: Partial<ITimetableEntry>[];
  invalidRows: { rowNumber: number; rowData: any; reason: string }[];
  duplicateRows: { rowNumber: number; rowData: any; reason: string }[];
}

export const timetableParser = {
  /**
   * Parse a buffer or file path of xlsx/xls/csv into structured analysis
   */
  parseBuffer(buffer: Buffer, filename: string = 'timetable.xlsx'): ParseAnalysis {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const validRows: Partial<ITimetableEntry>[] = [];
    const invalidRows: { rowNumber: number; rowData: any; reason: string }[] = [];
    const duplicateRows: { rowNumber: number; rowData: any; reason: string }[] = [];

    const roomsSet = new Set<string>();
    const timeSlotsSet = new Set<string>();
    const daysSet = new Set<string>();

    const rowSignatureSet = new Set<string>();

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 for 1-indexing, +1 for header

      // Normalize common column names
      const academicYear = String(row['Academic Year'] || row['academicYear'] || row['Year'] || '2026-27').trim();
      const semester = String(row['Semester'] || row['semester'] || '1').trim();
      const day = String(row['Day'] || row['day'] || '').trim();
      const date = String(row['Date'] || row['date'] || '').trim();
      const startTime = String(row['Start Time'] || row['startTime'] || row['Start'] || '').trim();
      const endTime = String(row['End Time'] || row['endTime'] || row['End'] || '').trim();
      const roomNumber = String(row['Room Number'] || row['roomNumber'] || row['Room'] || row['room'] || '').trim().toUpperCase();
      const subject = String(row['Subject'] || row['subject'] || row['Course'] || '').trim();
      const courseCode = String(row['Course Code'] || row['courseCode'] || row['Code'] || '').trim().toUpperCase();
      const section = String(row['Section'] || row['section'] || row['Batch'] || 'A').trim();
      const lecturer = String(row['Lecturer'] || row['lecturer'] || row['Faculty'] || row['Teacher'] || 'Staff').trim();
      const department = String(row['Department'] || row['department'] || 'General').trim();

      // Validation rules
      if (!day && !date) {
        invalidRows.push({ rowNumber: rowNum, rowData: row, reason: 'Missing Day or Date' });
        return;
      }
      if (!startTime) {
        invalidRows.push({ rowNumber: rowNum, rowData: row, reason: 'Missing Start Time' });
        return;
      }
      if (!endTime) {
        invalidRows.push({ rowNumber: rowNum, rowData: row, reason: 'Missing End Time' });
        return;
      }
      if (!roomNumber) {
        invalidRows.push({ rowNumber: rowNum, rowData: row, reason: 'Missing Room Number' });
        return;
      }
      if (!subject) {
        invalidRows.push({ rowNumber: rowNum, rowData: row, reason: 'Missing Subject or Course title' });
        return;
      }

      // Check for duplicate row inside the same timetable
      const signature = `${academicYear}_${day}_${startTime}_${endTime}_${roomNumber}`;
      if (rowSignatureSet.has(signature)) {
        duplicateRows.push({
          rowNumber: rowNum,
          rowData: row,
          reason: `Duplicate entry for ${roomNumber} on ${day} from ${startTime} to ${endTime}`,
        });
        return;
      }
      rowSignatureSet.add(signature);

      roomsSet.add(roomNumber);
      timeSlotsSet.add(`${startTime} - ${endTime}`);
      if (day) daysSet.add(day);

      validRows.push({
        academicYear,
        semester,
        day,
        date: date || undefined,
        startTime,
        endTime,
        roomNumber,
        subject,
        courseCode: courseCode || subject.substring(0, 5).toUpperCase(),
        section,
        lecturer,
        department,
        status: 'inactive', // inactive until admin explicitly publishes!
      });
    });

    return {
      filename,
      totalRowsDetected: rawRows.length,
      roomsDetectedCount: roomsSet.size,
      roomsDetectedList: Array.from(roomsSet).sort(),
      timeSlotsCount: timeSlotsSet.size,
      timeSlotsList: Array.from(timeSlotsSet).sort(),
      daysCount: daysSet.size,
      daysList: Array.from(daysSet),
      validRowsCount: validRows.length,
      invalidRowsCount: invalidRows.length,
      duplicateRowsCount: duplicateRows.length,
      validRows,
      invalidRows,
      duplicateRows,
    };
  },

  /**
   * Publish timetable analysis into active MongoDB state
   */
  async publish(
    analysis: ParseAnalysis,
    uploadedBy: { id: string; name: string; email: string }
  ): Promise<{ version: number; count: number }> {
    if (!analysis.validRows || analysis.validRows.length === 0) {
      throw new Error('Cannot publish an empty or invalid timetable.');
    }

    // 1. Get next version
    const maxVersion = await timetableRepo.getMaxVersion();
    const newVersion = maxVersion + 1;

    // 2. Mark previous active entries as inactive
    await timetableRepo.deactivateAll();

    // 3. Ensure all detected classrooms exist in the classroom database
    for (const roomNum of analysis.roomsDetectedList) {
      const existing = await classroomRepo.findByRoomNumber(roomNum);
      if (!existing) {
        // Auto-create classroom with sensible defaults
        let type: any = 'Classroom';
        if (roomNum.includes('LAB')) type = 'Laboratory';
        else if (roomNum.includes('COMP')) type = 'Computer Lab';
        else if (roomNum.includes('SEMINAR')) type = 'Seminar Hall';
        else if (roomNum.includes('AUD')) type = 'Auditorium';

        const floorNum = roomNum.match(/\d/)?.[0] || '1';
        await classroomRepo.create({
          roomNumber: roomNum,
          building: roomNum.includes('LAB') || roomNum.includes('COMP') ? 'Technology Complex' : 'Main Academic Block',
          floor: parseInt(floorNum, 10) || 1,
          capacity: type === 'Auditorium' ? 250 : type === 'Seminar Hall' ? 90 : 60,
          type,
          facilities: ['Projector', 'Air Conditioned', 'Whiteboard', 'Wi-Fi'],
          isActive: true,
        });
      }
    }

    // 4. Insert valid timetable entries with status = 'active'
    const entriesToInsert = analysis.validRows.map(row => ({
      academicYear: row.academicYear || '2026-27',
      semester: row.semester || '1',
      day: row.day || '',
      date: row.date,
      startTime: row.startTime || '',
      endTime: row.endTime || '',
      roomNumber: row.roomNumber || '',
      subject: row.subject || '',
      courseCode: row.courseCode || '',
      section: row.section || 'A',
      lecturer: row.lecturer || 'Faculty',
      department: row.department || 'General',
      status: 'active' as const,
      version: newVersion,
      uploadedBy: uploadedBy.name,
      uploadedAt: new Date().toISOString(),
    }));

    const inserted = await timetableRepo.insertMany(entriesToInsert);

    // 5. Audit log
    await auditLogRepo.log({
      userId: uploadedBy.id,
      userName: uploadedBy.name,
      userRole: 'admin',
      action: 'PUBLISH_TIMETABLE',
      resource: 'Timetable',
      resourceId: `v${newVersion}`,
      details: {
        filename: analysis.filename,
        version: newVersion,
        entriesCount: inserted.length,
        roomsCount: analysis.roomsDetectedCount,
      },
    });

    return {
      version: newVersion,
      count: inserted.length,
    };
  }
};
