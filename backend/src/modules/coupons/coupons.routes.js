import { Router } from 'express';
import { getCoupons, createCoupon, redeemCoupon } from './coupons.controller.js';
import { scanCoupon, issueScannedCoupon } from './coupons.scan.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// Retrieve coupons list (Protected - service filters scope by user role)
router.get('/', protect, getCoupons);

// Issue coupon (ADMIN or HR only)
router.post('/', protect, authorize(ROLES.ADMIN, ROLES.HR), createCoupon);

// Redeem/Scan coupon (ADMIN or CAFE_STAFF only)
router.post('/redeem', protect, authorize(ROLES.ADMIN, ROLES.CAFE_STAFF), redeemCoupon);

// QR employee card scan + issuance (cafe desk workflow)
router.post('/scan', protect, authorize(ROLES.ADMIN, ROLES.CAFE_STAFF), scanCoupon);
router.post('/issue', protect, authorize(ROLES.ADMIN, ROLES.CAFE_STAFF), issueScannedCoupon);

export default router;
