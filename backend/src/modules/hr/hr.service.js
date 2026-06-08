import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';

class HRService {
  async generateQR(employeeId, actorId, req) {
    // Validate employee exists and is an employee
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.role !== 'EMPLOYEE') {
      throw new Error('Employee not found or user is not an employee');
    }

    // Process card generation in transaction
    const qrCard = await prisma.$transaction(async (tx) => {
      // 1. Flip all previous cards to status = BLOCKED
      await tx.qRCard.updateMany({
        where: {
          employeeId,
          status: 'ACTIVE',
        },
        data: {
          status: 'BLOCKED',
        },
      });

      // QR encodes employee UUID only (same id as user account)
      const cardCode = employeeId;

      const newCard = await tx.qRCard.create({
        data: {
          cardCode,
          employeeId,
          status: 'ACTIVE',
        },
      });

      return newCard;
    });

    // 4. Log the audit event QR_CARD_REPRINTED
    await auditService.log({
      action: 'QR_CARD_REPRINTED',
      entityType: 'QRCard',
      entityId: qrCard.id,
      actorId,
      newState: qrCard,
      req,
    });

    return qrCard;
  }
}

export default new HRService();
