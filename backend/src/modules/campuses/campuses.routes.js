import { Router } from 'express';
import {
  listCampuses,
  createCampus,
  updateCampus,
  listVendors,
  createVendor,
  updateVendor,
  assignVendor,
} from './campuses.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = Router();

router.get('/vendors', protect, authorize('ADMIN', 'HR', 'FINANCE'), listVendors);
router.post('/vendors', protect, authorize('ADMIN', 'HR'), createVendor);
router.put('/vendors/:id', protect, authorize('ADMIN', 'HR'), updateVendor);

router.get('/', protect, authorize('ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF'), listCampuses);
router.post('/', protect, authorize('ADMIN', 'HR'), createCampus);
router.put('/:id', protect, authorize('ADMIN', 'HR'), updateCampus);
router.post('/:id/vendor', protect, authorize('ADMIN', 'HR'), assignVendor);

export default router;
