import employeesService from './employees.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getEmployees = async (req, res, next) => {
  try {
    const list = await employeesService.getEmployees();
    return successResponse(res, 200, 'Employees list retrieved successfully', list);
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { email, name, department, position, employeeIdNumber } = req.body;

    // Strict validation
    if (!email || !name || !department || !position || !employeeIdNumber) {
      return errorResponse(res, 400, 'Please provide email, name, department, position, and employeeIdNumber');
    }

    const employee = await employeesService.createEmployee(req.body, req.user.id, req);
    return successResponse(res, 201, 'Employee profile successfully provisioned', employee);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await employeesService.updateEmployee(id, req.body, req.user.id, req);
    return successResponse(res, 200, 'Employee updated successfully', employee);
  } catch (error) {
    if (error.message === 'Employee not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    await employeesService.deleteEmployee(id, req.user.id, req);
    return successResponse(res, 200, 'Employee profile successfully decommissioned');
  } catch (error) {
    if (error.message === 'Employee not found') {
      return errorResponse(res, 404, error.message);
    }
    next(error);
  }
};
