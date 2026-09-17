import couponsService from './coupons.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getCouponScanReport = async (req, res, next) => {
  try {
    const result = await couponsService.getCouponScanReport(req.query, req.user);
    return successResponse(res, 200, 'Coupon scan report retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const downloadPaymentOrder = async (req, res, next) => {
  try {
    const { buffer, filename } = await couponsService.buildPaymentOrderDocx(
      req.query,
      req.user
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    return res.send(buffer);
  } catch (error) {
    if (error.statusCode === 400) {
      return errorResponse(res, 400, error.message);
    }
    if (error.statusCode === 403) {
      return errorResponse(res, 403, error.message);
    }
    next(error);
  }
};
