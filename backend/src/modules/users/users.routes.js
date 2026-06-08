import { Router } from 'express';
import { getUsers, createUser } from './users.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Retrieve all user accounts (ADMIN or HR only)
router.get('/', protect, authorize(ROLES.ADMIN, ROLES.HR), getUsers);

// Provision new user (ADMIN or HR only)
router.post('/', protect, authorize(ROLES.ADMIN, ROLES.HR), createUser);

export default router;
