import { Router } from 'express';
import { getEmployees, createEmployee, bulkImportEmployees, updateEmployee, deleteEmployee } from './employees.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = Router();

// Employee CRUD restricted to ADMIN or HR clearance
router.get('/', protect, authorize('ADMIN', 'HR'), getEmployees);
router.post('/', protect, authorize('ADMIN', 'HR'), createEmployee);
router.post('/import', protect, authorize('ADMIN', 'HR'), bulkImportEmployees);
router.put('/:id', protect, authorize('ADMIN', 'HR'), updateEmployee);
router.delete('/:id', protect, authorize('ADMIN', 'HR'), deleteEmployee);

export default router;
