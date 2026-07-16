import { Router } from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser } from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('username').notEmpty().withMessage('username is required'),
    body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  ],
  registerUser
);

authRouter.post(
  '/login',
  [
    body('username').notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  loginUser
);
