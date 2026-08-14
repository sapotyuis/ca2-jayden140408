// Defines read-only endpoints for the server-owned quest board.
import { Router } from 'express';
import { getAllQuests, getQuestById } from '../controllers/questBoardController.js';

export const questBoardRouter = Router();

questBoardRouter.get('/', getAllQuests);
questBoardRouter.get('/:quest_id', getQuestById);
