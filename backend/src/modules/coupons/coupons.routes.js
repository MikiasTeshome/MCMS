import { Router } from 'express';
import { getCouponScanReport, downloadPaymentOrder } from './coupons.controller.js';
import { scanCoupon, issueScannedCoupon, getDeskStatus } from './coupons.scan.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

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
router.post('/scan', protect, authorize(ROLES.ADMIN, ROLES.CAFE_STAFF), scanCoupon);
router.post('/issue', protect, authorize(ROLES.ADMIN, ROLES.CAFE_STAFF), issueScannedCoupon);

export default router;
