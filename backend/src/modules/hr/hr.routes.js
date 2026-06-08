import { Router } from 'express';
import { generateQR } from './hr.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = Router();

// HR and Admins can generate QR codes for cards
router.post('/employees/:id/generate-qr', protect, authorize('ADMIN', 'HR'), generateQR);

export default router;
