import bcrypt from 'bcryptjs';
import { userRepo, classroomRepo, timetableRepo, auditLogRepo } from '../models/index.js';

export async function seedInitialData(force: boolean = false) {
  const existingUsers = await userRepo.find();
  if (existingUsers.length > 0 && !force) {
    return; // Already initialized
  }

  console.log('🌱 Initializing university database with sample classrooms and users...');

  // Hash passwords
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  const lecturerHash = await bcrypt.hash('Lecturer@12345', 10);
  const studentHash = await bcrypt.hash('Student@12345', 10);

  // 1. Seed Users
  await userRepo.create({
    id: 'usr_admin_1',
    name: 'Academic Administration',
    email: 'admin@university.edu',
    passwordHash: adminHash,
    role: 'admin',
    phone: '+1 (555) 019-2831',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isActive: true,
    department: 'Office of Academic Affairs',
    designation: 'Chief Academic Registrar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await userRepo.create({
    id: 'usr_lecturer_1',
    name: 'Dr. Robert Smith',
    email: 'dr.smith@university.edu',
    passwordHash: lecturerHash,
    role: 'lecturer',
    phone: '+1 (555) 234-5678',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isActive: true,
    lecturerId: 'FAC-2024-042',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await userRepo.create({
    id: 'usr_lecturer_2',
    name: 'Prof. Elena Vance',
    email: 'prof.vance@university.edu',
    passwordHash: lecturerHash,
    role: 'lecturer',
    phone: '+1 (555) 345-6789',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isActive: true,
    lecturerId: 'FAC-2023-018',
    department: 'Computer Science & Engineering',
    designation: 'Professor & Lab Director',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await userRepo.create({
    id: 'usr_student_1',
    name: 'Alex Rivera',
    email: 'alex.student@university.edu',
    passwordHash: studentHash,
    role: 'student',
    phone: '+1 (555) 876-5432',
    profileImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isActive: true,
    studentId: 'STU-2024-8891',
    department: 'Computer Science',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Seed Classrooms
  const initialClassrooms = [
    {
      roomNumber: 'ROOM 101',
      building: 'Main Academic Block',
      floor: 1,
      capacity: 60,
      type: 'Classroom' as const,
      facilities: ['Projector', 'Air Conditioned', 'Whiteboard', 'Wi-Fi'],
      isActive: true,
    },
    {
      roomNumber: 'ROOM 102',
      building: 'Main Academic Block',
      floor: 1,
      capacity: 50,
      type: 'Classroom' as const,
      facilities: ['Projector', 'Whiteboard', 'Wi-Fi'],
      isActive: true,
    },
    {
      roomNumber: 'ROOM 201',
      building: 'Engineering Wing',
      floor: 2,
      capacity: 60,
      type: 'Classroom' as const,
      facilities: ['Smart Board', 'Air Conditioned', 'Audio System', 'Wi-Fi'],
      isActive: true,
    },
    {
      roomNumber: 'ROOM 204',
      building: 'Engineering Wing',
      floor: 2,
      capacity: 60,
      type: 'Classroom' as const,
      facilities: ['Projector', 'Air Conditioned', 'Wi-Fi'],
      isActive: true,
    },
    {
      roomNumber: 'ROOM 205',
      building: 'Engineering Wing',
      floor: 2,
      capacity: 75,
      type: 'Classroom' as const,
      facilities: ['Projector', 'Air Conditioned', 'Audio System', 'Wi-Fi'],
      isActive: true,
    },
    {
      roomNumber: 'LAB 301',
      building: 'Technology Complex',
      floor: 3,
      capacity: 40,
      type: 'Laboratory' as const,
      facilities: ['Workstations', 'LAN & High-Speed Wi-Fi', 'Dual Displays', 'Air Conditioned'],
      isActive: true,
    },
    {
      roomNumber: 'COMP 105',
      building: 'Technology Complex',
      floor: 1,
      capacity: 45,
      type: 'Computer Lab' as const,
      facilities: ['High-Performance GPUs', 'Smart Board', 'Gigabit Network', 'Air Conditioned'],
      isActive: true,
    },
    {
      roomNumber: 'SEMINAR 401',
      building: 'Main Academic Block',
      floor: 4,
      capacity: 90,
      type: 'Seminar Hall' as const,
      facilities: ['Tiered Seating', 'Surround Sound', 'Dual 4K Projectors', 'Wireless Mics'],
      isActive: true,
    },
    {
      roomNumber: 'AUDITORIUM 1',
      building: 'University Center',
      floor: 1,
      capacity: 250,
      type: 'Auditorium' as const,
      facilities: ['Stage Lighting', 'Pro Audio Console', 'Acoustic Treatment', 'Air Conditioned'],
      isActive: true,
    },
  ];

  for (const c of initialClassrooms) {
    await classroomRepo.create(c);
  }

  // Record audit log
  await auditLogRepo.log({
    userName: 'System Initialization',
    userRole: 'system',
    action: 'SYSTEM_SEED',
    resource: 'Database',
    details: { message: 'Initialized seed users and classrooms.' },
  });

  console.log('✅ Seed users and classrooms successfully initialized.');
}
