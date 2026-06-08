import bcrypt from 'bcryptjs';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

class EmployeesService {
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
    } = data;

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
