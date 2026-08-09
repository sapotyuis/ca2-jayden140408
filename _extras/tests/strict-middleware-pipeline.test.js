import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { transactionalPipeline } from '../../src/middlewares/transactionMiddleware.js';

const meRoutes = readFileSync(new URL('../../src/routes/meRoutes.js', import.meta.url), 'utf8');
const gameplayMiddleware = readFileSync(new URL('../../src/controllers/gameplayStepsController.js', import.meta.url), 'utf8');

describe('strict gameplay middleware pipelines', () => {
  it('routes multi-step gameplay actions through transactional model middleware', () => {
    expect(meRoutes).toContain("from '../controllers/gameplayStepsController.js'");
    expect(gameplayMiddleware).toContain('transactionalPipeline');
    expect(meRoutes).toContain('collectDebrisPipeline');
    expect(meRoutes).toContain('craftItemPipeline');
    expect(meRoutes).toContain('raftUpgradePipeline');
    expect(meRoutes).toContain('unexpectedEventPipeline');
    expect(meRoutes).toContain('questRewardPipeline');
  });

  it('passes one shared transaction client through every middleware step', async () => {
    const seen = [];
    const pipeline = transactionalPipeline([
      (req, res, next) => {
        seen.push('first');
        res.locals.firstStep = true;
        next();
      },
      (req, res, next) => {
        seen.push(res.locals.firstStep && res.locals.tx ? 'shared-transaction' : 'missing-transaction');
        next();
      },
    ]);
    const req = {};
    const res = { locals: {}, status: () => res, json: () => res };

    await new Promise((resolve, reject) => pipeline(req, res, (error) => (error ? reject(error) : resolve())));

    expect(seen).toEqual(['first', 'shared-transaction']);
    expect(res.locals.tx).toBeUndefined();
  });
});
