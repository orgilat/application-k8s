import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.post('/:id/start', controller.start);
router.post('/:id/complete', controller.complete);
router.get('/:id/activity', controller.getActivity);

export default router;
