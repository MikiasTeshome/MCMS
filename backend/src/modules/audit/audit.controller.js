import auditService from './audit.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    
    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.actorId) filters.actorId = req.query.actorId;

    const result = await auditService.getLogs(filters, { page, limit });

    return successResponse(res, 200, 'Audit logs retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};
