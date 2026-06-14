import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

const EMP_ID_PREFIX = 'EMP-';
const EMP_ID_BASE = 10000;

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
    const department = row.department?.trim();

    if (!name || !department) {
      return { error: 'Full Name and Department are required' };
    }

    let employeeIdNumber = row.employeeIdNumber?.trim();
    if (!employeeIdNumber) {
      nextIdRef.value += 1;
      employeeIdNumber = `${EMP_ID_PREFIX}${nextIdRef.value}`;
    }

    const email = row.email?.trim() || `${employeeIdNumber.toLowerCase()}@employees.local`;
    const position = row.position?.trim() || 'Staff';
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
    const {
      email,
      password,
      name,
      department,
      position,
      employeeIdNumber,
      staffType,
      joinedDate,
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
          createdAt: joinedAt,
        },
      });

      // QR payload is the employee UUID only (no coupon data in QR)
      const qrCard = await tx.qRCard.create({
        data: {
          cardCode: user.id,
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
  async getEmployees() {
    return prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        employeeProfile: true,
        qrCards: {
          where: { status: 'ACTIVE' },
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
      include: { employeeProfile: true },
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
      include: { employeeProfile: true },
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
