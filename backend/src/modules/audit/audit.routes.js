import { Router } from 'express';
import { getAuditLogs } from './audit.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Retrieve all audit records (Strictly ADMIN only)
router.get('/', protect, authorize(ROLES.ADMIN), getAuditLogs);

export default router;
