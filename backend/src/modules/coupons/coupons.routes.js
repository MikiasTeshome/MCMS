import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getCouponScanReport, downloadPaymentOrder } from './coupons.controller.js';
import { scanCoupon, issueScannedCoupon, getDeskStatus } from './coupons.scan.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';
import { config } from '../../config/index.js';

const cafeMealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.cafeRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many scan requests from this desk. Wait a moment and try again.',
  },
});

const router = Router();

router.get(
  '/reports/scans',
  protect,
  authorize(ROLES.ADMIN, ROLES.HR, ROLES.FINANCE, ROLES.CAFE_STAFF),
  getCouponScanReport
);

router.get(
  '/reports/payment-order',
  protect,
  authorize(ROLES.HR),
  downloadPaymentOrder
);

router.get('/desk', protect, authorize(ROLES.ADMIN, ROLES.CAFE_STAFF), getDeskStatus);
router.post(
  '/scan',
  cafeMealLimiter,
  protect,
  authorize(ROLES.ADMIN, ROLES.CAFE_STAFF),
  scanCoupon
);
router.post(
  '/issue',
  cafeMealLimiter,
  protect,
  authorize(ROLES.ADMIN, ROLES.CAFE_STAFF),
  issueScannedCoupon
);

export default router;
