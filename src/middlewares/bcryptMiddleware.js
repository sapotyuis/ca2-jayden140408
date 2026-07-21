import bcrypt from 'bcrypt';

const saltRounds = 10;

export const comparePassword = (req, res, next) => {
    const callback = (err, isMatch) => {
        if (err) {
            console.log('password comparison error', err);
            console.error('Error bcrypt:', err);
            res.status(500).json(err);
        } else {
            if (isMatch) {
                next();
            } else {
                console.log('password comparison rejected');
                res.status(401).json({
                    message: 'Wrong password',
                });
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
            res.status(500).json(err);
        } else {
            res.locals.hash = hash;
            next();
        }
    };

    bcrypt.hash(req.body.password, saltRounds, callback);
};
