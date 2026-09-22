import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';
import { getDashboardStats } from './dashboard.controller.js';

const router = Router();

router.get(
  '/stats',
  protect,
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.FINANCE),
  getDashboardStats
);

export default router;
