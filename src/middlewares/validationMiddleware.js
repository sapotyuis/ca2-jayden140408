import { validationResult } from 'express-validator';
import { AppError } from '../utils/_errors.js';

/**
 * Express middleware — collects the results of any express-validator `body()`/`param()`
 * checks declared earlier in the same route's middleware array.
 *
 * Centralizing this here means every route follows the same shape — validators, then this,
 * then the controller — so a validation failure always fails at the same place in the chain
 * instead of being re-checked (or forgotten) inside individual controllers.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Surface only the first failure — the frontend shows one message at a time.
    return next(new AppError('VALIDATION_ERROR', errors.array()[0].msg));
  }

  next();
};
