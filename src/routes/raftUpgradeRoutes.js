import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { getAllRaftUpgrades, getRaftUpgradeById, createRaftUpgrade, patchRaftUpgrade, deleteRaftUpgrade } from '../controllers/raftUpgradeController.js';

export const raftUpgradeRouter = Router();

raftUpgradeRouter.get('/', getAllRaftUpgrades);
raftUpgradeRouter.get('/:upgrade_id', getRaftUpgradeById);

raftUpgradeRouter.post(
  '/',
  verifyToken,
  [
    body('user_id').notEmpty().withMessage('user_id is required'),
    body('upgrade_type').notEmpty().withMessage('upgrade_type is required'),
    body('material_cost').isInt({ min: 0 }).withMessage('material_cost must be a non-negative integer'),
  ],
  createRaftUpgrade
);

raftUpgradeRouter.patch(
  '/:upgrade_id',
  verifyToken,
  [
    body('upgrade_type').optional().notEmpty().withMessage('upgrade_type cannot be empty'),
    body('material_cost').optional().isInt({ min: 0 }).withMessage('material_cost must be a non-negative integer'),
  ],
  patchRaftUpgrade
);

raftUpgradeRouter.delete('/:upgrade_id', verifyToken, deleteRaftUpgrade);
