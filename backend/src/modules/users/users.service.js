import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

const USER_SORT_FIELDS = new Set(['name', 'email', 'createdAt', 'role']);

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
    const { role, search } = filters;
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 25, 1), 100);
    const skip = (page - 1) * limit;
    const sort = USER_SORT_FIELDS.has(filters.sort) ? filters.sort : 'name';
    const order = filters.order === 'desc' ? 'desc' : 'asc';
    const where = {};
    if (role) where.role = role;
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
