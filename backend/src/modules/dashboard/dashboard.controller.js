import dashboardService from './dashboard.service.js';
import { successResponse } from '../../utils/response.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats(req.user);
    return successResponse(res, 200, 'Dashboard statistics retrieved successfully', stats);
  } catch (error) {
    next(error);
  }
};
