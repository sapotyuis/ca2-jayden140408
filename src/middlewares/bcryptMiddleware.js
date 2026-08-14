import bcrypt from 'bcrypt';

const saltRounds = 10;

const sendInternalError = (res) => res.status(500).json({
    error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
    },
});

const sendUnauthorized = (res, message) => res.status(401).json({
    error: {
        code: 'UNAUTHORIZED',
        message,
        status: 401,
    },
});

export const comparePassword = (req, res, next) => {
    const callback = (err, isMatch) => {
        if (err) {
            console.log('password comparison error', err);
            console.error('Error bcrypt:', err);
            sendInternalError(res);
        } else {
            if (isMatch) {
                next();
            } else {
                console.log('password comparison rejected');
                sendUnauthorized(res, 'Wrong password');
            }
        }
    };

    bcrypt.compare(req.body.password, res.locals.hash, callback);
};

export const hashPassword = (req, res, next) => {
    const callback = (err, hash) => {
        if (err) {
            console.log('password hashing error', err);
            console.error('Error bcrypt:', err);
            sendInternalError(res);
        } else {
            res.locals.hash = hash;
            next();
        }
    };

    bcrypt.hash(req.body.password, saltRounds, callback);
};
