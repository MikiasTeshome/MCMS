import mealsService from './meals.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getMeals = async (req, res, next) => {
  try {
    const status = req.query.status;
    // Inspect locale from i18nMiddleware
    const result = await mealsService.getMeals({ status }, req.locale);
    return successResponse(res, 200, 'Meals retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const createMeal = async (req, res, next) => {
  try {
    const { nameEn, nameAm, nameEs, price } = req.body;
    const amName = nameAm || nameEs;

    if (!nameEn || !amName || price === undefined) {
      return errorResponse(res, 400, 'Please provide nameEn, nameAm and price fields');
    }

    const meal = await mealsService.createMeal(req.body, req.user.id, req);
    return successResponse(res, 201, 'Meal item created successfully', meal);
  } catch (error) {
    next(error);
  }
};

export const updateMeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meal = await mealsService.updateMeal(id, req.body, req.user.id, req);
    return successResponse(res, 200, 'Meal item updated successfully', meal);
  } catch (error) {
    if (error.message === 'Meal item not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};
