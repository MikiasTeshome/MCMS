import { Router } from 'express';
import { getUsers, createUser, resetPassword, updateUser } from './users.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Retrieve all user accounts (ADMIN only)
router.get('/', protect, authorize(ROLES.ADMIN), getUsers);

// Provision new user (ADMIN only)
router.post('/', protect, authorize(ROLES.ADMIN), createUser);

router.put('/:id/password', protect, authorize(ROLES.ADMIN), resetPassword);
router.put('/:id', protect, authorize(ROLES.ADMIN), updateUser);

export default router;
