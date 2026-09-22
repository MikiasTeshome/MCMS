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
}

export default new AuthService();
