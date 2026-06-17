import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import { signToken } from '../../utils/token.js';
import auditService from '../audit/audit.service.js';

class AuthService {
  /**
   * authenticates user, signs JWT token, logs action
   * @param {String} email 
   * @param {String} password 
   * @param {Object} [req] 
   */
  async login(email, password, req) {
    // 1. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account inactive');
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // 3. Issue web token
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
    };

    // 4. Log the audit event for compliance
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
