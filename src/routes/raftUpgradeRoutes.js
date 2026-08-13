import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/jwtMiddleware.js';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { loadCurrentUser } from '../controllers/meController.js';
import { getAllRaftUpgrades, getRaftUpgradeById, validateRaftUpgradeUser, loadRaftUpgradeForOwner, createRaftUpgrade, patchRaftUpgrade, deleteRaftUpgrade } from '../controllers/raftUpgradeController.js';

export const raftUpgradeRouter = Router();

raftUpgradeRouter.get('/', verifyToken, loadCurrentUser, getAllRaftUpgrades);
raftUpgradeRouter.get('/:upgrade_id', verifyToken, loadCurrentUser, loadRaftUpgradeForOwner, getRaftUpgradeById);

raftUpgradeRouter.post(
  '/',
  verifyToken,
  loadCurrentUser,
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer'),
    body('upgrade_type').notEmpty().withMessage('upgrade_type is required'),
    body('material_cost').isInt({ min: 0 }).withMessage('material_cost must be a non-negative integer'),
  ],
  handleValidationErrors,
  validateRaftUpgradeUser,
  createRaftUpgrade
);

raftUpgradeRouter.patch(
  '/:upgrade_id',
  verifyToken,
  loadCurrentUser,
  [
    body('upgrade_type').optional().notEmpty().withMessage('upgrade_type cannot be empty'),
    body('material_cost').optional().isInt({ min: 0 }).withMessage('material_cost must be a non-negative integer'),
  ],
  handleValidationErrors,
  loadRaftUpgradeForOwner,
  patchRaftUpgrade
);

raftUpgradeRouter.delete('/:upgrade_id', verifyToken, loadCurrentUser, loadRaftUpgradeForOwner, deleteRaftUpgrade);
