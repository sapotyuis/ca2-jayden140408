// Defines public registration and login endpoints.
import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middlewares/validationMiddleware.js';
import { comparePassword, hashPassword } from '../middlewares/bcryptMiddleware.js';
import { generateToken, sendToken } from '../middlewares/jwtMiddleware.js';
import { registerPlayer, loginPlayer } from '../controllers/authController.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('username').notEmpty().withMessage('username is required'),
    body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  ],
  handleValidationErrors,
  hashPassword,
  registerPlayer
);

authRouter.post(
  '/login',
  [
    body('username').notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  handleValidationErrors,
  loginPlayer,
  comparePassword,
  generateToken,
  sendToken
);
