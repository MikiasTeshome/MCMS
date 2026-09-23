import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

const USER_SORT_FIELDS = new Set(['name', 'email', 'createdAt', 'role']);

class UsersService {
  /**
   * Provisions a new user account, hashes password, logs action
   */
  async createUser(data, actorId, req) {
    const { email, password, name, role, campusId } = data;

    if (role === 'CAFE_STAFF' && !campusId) {
      throw new Error('Cafe staff must be assigned to a campus');
    }

    if (role === 'EMPLOYEE') {
      throw new Error('Create employees from the Employees page, not Users');
    }

    const nextPassword = String(password || '').trim();
    if (nextPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (role === 'CAFE_STAFF') {
      const campus = await prisma.campus.findUnique({
        where: { id: campusId },
        select: { id: true, isActive: true },
      });
      if (!campus?.isActive) {
        throw new Error('Cafe staff must be assigned to an active campus');
      }
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || 'HR',
        campusId: role === 'CAFE_STAFF' ? campusId : null,
      },
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

  async resetPassword(userId, password, actorId, req) {
    const nextPassword = String(password || '').trim();
    if (nextPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!existing) {
      throw new Error('User not found');
    }
    if (existing.role === 'EMPLOYEE') {
      throw new Error('Employees do not log in. Manage them on the Employees page.');
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await auditService.log({
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: existing.id,
      actorId,
      newState: { email: existing.email, resetBy: actorId },
      req,
    });

    return existing;
  }

  async updateUser(userId, data, actorId, req) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new Error('User not found');
    }

    if (existing.role === 'EMPLOYEE') {
      throw new Error('Employees do not log in. Manage them on the Employees page.');
    }

    const nextData = {};
    if (typeof data.isActive === 'boolean') {
      if (data.isActive === false) {
        if (userId === actorId) {
          throw new Error('You cannot deactivate your own account');
        }
        if (existing.role === 'ADMIN') {
          const otherActiveAdmins = await prisma.user.count({
            where: { role: 'ADMIN', isActive: true, id: { not: userId } },
          });
          if (otherActiveAdmins === 0) {
            throw new Error('Keep at least one active administrator');
          }
        }
      }
      nextData.isActive = data.isActive;
    }

    if (existing.role === 'CAFE_STAFF' && data.campusId !== undefined) {
      if (!data.campusId) {
        throw new Error('Cafe staff must be assigned to a campus');
      }
      nextData.campusId = data.campusId;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: nextData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        campusId: true,
        campus: { select: { id: true, name: true, code: true } },
      },
    });

    await auditService.log({
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: user.id,
      actorId,
      oldState: { campusId: existing.campusId, isActive: existing.isActive },
      newState: { campusId: user.campusId, isActive: user.isActive },
      req,
    });

    return user;
  }

  /**
   * Retrieves users filtered by role
   */
  async getUsers(filters = {}) {
    const { role, search } = filters;
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 25, 1), 100);
    const skip = (page - 1) * limit;
    const sort = USER_SORT_FIELDS.has(filters.sort) ? filters.sort : 'name';
    const order = filters.order === 'desc' ? 'desc' : 'asc';
    const where = {};
    if (role && role !== 'EMPLOYEE') {
      where.role = role;
    } else {
      where.role = { not: 'EMPLOYEE' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: { [sort]: order },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }
}

export default new UsersService();
