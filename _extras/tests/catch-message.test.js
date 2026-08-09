import { describe, expect, it } from 'vitest';
import { describeCatch } from '../../frontend/js/ocean/catchMessage.js';

describe('debris collection message', () => {
  it('does not show zero materials for an item-only reward', () => {
    expect(describeCatch({
      collected: 0,
      found: [{ item_name: 'Collection Hook', quantity: 1 }],
    })).toBe('Collection Hook ×1');
  });

  it('shows the material total for a material reward', () => {
    expect(describeCatch({
      collected: 3,
      found: [{ item_name: 'Wood Plank', quantity: 3 }],
    })).toBe('+3 materials · Wood Plank ×3');
  });
});
