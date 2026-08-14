// Defines read-only endpoints for the server-owned ocean-event catalogue.
import { Router } from 'express';
import { getAllOceanEvents, getOceanEventById } from '../controllers/oceanEventController.js';

export const oceanEventRouter = Router();

oceanEventRouter.get('/', getAllOceanEvents);
oceanEventRouter.get('/:event_id', getOceanEventById);
