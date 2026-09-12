import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDB, isUsingMongoAtlas } from './config/db.js';
import { seedInitialData } from './services/seedData.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import vacancyRoutes from './routes/vacancyRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';

dotenv.config();

export const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS support
app.use(cors());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check handler
const healthHandler = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel-serverless' : (process.env.NODE_ENV || 'development'),
    database: isUsingMongoAtlas() ? 'MongoDB Atlas' : 'Local Document Store (Persistent /tmp)',
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Mount API routes supporting both /api/* and direct routes (for Vercel rewrites)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, authRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/classrooms', classroomRoutes);
app.use('/classrooms', classroomRoutes);

app.use('/api/timetable', timetableRoutes);
app.use('/timetable', timetableRoutes);

app.use('/api/vacancy', vacancyRoutes);
app.use('/vacancy', vacancyRoutes);

app.use('/api/reservations', reservationRoutes);
app.use('/reservations', reservationRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.use('/api/students', studentRoutes);
app.use('/students', studentRoutes);

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred.',
  });
});

// Serverless initialization cache
let initPromise: Promise<void> | null = null;

export async function initServerless(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await connectDB();
        await seedInitialData();
      } catch (err) {
        console.error('Database / seed initialization error:', err);
      }
    })();
  }
  return initPromise;
}

export default app;
