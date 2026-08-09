/** These handlers only turn the middleware pipeline's res.locals values into HTTP responses. */

export const sendCollectedDebris = (req, res) => {
  const result = res.locals.collection;
  const completedQuests = res.locals.completedQuests || [];
  const response = {
    message: 'You collected server-confirmed debris.',
    found: result.found,
    collected: result.collected,
    new_materials: result.updatedUser.materials,
    raft_size: result.raft_size,
  };
  if (completedQuests.length > 0) response.completed_quests = completedQuests;
  res.status(200).json(response);
};

export const sendCraftedItem = (req, res) => {
  const crafted = res.locals.craftedItem;
  const resultItem = res.locals.resultItem;
  res.status(200).json({
    message: `Successfully crafted ${resultItem.item_name}!`,
    crafted: {
      item_name: resultItem.item_name,
      category: resultItem.category,
      user_item_id: crafted.user_item_id,
      quantity: crafted.quantity,
    },
  });
};

export const sendRaftUpgrade = (req, res) => {
  const { upgrade, updatedUser } = res.locals.upgradeResult;
  res.status(200).json({
    message: `Raft upgraded with ${res.locals.upgradeType}!`,
    upgrade,
    user: updatedUser,
  });
};

export const sendUnexpectedEvent = (req, res) => {
  const result = res.locals.eventResult;
  const event = res.locals.event;
  const completedQuests = res.locals.completedQuests || [];
  const response = {
    message: result.outcome.message,
    event: {
      event_id: event.event_id,
      event_name: event.event_name,
      event_type: event.event_type,
      description: event.description,
    },
    outcome: result.outcome.outcome,
    prevented: result.outcome.prevented,
    protection_upgrade_type: result.outcome.protectionUpgradeType,
    lost_item: result.outcome.lostItemQuantity > 0
      ? {
        item_type_id: result.outcome.lostItemTypeId,
        item_name: result.lostItemName,
        quantity: result.outcome.lostItemQuantity,
      }
      : null,
    user: result.updatedUser,
    event_history: result.eventHistory,
  };
  if (completedQuests.length > 0) response.completed_quests = completedQuests;
  res.status(200).json(response);
};

export const sendQuestReward = (req, res) => {
  const result = res.locals.questReward;
  res.status(200).json({
    message: `Claimed reward for "${res.locals.quest.title}"!`,
    materials_gained: res.locals.quest.reward_materials,
    item_gained: result.grantedItem,
    user: result.updatedUser,
  });
};
