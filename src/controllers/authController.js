import { findUserByUsername, insertUser } from '../models/userModel.js';

/** Register a new user. Validation runs as route middleware. Returns 409 if the username is already taken. */
export const registerUser = async (req, res, next) => {
  try {
    const existing = await findUserByUsername(req.body.username);
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: `Username "${req.body.username}" is already taken` } });
    }

    const user = await insertUser({ username: req.body.username, password: res.locals.hash });

    res.status(201).json({ message: 'Registration successful', user });
  } catch (error) {
    next(error);
  }
};

/** Loads the user data required by comparePassword and generateToken. */
export const loginUser = async (req, res, next) => {
  try {
    const user = await findUserByUsername(req.body.username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.locals.hash = user.password;
    res.locals.userId = user.user_id;
    res.locals.message = 'Login successful';
    next();
  } catch (error) {
    next(error);
  }
};
