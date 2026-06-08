import cafeService from './cafe.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const verifyCard = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    if (!cardId) {
      return errorResponse(res, 400, 'Card ID (QR Code payload) is required');
    }
    const result = await cafeService.verifyCard(cardId, req.user.id, req);
    return successResponse(res, 200, 'Card verified successfully', result);
  } catch (error) {
    next(error);
  }
};

export const issueCoupon = async (req, res, next) => {
  try {
    const { cardId, bulk, overrideReason } = req.body;
    if (!cardId) {
      return errorResponse(res, 400, 'Card ID is required');
    }

    const result = await cafeService.issueCoupon(
      { cardId, bulk, overrideReason },
      req.user.id,
      req
    );

    return successResponse(res, 200, 'Coupon(s) issued successfully', result);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
};
