import employeesService from './employees.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const getPrintCards = async (req, res, next) => {
  try {
    const cards = await employeesService.getPrintCards();
    return successResponse(res, 200, 'Print cards retrieved', cards);
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const result = await employeesService.getEmployees(req.query);
    return successResponse(res, 200, 'Employees list retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Strict validation
    if (!name) {
      return errorResponse(res, 400, 'Please provide the employee full name');
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

export const bulkImportEmployees = async (req, res, next) => {
  try {
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return errorResponse(res, 400, 'Please provide a non-empty array of employee rows');
    }

    if (rows.length > 500) {
      return errorResponse(res, 400, 'Maximum 500 employees per import batch');
    }

    const results = await employeesService.bulkImportEmployees(rows, req.user.id, req);
    return successResponse(res, 200, 'Bulk import completed', results);
  } catch (error) {
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
    if (error.code === 'HAS_CLAIMS') {
      return errorResponse(res, 400, error.message);
    }
    next(error);
  }
};
