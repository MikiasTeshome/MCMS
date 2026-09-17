import campusesService from './campuses.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const listCampuses = async (req, res, next) => {
  try {
    const list = await campusesService.listCampuses();
    return successResponse(res, 200, 'Campuses retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createCampus = async (req, res, next) => {
  try {
    const campus = await campusesService.createCampus(req.body, req.user.id, req);
    return successResponse(res, 201, 'Campus created', campus);
  } catch (error) {
    if (error.code === 'P2002') {
      return errorResponse(res, 409, 'A campus with this code already exists');
    }
    if (error.message.includes('required')) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

export const updateCampus = async (req, res, next) => {
  try {
    const campus = await campusesService.updateCampus(req.params.id, req.body, req.user.id, req);
    return successResponse(res, 200, 'Campus updated', campus);
  } catch (error) {
    if (error.message === 'Campus not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

export const listVendors = async (req, res, next) => {
  try {
    const list = await campusesService.listVendors();
    return successResponse(res, 200, 'Vendors retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const vendor = await campusesService.createVendor(req.body, req.user.id, req);
    return successResponse(res, 201, 'Vendor created', vendor);
  } catch (error) {
    if (error.message.includes('required')) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

export const updateVendor = async (req, res, next) => {
  try {
    const vendor = await campusesService.updateVendor(req.params.id, req.body, req.user.id, req);
    return successResponse(res, 200, 'Vendor updated', vendor);
  } catch (error) {
    if (error.message === 'Vendor not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

export const assignVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) {
      return errorResponse(res, 400, 'vendorId is required');
    }
    const assignment = await campusesService.assignVendor(
      req.params.id,
      vendorId,
      req.user.id,
      req
    );
    return successResponse(res, 200, 'Vendor assigned to campus', assignment);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};
