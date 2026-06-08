import { Router } from 'express';
import { selfCheckEmployee } from '../coupons/coupons.scan.controller.js';

const router = Router();

// Public read-only employee balance (no auth)
router.get('/:employeeId', selfCheckEmployee);

export default router;
