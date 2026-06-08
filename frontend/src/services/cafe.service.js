import api from './api.js';

export const verifyCard = async (cardId) => {
  const response = await api.get(`/cafe/verify-card/${cardId}`);
  return response.data;
};

export const issueCafeCoupon = async (payload) => {
  const response = await api.post('/cafe/issue-coupon', payload);
  return response.data;
};
