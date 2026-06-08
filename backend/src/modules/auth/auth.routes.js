import { Router } from 'express';
import { login, getMe } from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

// Public login route
router.post('/login', login);

// Protected session check route
router.get('/me', protect, getMe);

export default router;
