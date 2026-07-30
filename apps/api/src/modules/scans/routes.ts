import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.post('/:id/cancel', controller.cancel);
router.get('/:id/activity', controller.getActivity);

export default router;
