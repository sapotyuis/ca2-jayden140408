import { validationResult } from 'express-validator';
import { findUserByUsername, insertUser } from '../models/userModel.js';
import { hashPassword, comparePassword } from '../middlewares/bcryptMiddleware.js';
import { generateToken } from '../middlewares/jwtMiddleware.js';
import { AppError } from '../utils/_errors.js';

/** Register a new user. Returns 409 if the username is already taken. */
export const registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    const existing = await findUserByUsername(req.body.username);
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: `Username "${req.body.username}" is already taken` } });
    }

    const hashedPassword = await hashPassword(req.body.password);
    const user = await insertUser({ username: req.body.username, password: hashedPassword });

    res.status(201).json({ message: 'Registration successful', user });
  } catch (error) {
    next(error);
  }
};

/** Log in an existing user. Returns a JWT and public user info on success. */
export const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    const user = await findUserByUsername(req.body.username);
    // The same 401 is returned for an unknown username and a wrong password, so an
    // attacker cannot use the response to discover which usernames exist.
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Incorrect username or password' } });
    }

    const passwordMatches = await comparePassword(req.body.password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Incorrect username or password' } });
    }

    const token = generateToken(user.user_id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { user_id: user.user_id, username: user.username },
    });
  } catch (error) {
    next(error);
  }
};
