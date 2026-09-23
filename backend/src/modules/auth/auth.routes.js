import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, getMe, changePassword } from './auth.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

router.post('/login', loginLimiter, login);

router.get('/me', protect, getMe);

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again after 15 minutes.',
  },
});

router.post('/change-password', protect, changePasswordLimiter, changePassword);

export default router;
