// Builds the camp interface panels for status, quests, inventory, crafting, upgrades, and profile management.
import { createClassNames } from '../helpers/cssClassNames.js';
import { UPGRADE_SPECS } from '../game/campData.js';
import { escapeHtml } from '../helpers/domHelpers.js';
import { badge, button, meter, panel } from '../helpers/uiComponents.js';

const game = createClassNames('game');

const RARITY_COLOR = {
  common: 'var(--rarity-common)', uncommon: 'var(--rarity-uncommon)', rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)',
};

export const statusPanel = (status, index = 0) => {
  const nextSpec = status?.next_recommended_upgrade ? UPGRADE_SPECS[status.next_recommended_upgrade] : null;
  const target = nextSpec ? nextSpec.material_cost : Math.max(status?.materials || 1, 1);
  let hint = 'All upgrades are installed. Your raft is fully upgraded.';
  if (status?.next_recommended_upgrade) {
    hint = status.can_upgrade
      ? `Ready to install: ${status.next_recommended_upgrade}. Open the Raft Upgrades panel below.`
      : `Next upgrade: ${status.next_recommended_upgrade}. Need ${nextSpec.material_cost - status.materials} more materials.`;
  }
  return panel({
    title: 'Raft status', index,
    content: `<div class="${game.statusStack}">${meter({ label: 'Materials needed for next upgrade', tone: 'lantern', value: status?.materials ?? 0, max: target, valueText: status?.materials ?? 0 })}<p class="${game.nextHint}">${escapeHtml(hint)}</p></div>`,
  });
};

export const questsPanel = (quests, itemsById, raftSize = 1, index = 0) => {
  const statuses = {
    active: ['In Progress', 'active'], available: ['Not Started', 'active'], completed: ['Ready to Claim', 'ready'], claimed: ['Claimed', 'done'],
  };
  const rewardText = (quest) => {
    const rewardItem = quest.reward_item_type_id ? itemsById.get(quest.reward_item_type_id) : null;
    const rewards = [quest.reward_materials > 0 ? `${quest.reward_materials} materials` : '', rewardItem ? `${quest.reward_item_quantity}× ${rewardItem.item_name}` : ''].filter(Boolean);
    return rewards.length ? rewards.join(' + ') : 'Bragging rights';
  };
  const content = !quests.length ? `<p class="${game.empty}">No quests are available right now.</p>` : `<div class="${game.list}">${quests.map((quest) => {
    const progress = quest.progress ?? 0;
    const required = Number(quest.min_raft_size || 1);
    const locked = raftSize < required;
    const [label, tone] = locked ? ['Locked', 'neutral'] : (quest.status ? statuses[quest.status] : ['Not Started', 'neutral']);
    return `<div class="${game.questCard}">
      <div class="${game.questTop}"><span class="${game.questTitle}">${escapeHtml(quest.title)}</span>${badge(label, tone)}</div>
      <p class="${game.questDesc}">${escapeHtml(quest.description)}</p>
      ${locked ? `<p class="${game.questRequirement}">Requires raft size ${required} to unlock.</p>` : ''}
      ${meter({ label: '', value: progress, max: quest.target_value, valueText: '', tone: 'quest', compact: true })}
      <div class="${game.questFooter}"><span class="${game.questReward}">Progress: ${progress}/${quest.target_value} · Reward: <b>${escapeHtml(rewardText(quest))}</b></span>${quest.status === 'completed' ? button({ label: 'CLAIM REWARD', action: `claim-quest:${quest.quest_id}`, size: 'sm' }) : ''}</div>
    </div>`;
  }).join('')}</div>`;
  return panel({ content, wide: true, index });
};

export const inventoryPanel = (items, index = 0) => {
  const content = !items.length ? `<p class="${game.empty}">Your inventory is empty. Start a voyage and sail over debris to collect items.</p>` : `<div class="${game.invGrid}">${items.map(({ item, quantity }) => {
    const color = RARITY_COLOR[item.rarity] || RARITY_COLOR.common;
    return `<div class="${game.invTile}" style="border-left-color:${color}"><div class="${game.invName}">${escapeHtml(item.item_name)}</div><div class="${game.invMeta}"><span class="${game.rarityLabel}" style="color:${color}">${escapeHtml(item.rarity)}</span><span class="${game.invQty}">×${quantity}</span></div></div>`;
  }).join('')}</div>`;
  return panel({ title: 'Inventory', subtitle: 'Items you collected or crafted', content, wide: true, index });
};

export const craftingPanel = (craftables, index = 0) => {
  const content = !craftables.length ? `<p class="${game.empty}">No crafting recipes are available right now.</p>` : `<div class="${game.list}">${craftables.map(({ resultId, result, ingredients, canCraft }) => `<div class="${game.row}"><div><div class="${game.rowName}">${escapeHtml(result.item_name)}</div><div class="${game.rowMeta}">Required: ${ingredients.map((ingredient) => `<span class="${ingredient.short ? game.short : ''}">${ingredient.need}× ${escapeHtml(ingredient.name)} (you have ${ingredient.have})</span>`).join(', ')}</div></div>${button({ label: 'CRAFT ITEM', action: `craft:${resultId}`, size: 'sm', disabled: !canCraft })}</div>`).join('')}</div>`;
  return panel({ title: 'Crafting bench', subtitle: 'Use materials from your inventory to make items', content, wide: true, index });
};

export const upgradesPanel = (status, index = 0) => {
  const owned = new Set(status?.upgrades || []);
  const materials = status?.materials ?? 0;
  const content = `<div class="${game.list}">${Object.entries(UPGRADE_SPECS).map(([type, spec]) => {
    const installed = !spec.repeatable && owned.has(type);
    const canAfford = materials >= spec.material_cost;
    const detail = spec.protects_against ? `Protects against: ${spec.protects_against.replaceAll('_', ' ')}` : `Adds ${spec.raft_size_gain} raft tile${spec.raft_size_gain === 1 ? '' : 's'}`;
    return `<div class="${game.row}"><div><div class="${game.rowName}">${escapeHtml(type)}</div><div class="${game.rowMeta}">Cost: ${spec.material_cost} materials · ${escapeHtml(detail)}</div></div>${installed ? badge('Installed', 'done') : button({ label: owned.has(type) ? 'BUY AGAIN' : 'BUY UPGRADE', action: `upgrade:${type}`, size: 'sm', disabled: !canAfford })}</div>`;
  }).join('')}</div>`;
  return panel({ title: 'Raft upgrades', subtitle: 'Buy upgrades to expand and protect your raft', content, index });
};

export const profilePanel = (index = 0) => panel({
  title: 'Survivor profile', index,
  content: `<form class="${game.profileForm}" data-profile-form><div class="${game.profileField}"><label class="${game.profileLabel}" for="rename">Survivor name</label><input id="rename" class="${game.profileInput}" type="text" placeholder="Enter a new survivor name" name="username"></div>${button({ label: 'SAVE NEW NAME', variant: 'ghost', action: 'rename', type: 'submit' })}</form><div class="${game.dangerZone}"><p class="${game.dangerNote}">Deleting your raft permanently deletes your survivor, inventory, and all progress.</p>${button({ label: 'DELETE SURVIVOR AND RAFT', variant: 'danger', action: 'delete-survivor', style: 'width:100%' })}</div>`,
});
