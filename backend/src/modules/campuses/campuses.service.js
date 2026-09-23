import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

const slugCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

const currentAssignmentInclude = {
  vendor: true,
  campus: true,
};

class CampusesService {
  async listCampuses() {
    const campuses = await prisma.campus.findMany({
      orderBy: { name: 'asc' },
      include: {
        assignments: {
          where: { endedAt: null },
          include: { vendor: true },
          take: 1,
        },
        staff: {
          where: { role: 'CAFE_STAFF' },
          select: { id: true, name: true, isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return campuses.map((campus) => {
      const operators = campus.staff || [];
      const hasVendor = Boolean(campus.assignments[0]?.vendor?.isActive !== false && campus.assignments[0]?.vendor);
      const hasActiveOperator = operators.some((staff) => staff.isActive !== false);
      return {
        id: campus.id,
        name: campus.name,
        code: campus.code,
        isActive: campus.isActive,
        currentVendor: campus.assignments[0]?.vendor || null,
        operators,
        staffCount: operators.length,
        readyToScan: hasVendor && hasActiveOperator,
        createdAt: campus.createdAt,
      };
    });
  }

  async createCampus(data, actorId, req) {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Campus name is required');
    const code = slugCode(data.code || name);
    if (!code) throw new Error('Campus code is required');

    const campus = await prisma.campus.create({
      data: { name, code, isActive: data.isActive !== false },
    });

    await auditService.log({
      action: 'CAMPUS_CREATE',
      entityType: 'Campus',
      entityId: campus.id,
      actorId,
      newState: campus,
      req,
    });

    return campus;
  }

  async updateCampus(id, data, actorId, req) {
    const existing = await prisma.campus.findUnique({ where: { id } });
    if (!existing) throw new Error('Campus not found');

    const campus = await prisma.campus.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
        ...(data.code !== undefined ? { code: slugCode(data.code) } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    });

    await auditService.log({
      action: 'CAMPUS_UPDATE',
      entityType: 'Campus',
      entityId: campus.id,
      actorId,
      oldState: existing,
      newState: campus,
      req,
    });

    return campus;
  }

  async listVendors() {
    return prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      include: {
        assignments: {
          where: { endedAt: null },
          include: { campus: { select: { id: true, name: true, code: true } } },
        },
      },
    });
  }

  async createVendor(data, actorId, req) {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('Vendor name is required');

    const vendor = await prisma.vendor.create({
      data: { name, isActive: data.isActive !== false },
    });

    await auditService.log({
      action: 'VENDOR_CREATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      actorId,
      newState: vendor,
      req,
    });

    return vendor;
  }

  async updateVendor(id, data, actorId, req) {
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new Error('Vendor not found');

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    });

    await auditService.log({
      action: 'VENDOR_UPDATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      actorId,
      oldState: existing,
      newState: vendor,
      req,
    });

    return vendor;
  }

  async assignVendor(campusId, vendorId, actorId, req) {
    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus || !campus.isActive) throw new Error('Campus not found or inactive');

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor || !vendor.isActive) throw new Error('Vendor not found or inactive');

    const current = await prisma.campusVendorAssignment.findFirst({
      where: { campusId, endedAt: null },
      include: currentAssignmentInclude,
    });

    if (current?.vendorId === vendorId) {
      await prisma.campusVendorAssignment.updateMany({
        where: { campusId, endedAt: null, NOT: { id: current.id } },
        data: { endedAt: new Date() },
      });
      return current;
    }

    const assignment = await prisma.$transaction(async (tx) => {
      await tx.campusVendorAssignment.updateMany({
        where: { campusId, endedAt: null },
        data: { endedAt: new Date() },
      });
      return tx.campusVendorAssignment.create({
        data: { campusId, vendorId },
        include: currentAssignmentInclude,
      });
    });

    await auditService.log({
      action: 'CAMPUS_VENDOR_ASSIGN',
      entityType: 'Campus',
      entityId: campusId,
      actorId,
      oldState: current,
      newState: assignment,
      req,
    });

    return assignment;
  }
}

export default new CampusesService();
