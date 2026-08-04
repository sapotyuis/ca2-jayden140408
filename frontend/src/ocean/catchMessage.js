export const describeCatch = (data = {}) => {
  const items = (data.found || [])
    .map((foundItem) => `${foundItem.item_name} ×${foundItem.quantity}`)
    .join(', ');
  const parts = [];

  if (Number(data.collected) > 0) parts.push(`+${data.collected} materials`);
  if (items) parts.push(items);
  if (data.bonus_reason) parts.push(data.bonus_reason);

  return parts.join(' · ') || 'Collected salvage';
};
