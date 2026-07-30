import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/:id/findings', controller.getFindings);
router.get('/:id/scans', controller.getScans);
router.get('/:id/activity', controller.getActivity);
router.patch('/:id/criticality', controller.updateCriticality);
router.patch('/:id/owner', controller.updateOwner);
router.post('/:id/tags', controller.addTag);
router.delete('/:id/tags/:tag', controller.removeTag);

export default router;
