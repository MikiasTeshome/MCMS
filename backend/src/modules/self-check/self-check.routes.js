import { Router } from 'express';
import { selfCheckEmployee } from '../coupons/coupons.scan.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

// Authenticated read-only employee balance.
router.get('/:employeeId', protect, selfCheckEmployee);

export default router;
