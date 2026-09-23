import api from './api.js';

export const getDeskStatus = async () => {
  const response = await api.get('/coupons/desk');
  return response.data;
};

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

export const getCouponScanReport = async (params = {}) => {
  const response = await api.get('/coupons/reports/scans', { params });
  return response.data;
};

const filenameFromDisposition = (header) => {
  if (!header) return 'payment-order.docx';
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] || 'payment-order.docx';
};

export const downloadPaymentOrder = async (params = {}) => {
  try {
    const response = await api.get('/coupons/reports/payment-order', {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFromDisposition(response.headers['content-disposition']);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    const data = err.response?.data;
    if (data instanceof Blob) {
      const text = await data.text();
      try {
        const json = JSON.parse(text);
        const error = new Error(json.message || 'Could not generate the payment letter.');
        throw error;
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) {
          throw new Error('Could not generate the payment letter.');
        }
        throw parseErr;
      }
    }
    throw err;
  }
};
