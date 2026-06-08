import { Router } from 'express';
import { getMeals, createMeal, updateMeal } from './meals.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Fetch meals list (Protected - open to all authenticated users)
router.get('/', protect, getMeals);

// Create meal (ADMIN or FINANCE only)
router.post('/', protect, authorize(ROLES.ADMIN, ROLES.FINANCE), createMeal);

// Update meal (ADMIN or FINANCE only)
router.put('/:id', protect, authorize(ROLES.ADMIN, ROLES.FINANCE), updateMeal);

export default router;
