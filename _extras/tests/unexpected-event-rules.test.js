import { calculateUnexpectedEventOutcome } from '../../src/utils/unexpectedEventRules.js';

describe('unexpected event rules', () => {
  it('prevents all configured consequences when the matching defense is built', () => {
    const outcome = calculateUnexpectedEventOutcome({
      event: {
        event_name: 'Tsunami',
        prevention_upgrade_type: 'Shelter',
        loss_item_type_id: 1,
        loss_item_quantity: 2,
        hunger_delta: -20,
      },
      userUpgrades: ['Shelter'],
      inventory: [{ item_type_id: 1, quantity: 5 }],
      lossItemName: 'Wood Plank',
    });

    expect(outcome).toMatchObject({
      prevented: true,
      protectionUpgradeType: 'Shelter',
      lostItemQuantity: 0,
      hungerChange: 0,
      outcome: 'prevented',
    });
  });

  it('caps unprotected loss at the inventory quantity', () => {
    const outcome = calculateUnexpectedEventOutcome({
      event: {
        event_name: 'Tsunami',
        prevention_upgrade_type: 'Shelter',
        loss_item_type_id: 1,
        loss_item_quantity: 2,
        hunger_delta: -20,
      },
      userUpgrades: [],
      inventory: [{ item_type_id: 1, quantity: 1 }],
      lossItemName: 'Wood Plank',
    });

    expect(outcome).toMatchObject({
      prevented: false,
      lostItemTypeId: 1,
      lostItemQuantity: 1,
      hungerChange: -20,
      outcome: 'item_loss',
    });
  });

  it('does not report a loss when the target item is not in storage', () => {
    const outcome = calculateUnexpectedEventOutcome({
      event: {
        event_name: 'Shark Attack',
        prevention_upgrade_type: 'Spear Rack',
        loss_item_type_id: 4,
        loss_item_quantity: 1,
        hunger_delta: -10,
      },
      userUpgrades: [],
      inventory: [],
      lossItemName: 'Grilled Fish',
    });

    expect(outcome).toMatchObject({
      prevented: false,
      lostItemQuantity: 0,
      hungerChange: -10,
      outcome: 'no_item_lost',
    });
  });
});
