import api from './api.js';

export const getUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const provisionUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};
