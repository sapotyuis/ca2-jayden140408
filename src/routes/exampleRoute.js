// 📋 EXAMPLE FILE — use this as a reference when creating your own route file.
// Copy this file, rename it, and wire up your own controller functions.

/**
 * Route definitions for tasks. Maps HTTP methods to controller functions.
 * Validation rules are declared inline; no business logic here.
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { getAllTasks, getTaskById, createTask, patchTask, deleteTask } from '../controllers/exampleController.js';

export const exampleRouter = Router();

exampleRouter.get('/', getAllTasks);
exampleRouter.get('/:id', getTaskById);

exampleRouter.post(
  '/',
  [body('title').notEmpty().withMessage('Title is required')],
  createTask
);

exampleRouter.put(
  '/:id',
  [body('title').optional().notEmpty().withMessage('Title is required')],
  patchTask
);

exampleRouter.delete('/:id', deleteTask);
