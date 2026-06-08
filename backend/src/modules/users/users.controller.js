import usersService from './users.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getUsers = async (req, res, next) => {
  try {
    const role = req.query.role;
    const result = await usersService.getUsers({ role });
    return successResponse(res, 200, 'Users list retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !name) {
      return errorResponse(res, 400, 'Please provide email and name fields');
    }

    const user = await usersService.createUser(req.body, req.user.id, req);
    return successResponse(res, 201, 'User account created successfully', user);
  } catch (error) {
    next(error);
  }
};
