import prisma from '../../config/db.js';
import logger from '../../utils/logger.js';

class AuditService {
  /**
   * Logs a system event or database mutation in the Audit Log
   * @param {Object} params
   * @param {String} params.action - Event action (e.g. USER_UPDATE, COUPON_REDEEM)
   * @param {String} params.entityType - Database model type (e.g. User, Coupon)
   * @param {String} params.entityId - Row ID of the primary entity modified
   * @param {String} [params.actorId] - User ID initiating the request
   * @param {Object} [params.oldState] - Data before modification
   * @param {Object} [params.newState] - Data after modification
   * @param {Object} [params.req] - Express request object to extract network footprints
   */
  async log({ action, entityType, entityId, actorId, oldState, newState, req }) {
    try {
      let ipAddress = null;
      let userAgent = null;

      if (req) {
        ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        userAgent = req.headers['user-agent'];
      }

      const logEntry = await prisma.auditLog.create({
        data: {
          action,
          entityType,
          entityId,
          actorId: actorId || null,
          oldState: oldState ? JSON.parse(JSON.stringify(oldState)) : null,
          newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
          ipAddress,
          userAgent,
        },
      });

      logger.info(`📝 Audit Log Recorded: [${action}] by User [${actorId || 'SYSTEM'}] on [${entityType}:${entityId}]`);
      return logEntry;
    } catch (error) {
      // Never block original execution if logging fails; log it to terminal
      logger.error(`❌ Failed to record Audit Log: ${error.message}`);
    }
  }

  /**
   * Fetches audit logs with support for search filters and pagination
   */
  async getLogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    const { action, entityType, actorId } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (actorId) where.actorId = actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new AuditService();
