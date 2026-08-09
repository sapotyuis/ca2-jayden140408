import { db } from '../db/connection.js';

/**
 * A response that should be sent after the current transaction has rolled back.
 * Gameplay controller steps use this for expected non-500 outcomes such as cooldowns and conflicts.
 */
export class PipelineResponse extends Error {
  constructor(status, body) {
    super(body?.error?.message || 'Request rejected');
    this.status = status;
    this.body = body;
    this.isPipelineResponse = true;
  }
}

const runStep = (step, req, res) => new Promise((resolve, reject) => {
  let settled = false;

  const next = (error) => {
    if (settled) return;
    settled = true;
    if (error) reject(error);
    else resolve();
  };

  try {
    const result = step(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (error) {
    next(error);
  }
});

/**
 * Runs model-specific controller steps inside one shared Drizzle transaction.
 * Each step receives the transaction client through res.locals.tx and must call next().
 * The response is deliberately sent only after the transaction commits.
 */
export const transactionalPipeline = (steps, { onError } = {}) => async (req, res, next) => {
  try {
    await db.transaction(async (tx) => {
      res.locals.tx = tx;
      for (const step of steps) await runStep(step, req, res);
    });
    delete res.locals.tx;
    next();
  } catch (error) {
    delete res.locals.tx;
    if (onError) await onError(error, req, res);
    if (error?.isPipelineResponse) return res.status(error.status).json(error.body);
    next(error);
  }
};
