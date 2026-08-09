import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN;
const tokenAlgorithm = process.env.JWT_ALGORITHM;

export const generateToken = (req, res, next) => {
    const payload = {
        userId: res.locals.userId,
        timestamp: new Date(),
    };

    const options = {
        algorithm: tokenAlgorithm,
        expiresIn: tokenDuration,
    };

    const callback = (err, token) => {
        if (err) {
            console.log('token generation error', err);
            console.error('Error jwt:', err);
            res.status(500).json(err);
        } else {
            res.locals.token = token;
            next();
        }
    };

    jwt.sign(payload, secretKey, options, callback);
};

export const sendToken = (req, res, next) => {
    console.log('[AUTH] login success', { user_id: res.locals.userId });
    res.status(200).json({
        message: res.locals.message,
        token: res.locals.token,
    });
};

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('token verification rejected', 'authorization header missing or malformed');
        return res.status(401).json({ error: 'Invalid token' });
    }

    const token = authHeader.substring(7);

    if (!token) {
        console.log('token verification rejected', 'bearer token missing');
        return res.status(401).json({ error: 'No token provided' });
    }

    const callback = (err, decoded) => {
        if (err) {
            console.log('token verification error', err);
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.locals.userId = decoded.userId;
        res.locals.tokenTimestamp = decoded.timestamp;
        next();
    };

    jwt.verify(token, secretKey, callback);
};
