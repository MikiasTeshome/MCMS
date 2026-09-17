import api from './api.js';

export const getCampuses = async () => {
  const response = await api.get('/campuses');
  return response.data;
};

export const createCampus = async (payload) => {
  const response = await api.post('/campuses', payload);
  return response.data;
};

export const updateCampus = async (id, payload) => {
  const response = await api.put(`/campuses/${id}`, payload);
  return response.data;
};

export const assignCampusVendor = async (campusId, vendorId) => {
  const response = await api.post(`/campuses/${campusId}/vendor`, { vendorId });
  return response.data;
};

export const getVendors = async () => {
  const response = await api.get('/campuses/vendors');
  return response.data;
};

export const createVendor = async (payload) => {
  const response = await api.post('/campuses/vendors', payload);
  return response.data;
};

export const updateVendor = async (id, payload) => {
  const response = await api.put(`/campuses/vendors/${id}`, payload);
  return response.data;
};

export const getHolidays = async () => {
  const response = await api.get('/holidays');
  return response.data;
};

export const createHoliday = async (payload) => {
  const response = await api.post('/holidays', payload);
  return response.data;
};

export const deleteHoliday = async (id) => {
  const response = await api.delete(`/holidays/${id}`);
  return response.data;
};

export const getPrintCards = async () => {
  const response = await api.get('/employees/print-cards');
  return response.data;
};
