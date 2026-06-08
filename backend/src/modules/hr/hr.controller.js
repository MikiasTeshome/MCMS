import hrService from './hr.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const generateQR = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, 400, 'Employee ID is required');
    }
    const card = await hrService.generateQR(id, req.user.id, req);
    return successResponse(res, 200, 'New QR Code successfully generated', card);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};
