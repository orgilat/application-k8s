import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.post('/:id/link-finding', controller.linkFinding);
router.post('/:id/unlink-finding', controller.unlinkFinding);

export default router;
