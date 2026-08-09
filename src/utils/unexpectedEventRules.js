/**
 * Calculates the server-side consequence of one unexpected event without mutating data.
 * Database writes use this plan inside a transaction, while tests can verify game balance
 * rules without needing a live database.
 */
export const calculateUnexpectedEventOutcome = ({
  event,
  userUpgrades = [],
  inventory = [],
  lossItemName = 'item',
}) => {
  const protectionUpgradeType = event.prevention_upgrade_type || null;
  const prevented = Boolean(protectionUpgradeType && userUpgrades.includes(protectionUpgradeType));
  const lossItemTypeId = event.loss_item_type_id || null;
  const requestedLossQuantity = Math.max(0, Number(event.loss_item_quantity) || 0);
  const availableQuantity = inventory
    .filter((item) => item.item_type_id === lossItemTypeId)
    .reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
  const lostItemQuantity = prevented ? 0 : Math.min(requestedLossQuantity, availableQuantity);
  const outcome = prevented ? 'prevented' : lostItemQuantity > 0 ? 'item_loss' : 'no_item_lost';
  const message = prevented
    ? `${event.event_name} was stopped by your ${protectionUpgradeType}.`
    : lostItemQuantity > 0
      ? `${event.event_name} caused you to lose ${lostItemQuantity} ${lossItemName}.`
      : `${event.event_name} hit, but no ${lossItemName} was in storage.`;

  return {
    prevented,
    protectionUpgradeType,
    lostItemTypeId: lostItemQuantity > 0 ? lossItemTypeId : null,
    lostItemQuantity,
    outcome,
    message,
  };
};
