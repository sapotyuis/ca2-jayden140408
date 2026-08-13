import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { transactionalPipeline } from '../../src/middlewares/transactionMiddleware.js';

const meRoutes = readFileSync(new URL('../../src/routes/meRoutes.js', import.meta.url), 'utf8');
const gameplayMiddleware = readFileSync(new URL('../../src/controllers/gameplayStepsController.js', import.meta.url), 'utf8');
const controllersPath = fileURLToPath(new URL('../../src/controllers/', import.meta.url));

const exportedFunctionBodies = (source) => {
  const functions = [];
  const declaration = /export const (\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
  let match;

  while ((match = declaration.exec(source))) {
    let depth = 1;
    let cursor = declaration.lastIndex;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === '{') depth += 1;
      if (source[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    functions.push({ name: match[1], body: source.slice(declaration.lastIndex, cursor - 1) });
    declaration.lastIndex = cursor;
  }

  return functions;
};

const importedModelFunctions = (source) => [...source.matchAll(
  /import\s*\{([\s\S]*?)\}\s*from\s*['"]\.\.\/models\/[^'"]+['"];?/g
)].flatMap((match) => match[1].split(',').map((name) => name.trim().split(/\s+as\s+/)[0]))
  .filter(Boolean);

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

  it('keeps every exported controller function to one model dependency', () => {
    const violations = [];

    for (const filename of readdirSync(controllersPath)) {
      if (!filename.endsWith('.js')) continue;
      const source = readFileSync(join(controllersPath, filename), 'utf8');
      const modelFunctions = importedModelFunctions(source);

      for (const { name, body } of exportedFunctionBodies(source)) {
        const calls = modelFunctions.filter((modelFunction) => new RegExp(`\\b${modelFunction}\\s*\\(`).test(body));
        if (new Set(calls).size > 1) violations.push(`${filename}:${name} -> ${[...new Set(calls)].join(', ')}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
