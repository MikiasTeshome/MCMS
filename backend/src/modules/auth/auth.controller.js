import authService from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

/**
 * Handles user authentication
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide email and password');
    }

    const result = await authService.login(email, password, req);
    return successResponse(res, 200, 'Authentication successful', result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return errorResponse(res, 401, 'Invalid email or password');
    }
    next(error);
  }
};

/**
 * Retrieves logged in profile details
 */
export const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    return successResponse(res, 200, 'User profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};
