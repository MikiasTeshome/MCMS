import couponsScanService from './coupons.scan.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const scanCoupon = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return errorResponse(res, 400, 'employeeId is required');
    }

    const data = await couponsScanService.scanEmployee(
      employeeId,
      req.user.id,
      req
    );
    return successResponse(res, 200, 'Employee verified successfully', data);
  } catch (error) {
    if (error.code === 'QR_INVALID') {
      return errorResponse(res, 400, 'QR card is invalid.');
    }
    if (error.message === 'Invalid QR code.') {
      return errorResponse(res, 400, 'Invalid QR code.');
    }
    if (error.code === 'NOT_FOUND') {
      return errorResponse(res, 404, error.message);
    }
    if (error.code === 'INACTIVE') {
      return errorResponse(res, 400, error.message);
    }
    if (error.code === 'ON_LEAVE') {
      return errorResponse(res, 403, error.message);
    }
    if (error.code === 'NO_CAMPUS' || error.code === 'NO_VENDOR') {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

export const issueScannedCoupon = async (req, res, next) => {
  try {
    const { employeeId, quantity, overrideReason } = req.body;
    if (!employeeId) {
      return errorResponse(res, 400, 'employeeId is required');
    }

    const data = await couponsScanService.issueCoupons(
      { employeeId, quantity, overrideReason },
      req.user,
      req
    );
    return successResponse(res, 200, 'Meal(s) recorded successfully', data);
  } catch (error) {
    if (error.code === 'SCAN_REQUIRED') {
      return errorResponse(res, 400, 'QR scan required.');
    }
    if (error.code === 'NO_COUPONS') {
      return errorResponse(res, 400, 'No unused meals this week.');
    }
    if (error.code === 'QR_INVALID') {
      return errorResponse(res, 400, 'QR card is invalid.');
    }
    if (error.code === 'CAP_NOT_REACHED') {
      return errorResponse(res, 400, error.message);
    }
    if (error.code === 'DUPLICATE_CLAIM') {
      return errorResponse(res, 400, error.message);
    }
    if (error.code === 'ON_LEAVE') {
      return errorResponse(res, 403, error.message);
    }
    return errorResponse(res, 400, error.message);
  }
};
