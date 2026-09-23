import api from './api.js';

export const authLogin = async (email, password) => {
  const response = await api.post('/auth/login', {
    email: String(email || '').trim().toLowerCase(),
    password,
  });
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data;
};
