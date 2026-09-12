import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { connectDB, isUsingMongoAtlas } from './server/config/db.js';
import { seedInitialData } from './server/services/seedData.js';

import authRoutes from './server/routes/authRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import classroomRoutes from './server/routes/classroomRoutes.js';
import timetableRoutes from './server/routes/timetableRoutes.js';
import vacancyRoutes from './server/routes/vacancyRoutes.js';
import reservationRoutes from './server/routes/reservationRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import studentRoutes from './server/routes/studentRoutes.js';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Security headers (allowing inline scripts for Vite in development)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite dev server injects client scripts
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(cors());

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiter for authentication routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per 15 min per IP
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      port: PORT,
      database: isUsingMongoAtlas() ? 'MongoDB Atlas' : 'Local Document Store (Persistent)'
    });
  });

  // Mount API routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/classrooms', classroomRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/vacancy', vacancyRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/students', studentRoutes);

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    });
  });

  // Connect to database and seed initial development data
  await connectDB();
  await seedInitialData();

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 University Classroom Finder server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
