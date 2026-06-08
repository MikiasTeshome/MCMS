import api from './api.js';

export const getMeals = async (params = {}) => {
  const response = await api.get('/meals', { params });
  return response.data;
};

export const createMeal = async (mealData) => {
  const response = await api.post('/meals', mealData);
  return response.data;
};

export const updateMeal = async (id, mealData) => {
  const response = await api.put(`/meals/${id}`, mealData);
  return response.data;
};
