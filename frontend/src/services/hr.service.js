import api from './api.js';

export const generateQR = async (employeeId) => {
  const response = await api.post(`/hr/employees/${employeeId}/generate-qr`);
  return response.data;
};
