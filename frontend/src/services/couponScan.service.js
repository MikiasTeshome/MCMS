import api from './api.js';

export const scanEmployeeQr = async (employeeId) => {
  const response = await api.post('/coupons/scan', { employeeId });
  return response.data;
};

export const issueCoupons = async ({ employeeId, quantity, overrideReason }) => {
  const response = await api.post('/coupons/issue', {
    employeeId,
    quantity,
    overrideReason,
  });
  return response.data;
};

/** Authenticated self-check */
export const selfCheckEmployee = async (employeeId) => {
  const response = await api.get(`/self-check/${encodeURIComponent(employeeId)}`);
  return response.data;
};
