import api from './api.js';

export const getCoupons = async (params = {}) => {
  const response = await api.get('/coupons', { params });
  return response.data;
};

export const issueCoupon = async (beneficiaryId, mealId, expiresAt) => {
  const response = await api.post('/coupons', { beneficiaryId, mealId, expiresAt });
  return response.data;
};

export const redeemCoupon = async (code) => {
  const response = await api.post('/coupons/redeem', { code });
  return response.data;
};
