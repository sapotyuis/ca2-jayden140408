import 'dotenv/config';
import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN;
const tokenAlgorithm = process.env.JWT_ALGORITHM;

/** Signs and returns a JWT for the given user_id. Called by the login controller after password verification. */
export const generateToken = (userId) => {
  return jwt.sign({ userId }, secretKey, {
    algorithm: tokenAlgorithm,
    expiresIn: tokenDuration,
  });
};

/**
 * Express middleware — verifies the `Authorization: Bearer <token>` header.
 * On success, attaches the decoded user_id to `req.userId` and calls next().
 * Apply this to any route that requires a logged-in user.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
  }

  const token = authHeader.substring(7);

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }

    req.userId = decoded.userId;
    next();
  });
};
