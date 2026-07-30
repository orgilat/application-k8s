import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.post('/:id/acknowledge', controller.acknowledge);
router.post('/:id/false-positive', controller.falsePositive);
router.post('/:id/reopen', controller.reopen);
router.post('/:id/start-remediation', controller.startRemediation);
router.post('/:id/link-ticket', controller.linkTicket);
router.get('/:id/activity', controller.getActivity);
router.post('/bulk/acknowledge', controller.bulkAcknowledge);
router.post('/bulk/false-positive', controller.bulkFalsePositive);
router.post('/bulk/assign-owner', controller.bulkAssignOwner);

export default router;
