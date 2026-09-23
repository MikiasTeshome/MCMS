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

    if (typeof email !== 'string' || typeof password !== 'string') {
      return errorResponse(res, 400, 'Please provide email and password');
    }

    if (password.length > 128 || email.length > 254) {
      return errorResponse(res, 400, 'Please provide email and password');
    }

    const result = await authService.login(email, password, req);
    return successResponse(res, 200, 'Authentication successful', result);
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return errorResponse(res, 401, 'Invalid email or password');
    }
    if (error.message === 'Account inactive') {
      return errorResponse(res, 403, 'Account is inactive. Please contact HR or an administrator.');
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

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return errorResponse(res, 400, 'Enter your current password and a new password');
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword, req);
    return successResponse(res, 200, 'Password changed. Use the new password next time you sign in.');
  } catch (error) {
    const mapped = {
      WRONG_PASSWORD: 400,
      WEAK_PASSWORD: 400,
      SAME_PASSWORD: 400,
      INVALID_PASSWORD: 400,
      UNAUTHORIZED: 401,
    };
    if (error.code && mapped[error.code]) {
      return errorResponse(res, mapped[error.code], error.message, error.code);
    }
    next(error);
  }
};
