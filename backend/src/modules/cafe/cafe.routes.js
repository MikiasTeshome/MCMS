import { Router } from 'express';
import { verifyCard, issueCoupon } from './cafe.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = Router();

// Cafe Staff or Admins can verify QR cards
router.get('/verify-card/:cardId', protect, authorize('ADMIN', 'CAFE_STAFF'), verifyCard);

// Cafe Staff or Admins can issue/claim coupons
router.post('/issue-coupon', protect, authorize('ADMIN', 'CAFE_STAFF'), issueCoupon);

export default router;
