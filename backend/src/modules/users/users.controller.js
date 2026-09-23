import usersService from './users.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getUsers = async (req, res, next) => {
  try {
    const role = req.query.role;
    const result = await usersService.getUsers(req.query);
    return successResponse(res, 200, 'Users list retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, campusId } = req.body;

    if (!email || !name) {
      return errorResponse(res, 400, 'Please provide email and name fields');
    }

    if (String(password || '').trim().length < 8) {
      return errorResponse(res, 400, 'Password must be at least 8 characters');
    }

    if (role === 'CAFE_STAFF' && !campusId) {
      return errorResponse(res, 400, 'Cafe staff must be assigned to a campus');
    }

    const user = await usersService.createUser(req.body, req.user.id, req);
    return successResponse(res, 201, 'User account created successfully', user);
  } catch (error) {
    if (
      error.message === 'Cafe staff must be assigned to a campus' ||
      error.message === 'Cafe staff must be assigned to an active campus' ||
      error.message === 'Create employees from the Employees page, not Users' ||
      error.message.includes('8 characters')
    ) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const user = await usersService.resetPassword(req.params.id, req.body.password, req.user.id, req);
    return successResponse(res, 200, 'Password updated. Share the new password with the user in person.', user);
  } catch (error) {
    if (error.message === 'User not found') {
      return errorResponse(res, 404, error.message);
    }
    if (error.message.includes('8 characters') || error.message.includes('Employees do not log in')) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.user.id, req);
    return successResponse(res, 200, 'User updated', user);
  } catch (error) {
    if (error.message === 'User not found') {
      return errorResponse(res, 404, error.message);
    }
    if (error.message === 'Cafe staff must be assigned to a campus') {
      return errorResponse(res, 400, error.message);
    }
    if (
      error.message === 'You cannot deactivate your own account' ||
      error.message === 'Keep at least one active administrator' ||
      error.message.includes('Employees do not log in')
    ) {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};
