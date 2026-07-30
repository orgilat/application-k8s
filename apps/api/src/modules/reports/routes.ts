import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.get('/:id/content', controller.getContent);
router.post('/:id/regenerate', controller.regenerate);

export default router;
