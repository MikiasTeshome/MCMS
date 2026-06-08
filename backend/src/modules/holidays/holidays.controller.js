import holidaysService from './holidays.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getHolidays = async (req, res, next) => {
  try {
    const list = await holidaysService.getHolidays();
    return successResponse(res, 200, 'Holidays database list retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createHoliday = async (req, res, next) => {
  try {
    const { date, description } = req.body;
    if (!date || !description) {
      return errorResponse(res, 400, 'Please specify holiday date and description parameters');
    }
    const holiday = await holidaysService.createHoliday(req.body, req.user.id, req);
    return successResponse(res, 201, 'Holiday registered successfully', holiday);
  } catch (error) {
    if (error.code === 'P2002') {
      return errorResponse(res, 409, 'A holiday is already registered on this calendar date');
    }
    next(error);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    await holidaysService.deleteHoliday(id, req.user.id, req);
    return successResponse(res, 200, 'Holiday entry cleared');
  } catch (error) {
    if (error.message === 'Holiday record not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};
