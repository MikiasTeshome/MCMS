import api from './api.js';
import axios from 'axios';

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

/** Public self-check — no auth token required */
export const selfCheckEmployee = async (employeeId) => {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/v1`
      : '/api/v1';
  const response = await axios.get(`${base}/self-check/${encodeURIComponent(employeeId)}`);
  return response.data;
};
