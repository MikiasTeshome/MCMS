import couponsService from './coupons.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getCoupons = async (req, res, next) => {
  try {
    const filters = {
      beneficiaryId: req.query.beneficiaryId,
      vendorId: req.query.vendorId,
      status: req.query.status,
    };
    
    const result = await couponsService.getCoupons(filters, req.user);
    return successResponse(res, 200, 'Coupons retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const { beneficiaryId, mealId, expiresAt } = req.body;

    if (!beneficiaryId || !mealId || !expiresAt) {
      return errorResponse(res, 400, 'Please provide beneficiaryId, mealId and expiresAt');
    }

    const coupon = await couponsService.createCoupon(req.body, req.user.id, req);
    return successResponse(res, 201, 'Coupon issued successfully', coupon);
  } catch (error) {
    next(error);
  }
};

export const redeemCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return errorResponse(res, 400, 'Please provide coupon code to redeem');
    }

    const coupon = await couponsService.redeemCoupon(code, req.user.id, req);
    return successResponse(res, 200, 'Coupon redeemed successfully', coupon);
  } catch (error) {
    if (
      error.message === 'Coupon not found' || 
      error.message.includes('cannot be redeemed') || 
      error.message === 'Coupon has expired'
    ) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};
