// Handles survivor registration and login requests.
import { findUserByUsername, insertUser } from '../models/survivorDirectoryModel.js';

/** Register a new user. Validation runs as route middleware. Returns 409 if the username is already taken. */
export const registerPlayer = async (req, res, next) => {
  try {
    console.log('[AUTH] register attempt', { username: req.body.username });
    const existing = await findUserByUsername(req.body.username);
    if (existing) {
      console.warn('[AUTH] register rejected', { username: req.body.username, reason: 'username_taken' });
      return res.status(409).json({ error: { code: 'CONFLICT', message: `Username "${req.body.username}" is already taken` } });
    }

    const user = await insertUser({ username: req.body.username, password: res.locals.hash });

    console.log('[AUTH] register success', { user_id: user.user_id, username: user.username });
    res.status(201).json({ message: 'Registration successful', user });
  } catch (error) {
    next(error);
  }
};

/** Loads the user data required by comparePassword and generateToken. */
export const loginPlayer = async (req, res, next) => {
  try {
    console.log('[AUTH] login attempt', { username: req.body.username });
    const user = await findUserByUsername(req.body.username);
    if (!user) {
      console.warn('[AUTH] login rejected', { username: req.body.username, reason: 'user_not_found' });
      return res.status(404).json({ message: 'User not found' });
    }

    res.locals.hash = user.password;
    res.locals.userId = user.user_id;
    res.locals.message = 'Login successful';
    console.log('[AUTH] login user found', { user_id: user.user_id, username: user.username });
    next();
  } catch (error) {
    next(error);
  }
};
