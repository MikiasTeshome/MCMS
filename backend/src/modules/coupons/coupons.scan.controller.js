import couponsScanService from './coupons.scan.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

const cafeFail = (res, status, error) =>
  errorResponse(res, status, error.message || error, error.code || error);

export const scanCoupon = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return errorResponse(res, 400, 'Scan the employee QR card first.', 'QR_INVALID');
    }

    const data = await couponsScanService.scanEmployee(
      employeeId,
      req.user.id,
      req
    );
    return successResponse(res, 200, 'Employee verified successfully', data);
  } catch (error) {
    if (error.code === 'QR_INVALID' || error.message === 'Invalid QR code.') {
      return cafeFail(res, 400, {
        message: error.message || 'This QR card is not valid.',
        code: 'QR_INVALID',
      });
    }
    if (error.code === 'QR_BLOCKED') {
      return cafeFail(res, 403, error);
    }
    if (error.code === 'NOT_FOUND') {
      return cafeFail(res, 404, error);
    }
    if (error.code === 'INACTIVE') {
      return cafeFail(res, 400, error);
    }
    if (error.code === 'ON_LEAVE') {
      return cafeFail(res, 403, error);
    }
    if (error.code === 'NO_CAMPUS' || error.code === 'NO_VENDOR') {
      return cafeFail(res, 400, error);
    }
    next(error);
  }
};

export const issueScannedCoupon = async (req, res, next) => {
  try {
    const { employeeId, quantity, overrideReason } = req.body;
    if (!employeeId) {
      return errorResponse(res, 400, 'Scan the employee QR card first.', 'SCAN_REQUIRED');
    }

    const data = await couponsScanService.issueCoupons(
      { employeeId, quantity, overrideReason },
      req.user,
      req
    );
    return successResponse(res, 200, 'Meal(s) recorded successfully', data);
  } catch (error) {
    const mapped = {
      SCAN_REQUIRED: 400,
      NO_COUPONS: 400,
      QR_INVALID: 400,
      QR_BLOCKED: 403,
      CAP_NOT_REACHED: 400,
      DUPLICATE_CLAIM: 400,
      HOLIDAY: 400,
      WEEKEND: 400,
      ON_LEAVE: 403,
      INACTIVE: 400,
      NOT_FOUND: 404,
      NO_CAMPUS: 400,
      NO_VENDOR: 400,
    };
    if (error.code && mapped[error.code]) {
      return cafeFail(res, mapped[error.code], error);
    }
    return errorResponse(res, 400, error.message);
  }
};
