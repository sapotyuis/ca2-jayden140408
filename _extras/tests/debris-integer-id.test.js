import { vi } from 'vitest';
import { checkDebrisCollection } from '../../src/controllers/gameplayActionsController.js';

describe('integer debris request IDs', () => {
  it('converts a positive integer route parameter into a number', () => {
    const req = { params: { debris_id: '42' }, body: {} };
    const res = { locals: {} };
    const next = vi.fn();

    checkDebrisCollection(req, res, next);

    expect(res.locals.debrisId).toBe(42);
    expect(next).toHaveBeenCalledWith();
  });

  it.each(['550e8400-e29b-41d4-a716-446655440000', '1.5', '0', '-1'])(
    'rejects non-positive-integer debris ID %s',
    (debrisId) => {
      const req = { params: { debris_id: debrisId }, body: {} };
      const res = { locals: {} };
      const next = vi.fn();

      checkDebrisCollection(req, res, next);

      expect(res.locals.debrisId).toBeUndefined();
      expect(next).toHaveBeenCalledOnce();
      expect(next.mock.calls[0][0]).toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    }
  );
});
