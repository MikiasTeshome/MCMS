import { Router } from 'express';
import { getHolidays, createHoliday, deleteHoliday } from './holidays.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = Router();

// Holidays access: reading is public to logged in users, creation/deletion restricted to ADMIN or HR
router.get('/', protect, getHolidays);
router.post('/', protect, authorize('ADMIN', 'HR'), createHoliday);
router.delete('/:id', protect, authorize('ADMIN', 'HR'), deleteHoliday);

export default router;
