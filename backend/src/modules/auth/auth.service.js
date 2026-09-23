import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { signToken } from '../../utils/token.js';
import auditService from '../audit/audit.service.js';

// Same cost as user hashes so unknown emails take a similar amount of time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('mcms-timing-pad', 10);

class AuthService {
  /**
   * authenticates user, signs JWT token, logs action
   * @param {String} email
   * @param {String} password
   * @param {Object} [req]
   */
  async login(email, password, req) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    const passwordHash = user?.passwordHash || DUMMY_PASSWORD_HASH;
    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!user || !isMatch) {
      throw new Error('Invalid credentials');
    }

    if (user.role === 'EMPLOYEE') {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account inactive');
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const userSafe = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      campusId: user.campusId || null,
      campus: null,
    };

    if (user.campusId) {
      const campus = await prisma.campus.findUnique({
        where: { id: user.campusId },
        select: { id: true, name: true, code: true },
      });
      userSafe.campus = campus;
    }

    await auditService.log({
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      newState: { lastLogin: new Date() },
      req,
    });

    return {
      user: userSafe,
      token,
    };
  }

  /**
   * returns details of currently logged-in user
   * @param {String} userId
   */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        campusId: true,
        campus: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error('User session not found');
    }

    return user;
  }

  async changePassword(userId, currentPassword, newPassword, req) {
    const current = String(currentPassword || '');
    const next = String(newPassword || '').trim();

    if (current.length > 128 || next.length > 128) {
      const err = new Error('Invalid password');
      err.code = 'INVALID_PASSWORD';
      throw err;
    }
    if (next.length < 8) {
      const err = new Error('New password must be at least 8 characters');
      err.code = 'WEAK_PASSWORD';
      throw err;
    }
    if (current === next) {
      const err = new Error('New password must be different from the current password');
      err.code = 'SAME_PASSWORD';
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, passwordHash: true },
    });

    if (!user || !user.isActive || user.role === 'EMPLOYEE') {
      const err = new Error('User session not found');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const isMatch = await bcrypt.compare(current, user.passwordHash || DUMMY_PASSWORD_HASH);
    if (!isMatch) {
      const err = new Error('Current password is incorrect');
      err.code = 'WRONG_PASSWORD';
      throw err;
    }

    const passwordHash = await bcrypt.hash(next, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await auditService.log({
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      newState: { changedBy: 'self' },
      req,
    });

    return { ok: true };
  }
}

export default new AuthService();
