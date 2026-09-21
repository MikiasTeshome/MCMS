import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

const EMP_ID_PREFIX = 'EMP-';
const EMP_ID_BASE = 10000;
const EMPLOYEE_SORT_FIELDS = new Set(['name', 'createdAt', 'email', 'updatedAt']);

const EMPLOYEE_PROFILE_SELECT = {
  id: true,
  department: true,
  position: true,
  employeeIdNumber: true,
  staffType: true,
  leaveDays: true,
  leaveStartDate: true,
  leaveReturnDate: true,
  createdAt: true,
  updatedAt: true,
};

const QR_CARD_SELECT = {
  id: true,
  cardCode: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const parseDayMonthYear = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
};

const normalizeDateInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    const date = new Date(value.getTime());
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = parseDayMonthYear(text);
  if (dmy) return dmy;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeLeaveDays = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const days = Number.parseInt(value, 10);
  return Number.isFinite(days) && days > 0 ? days : null;
};

class EmployeesService {
  /**
   * Finds the highest numeric suffix among existing EMP- IDs.
   */
  async getMaxEmployeeIdNumber() {
    const profiles = await prisma.employeeProfile.findMany({
      where: { employeeIdNumber: { startsWith: EMP_ID_PREFIX } },
      select: { employeeIdNumber: true },
    });

    let max = EMP_ID_BASE;
    for (const profile of profiles) {
      const num = parseInt(profile.employeeIdNumber.slice(EMP_ID_PREFIX.length), 10);
      if (!Number.isNaN(num) && num > max) {
        max = num;
      }
    }
    return max;
  }

  /**
   * Fills import defaults for optional fields before provisioning.
   */
  prepareImportRow(row, nextIdRef) {
    const name = row.name?.trim();

    if (!name) {
      return { error: 'Full Name is required' };
    }

    let employeeIdNumber = row.employeeIdNumber?.trim();
    if (!employeeIdNumber) {
      nextIdRef.value += 1;
      employeeIdNumber = `${EMP_ID_PREFIX}${nextIdRef.value}`;
    }

    const email = row.email?.trim() || `${employeeIdNumber.toLowerCase()}@employees.local`;
    const department = row.department?.trim() || '-';
    const position = row.position?.trim() || '-';
    const staffType = row.staffType?.trim() || 'Standard';

    let joinedDate = null;
    if (row.joinedDate) {
      const parsed = new Date(row.joinedDate);
      if (Number.isNaN(parsed.getTime())) {
        return { error: 'Invalid joined date format' };
      }
      joinedDate = parsed.toISOString();
    }

    return {
      data: {
        name,
        department,
        employeeIdNumber,
        email,
        position,
        staffType,
        joinedDate,
        password: 'Password123!',
      },
    };
  }

  /**
   * provisions user as EMPLOYEE + EmployeeProfile + optional QRCard in a transaction
   */
  async createEmployee(data, actorId, req) {
    const name = String(data.name || '').trim();
    if (!name) {
      throw new Error('Full name is required');
    }

    let employeeIdNumber = String(data.employeeIdNumber || '').trim();
    if (!employeeIdNumber) {
      const max = await this.getMaxEmployeeIdNumber();
      employeeIdNumber = `${EMP_ID_PREFIX}${max + 1}`;
    }

    const email =
      String(data.email || '').trim() || `${employeeIdNumber.toLowerCase()}@employees.local`;
    const department = String(data.department || '').trim() || '-';
    const position = String(data.position || '').trim() || '-';
    const {
      password,
      staffType,
      joinedDate,
      leaveDays,
      leaveStartDate,
      leaveReturnDate,
    } = data;

    let joinedAt = new Date();
    if (joinedDate) {
      joinedAt = new Date(joinedDate);
      if (Number.isNaN(joinedAt.getTime())) {
        throw new Error('Invalid joined date');
      }
    }

    // Password hashing default
    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);

    // Database transaction block
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User account with role EMPLOYEE
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'EMPLOYEE',
          isActive: true,
          createdAt: joinedAt,
        },
      });

      // 2. Create Employee Profile record
      const profile = await tx.employeeProfile.create({
        data: {
          userId: user.id,
          department,
          position,
          employeeIdNumber,
          staffType: staffType || 'Standard',
          leaveDays: normalizeLeaveDays(leaveDays),
          leaveStartDate: normalizeDateInput(leaveStartDate),
          leaveReturnDate: normalizeDateInput(leaveReturnDate),
          createdAt: joinedAt,
        },
      });

      // QR payload is a secure random UUID
      const qrCard = await tx.qRCard.create({
        data: {
          cardCode: crypto.randomUUID(),
          employeeId: user.id,
          status: 'ACTIVE',
        },
      });

      return { user, profile, qrCard };
    });

    // Audits record logging
    await auditService.log({
      action: 'EMPLOYEE_CREATE',
      entityType: 'Employee',
      entityId: result.user.id,
      actorId,
      newState: result,
      req,
    });

    return result;
  }

  /**
   * Retrieves list of all employees with their profiles and active cards
   */
  buildEmployeeWhere(filters = {}) {
    const where = { role: 'EMPLOYEE' };
    const { search, department, status } = filters;

    if (status) {
      where.isActive = status === 'ACTIVE';
    }

    const AND = [];
    if (department) {
      AND.push({ employeeProfile: { department: { equals: department, mode: 'insensitive' } } });
    }
    if (search) {
      AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeProfile: { department: { contains: search, mode: 'insensitive' } } },
          { employeeProfile: { position: { contains: search, mode: 'insensitive' } } },
          { employeeProfile: { employeeIdNumber: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    return where;
  }

  async getEmployees(filters = {}) {
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 25, 1), 100);
    const skip = (page - 1) * limit;
    const sort = EMPLOYEE_SORT_FIELDS.has(filters.sort) ? filters.sort : 'name';
    const order = filters.order === 'desc' ? 'desc' : 'asc';
    const where = this.buildEmployeeWhere(filters);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          employeeProfile: {
            select: EMPLOYEE_PROFILE_SELECT,
          },
          qrCards: {
            where: { status: 'ACTIVE' },
            select: QR_CARD_SELECT,
          },
          createdAt: true,
        },
        orderBy: sort === 'createdAt' ? { createdAt: order } : { name: order },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  async getEmployeeStats() {
    const [activeEmployees, totalEmployees] = await Promise.all([
      prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } }),
      prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    ]);
    return { activeEmployees, totalEmployees };
  }

  async getPrintCards() {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: {
        id: true,
        name: true,
        employeeProfile: {
          select: {
            employeeIdNumber: true,
            department: true,
            position: true,
          },
        },
        qrCards: {
          where: { status: 'ACTIVE' },
          select: QR_CARD_SELECT,
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return employees
      .filter((emp) => emp.qrCards?.[0]?.cardCode)
      .map((emp) => ({
        employee: emp,
        cardCode: emp.qrCards[0].cardCode,
      }));
  }

  async getAllEmployees() {
    return prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          employeeProfile: {
            select: EMPLOYEE_PROFILE_SELECT,
          },
          qrCards: {
            where: { status: 'ACTIVE' },
            select: QR_CARD_SELECT,
          },
          createdAt: true,
        },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Updates employee credentials + profile data inside a transaction
   */
  async updateEmployee(id, data, actorId, req) {
    const oldData = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        employeeProfile: {
          select: EMPLOYEE_PROFILE_SELECT,
        },
      },
    });

    if (!oldData || oldData.role !== 'EMPLOYEE') {
      throw new Error('Employee not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update User Base details
      const user = await tx.user.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name : oldData.name,
          email: data.email !== undefined ? data.email : oldData.email,
          isActive: data.isActive !== undefined ? data.isActive : oldData.isActive,
        },
      });

      // Update HR Profile details
      let profile = null;
      if (oldData.employeeProfile) {
        profile = await tx.employeeProfile.update({
          where: { userId: id },
          data: {
            department: data.department !== undefined ? data.department : oldData.employeeProfile.department,
            position: data.position !== undefined ? data.position : oldData.employeeProfile.position,
            employeeIdNumber: data.employeeIdNumber !== undefined ? data.employeeIdNumber : oldData.employeeProfile.employeeIdNumber,
            staffType: data.staffType !== undefined ? data.staffType : oldData.employeeProfile.staffType,
            leaveDays:
              data.leaveDays !== undefined
                ? normalizeLeaveDays(data.leaveDays)
                : oldData.employeeProfile.leaveDays,
            leaveStartDate:
              data.leaveStartDate !== undefined
                ? normalizeDateInput(data.leaveStartDate)
                : oldData.employeeProfile.leaveStartDate,
            leaveReturnDate:
              data.leaveReturnDate !== undefined
                ? normalizeDateInput(data.leaveReturnDate)
                : oldData.employeeProfile.leaveReturnDate,
          },
        });
      }

      return { user, profile };
    });

    await auditService.log({
      action: 'EMPLOYEE_UPDATE',
      entityType: 'Employee',
      entityId: id,
      actorId,
      oldState: oldData,
      newState: result,
      req,
    });

    return result;
  }

  /**
   * Bulk provisions employees from parsed spreadsheet rows (insert-only).
   * Returns per-row success/failure summary without aborting the whole batch.
   */
  async bulkImportEmployees(rows, actorId, req) {
    const results = { created: 0, failed: 0, errors: [] };
    const nextIdRef = { value: await this.getMaxEmployeeIdNumber() };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // account for header row in Excel/CSV
      const prepared = this.prepareImportRow(row, nextIdRef);

      if (prepared.error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: row.name || '',
          message: prepared.error,
        });
        continue;
      }

      const { data } = prepared;

      try {
        await this.createEmployee(data, actorId, req);
        results.created++;
      } catch (error) {
        results.failed++;
        let message = error.message || 'Failed to create employee';
        if (error.code === 'P2002') {
          const fields = (error.meta?.target || []).join(', ');
          message = fields ? `Duplicate value for: ${fields}` : 'Duplicate email or employee ID';
        }
        results.errors.push({
          row: rowNum,
          name: data.name,
          employeeIdNumber: data.employeeIdNumber,
          message,
        });
      }
    }

    await auditService.log({
      action: 'EMPLOYEE_BULK_IMPORT',
      entityType: 'Employee',
      entityId: 'bulk',
      actorId,
      newState: { total: rows.length, created: results.created, failed: results.failed },
      req,
    });

    return results;
  }

  /**
   * Removes employee and clears their profiles cascades
   */
  async deleteEmployee(id, actorId, req) {
    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        employeeProfile: {
          select: EMPLOYEE_PROFILE_SELECT,
        },
      },
    });

    if (!employee || employee.role !== 'EMPLOYEE') {
      throw new Error('Employee not found');
    }

    await prisma.$transaction(async (tx) => {
      // Cascade delete: EmployeeProfile and QRCards will be cleared via DB constraints
      await tx.user.delete({
        where: { id },
      });
    });

    await auditService.log({
      action: 'EMPLOYEE_DELETE',
      entityType: 'Employee',
      entityId: id,
      actorId,
      oldState: employee,
      req,
    });

    return employee;
  }
}

export default new EmployeesService();
