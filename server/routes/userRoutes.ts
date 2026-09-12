import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { userRepo, auditLogRepo } from '../models/index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/users/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepo.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const { passwordHash, ...safe } = user;
    return res.json({ success: true, user: safe });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/me
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, profileImage, department, designation } = req.body;
    const user = await userRepo.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updates: any = {};
    if (phone !== undefined) updates.phone = phone;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (name && req.user!.role !== 'student') updates.name = name; // Students retain official registered name
    if (department && req.user!.role !== 'student') updates.department = department;
    if (designation && req.user!.role === 'lecturer') updates.designation = designation;

    const updated = await userRepo.updateOne(user.id, updates);
    const { passwordHash, ...safe } = updated!;

    await auditLogRepo.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE_PROFILE',
      resource: 'User',
      resourceId: user.id,
    });

    return res.json({ success: true, message: 'Profile updated successfully.', user: safe });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/me/password
router.put('/me/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const user = await userRepo.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepo.updateOne(user.id, { passwordHash });

    await auditLogRepo.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CHANGE_PASSWORD',
      resource: 'User',
      resourceId: user.id,
    });

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users (Admin only)
router.get('/', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const roleFilter = req.query.role as string;
    const search = req.query.search as string;

    let users = await userRepo.find();
    if (roleFilter && roleFilter !== 'all') {
      users = users.filter(u => u.role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.studentId && u.studentId.toLowerCase().includes(q)) ||
        (u.lecturerId && u.lecturerId.toLowerCase().includes(q))
      );
    }

    const safeUsers = users.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });

    return res.json({ success: true, users: safeUsers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id (Admin only)
router.put('/:id', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, role, isActive, department, designation, phone } = req.body;
    const user = await userRepo.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updates: any = {};
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (department !== undefined) updates.department = department;
    if (designation !== undefined) updates.designation = designation;
    if (phone !== undefined) updates.phone = phone;

    const updated = await userRepo.updateOne(user.id, updates);
    const { passwordHash, ...safe } = updated!;

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'ADMIN_UPDATE_USER',
      resource: 'User',
      resourceId: user.id,
      details: updates,
    });

    return res.json({ success: true, message: 'User updated successfully.', user: safe });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:id/reset (Admin only - Reset password)
router.post('/:id/reset', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepo.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const defaultResetPassword = 'University@2026!';
    const passwordHash = await bcrypt.hash(defaultResetPassword, 10);
    await userRepo.updateOne(user.id, { passwordHash });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'ADMIN_RESET_PASSWORD',
      resource: 'User',
      resourceId: user.id,
    });

    return res.json({
      success: true,
      message: `Password reset to temporary password: ${defaultResetPassword}`,
      temporaryPassword: defaultResetPassword,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', authenticate, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account.' });
    }

    const deleted = await userRepo.deleteOne(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found.' });

    await auditLogRepo.log({
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'ADMIN_DELETE_USER',
      resource: 'User',
      resourceId: req.params.id,
    });

    return res.json({ success: true, message: 'User account removed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
