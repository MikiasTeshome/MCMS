import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

class UsersService {
  /**
   * Provisions a new user account, hashes password, logs action
   */
  async createUser(data, actorId, req) {
    const { email, password, name, role } = data;

    // Hash user password
    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || 'EMPLOYEE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    await auditService.log({
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: user.id,
      actorId,
      newState: user,
      req,
    });

    return user;
  }

  /**
   * Retrieves users filtered by role
   */
  async getUsers(filters = {}) {
    const { role } = filters;
    const where = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }
}

export default new UsersService();
