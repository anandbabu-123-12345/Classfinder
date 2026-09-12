import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userRepo, IUser } from '../models/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'lecturer' | 'admin';
    name: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'university_default_jwt_secret_2026';

export function signAccessToken(payload: { id: string; email: string; role: string; name: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function signRefreshToken(payload: { id: string }): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'university_default_refresh_secret_2026';
  return jwt.sign(payload, refreshSecret, { expiresIn: '7d' });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication token required.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: any; name: string };

    const user = await userRepo.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Account no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated by administration.',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Session expired or token invalid. Please log in again.',
    });
  }
}

export function requireRole(allowedRoles: ('student' | 'lecturer' | 'admin')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Access denied. Requires one of [${allowedRoles.join(', ')}] role.`,
      });
    }

    next();
  };
}
