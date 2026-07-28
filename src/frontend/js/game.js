import { getToken, clearSession, authedFetch, getErrorMessage } from './auth.js';

// Page protection: without a token there is no session, so send the visitor back to sign in.
if (!getToken()) {
  window.location.replace('index.html');
}

// Mirrors src/config/gameRules.js UPGRADE_SPECS — the server is the source of truth for the
// actual charge, this is only used to render cost/gain labels and a can-afford check.
const UPGRADE_SPECS = {
  'Floor Extension': { material_cost: 10, raft_size_gain: 1 },
  Sail: { material_cost: 20, raft_size_gain: 2 },
  'Net Launcher': { material_cost: 35, raft_size_gain: 3 },
};

const user = JSON.parse(localStorage.getItem('user') || 'null');
const nameEl = document.getElementById('survivor-name');
if (nameEl && user?.username) nameEl.textContent = user.username;

const el = (id) => document.getElementById(id);

/* ----------------------------------------------------------------------
 * Toasts
 * -------------------------------------------------------------------- */
const toastRoot = el('toast-root');

const showToast = (message, type = 'info', timeout = 4200) => {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastRoot.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
  }, timeout);
};

const announceCompletedQuests = (completedQuests) => {
  if (!completedQuests?.length) return;
  for (const quest of completedQuests) {
    showToast(`Quest complete: "${quest.title}" — head to the Quest Board to claim it!`, 'quest', 6000);
  }
};

/* ----------------------------------------------------------------------
 * Shared game state, refreshed as a whole after every mutation so every
 * card (status, inventory, quests...) always reflects the latest server
 * truth instead of each panel guessing at a partial local update.
 * -------------------------------------------------------------------- */
const state = {
  status: null,
  inventory: [],
  itemTypesById: new Map(),
  recipesByResult: new Map(),
  upgrades: [],
  quests: [],
};

const inventoryTotals = () => {
  const totals = new Map();
  for (const row of state.inventory) {
    totals.set(row.item_type_id, (totals.get(row.item_type_id) || 0) + row.quantity);
  }
  return totals;
};

/* ----------------------------------------------------------------------
 * Renderers
 * -------------------------------------------------------------------- */
const renderStatus = () => {
  const s = state.status;
  if (!s) return;

  el('stat-materials').textContent = s.materials;
  el('stat-hunger').textContent = s.hunger;
  el('stat-raft-size').textContent = s.raft_size;

  el('hunger-text').textContent = `${s.hunger}/100`;
  el('hunger-fill').style.width = `${Math.max(0, Math.min(100, s.hunger))}%`;

  const nextSpec = s.next_recommended_upgrade ? UPGRADE_SPECS[s.next_recommended_upgrade] : null;
  const materialsTarget = nextSpec ? nextSpec.material_cost : Math.max(s.materials, 1);
  el('materials-text').textContent = s.materials;
  el('materials-fill').style.width = `${Math.max(0, Math.min(100, (s.materials / materialsTarget) * 100))}%`;

  const nextEl = el('status-next');
  if (s.next_recommended_upgrade) {
    nextEl.textContent = s.can_upgrade
      ? `Ready to install: ${s.next_recommended_upgrade}. Visit Raft Upgrades below.`
      : `Next upgrade: ${s.next_recommended_upgrade} — ${nextSpec.material_cost - s.materials} more materials needed.`;
  } else {
    nextEl.textContent = 'Every upgrade is installed. Your raft is fully outfitted.';
  }
};

const renderInventory = () => {
  const grid = el('inventory-grid');
  const totals = inventoryTotals();
  if (totals.size === 0) {
    grid.innerHTML = '<p class="card__empty">Nothing collected yet — set sail and sweep the ocean for debris.</p>';
    return;
  }

  grid.innerHTML = '';
  for (const [itemTypeId, quantity] of totals) {
    const item = state.itemTypesById.get(itemTypeId);
    if (!item) continue;
    const card = document.createElement('div');
    card.className = `inv-item rarity-${item.rarity}`;
    card.innerHTML = `
      <div class="inv-item__name">${item.item_name}</div>
      <div class="inv-item__meta"><span>${item.category}</span><span class="inv-item__qty">×${quantity}</span></div>
    `;
    grid.appendChild(card);
  }
};

const renderRecipes = () => {
  const list = el('recipe-list');
  if (state.recipesByResult.size === 0) {
    list.innerHTML = '<p class="card__empty">No recipes available.</p>';
    return;
  }

  const totals = inventoryTotals();
  list.innerHTML = '';

  for (const [resultId, recipes] of state.recipesByResult) {
    const resultItem = state.itemTypesById.get(resultId);
    if (!resultItem) continue;

    const parts = recipes.map((recipe) => {
      const ingredient = state.itemTypesById.get(recipe.ingredient_item_type_id);
      const have = totals.get(recipe.ingredient_item_type_id) || 0;
      const short = have < recipe.quantity_required;
      return { text: `${recipe.quantity_required}× ${ingredient?.item_name || 'Unknown'} (have ${have})`, short };
    });

    const canCraft = parts.every((p) => !p.short);
    const ingredientsHtml = parts
      .map((p) => (p.short ? `<span class="short">${p.text}</span>` : p.text))
      .join(', ');

    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <div>
        <div class="recipe-card__name">${resultItem.item_name}</div>
        <div class="recipe-card__ingredients">Needs: ${ingredientsHtml}</div>
      </div>
      <button class="btn btn--lantern btn--small" data-action="craft" data-result-id="${resultId}" ${canCraft ? '' : 'disabled'}>
        Craft
      </button>
    `;
    list.appendChild(card);
  }
};

const renderUpgrades = () => {
  const list = el('upgrade-list');
  const owned = new Set(state.status?.upgrades || []);
  list.innerHTML = '';

  for (const [type, spec] of Object.entries(UPGRADE_SPECS)) {
    const isOwned = owned.has(type);
    const canAfford = state.status ? state.status.materials >= spec.material_cost : false;

    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div>
        <div class="upgrade-card__name">${type}</div>
        <div class="upgrade-card__spec">${spec.material_cost} materials · +${spec.raft_size_gain} raft size</div>
      </div>
      ${
        isOwned
          ? '<span class="badge badge--installed">Installed</span>'
          : `<button class="btn btn--lantern btn--small" data-action="upgrade" data-type="${type}" ${canAfford ? '' : 'disabled'}>Upgrade</button>`
      }
    `;
    list.appendChild(card);
  }
};

const QUEST_STATUS_LABEL = {
  active: { label: 'In Progress', badge: 'badge--active' },
  available: { label: 'In Progress', badge: 'badge--active' },
  completed: { label: 'Ready to Claim', badge: 'badge--completed' },
  claimed: { label: 'Claimed', badge: 'badge--claimed' },
};

const renderQuests = () => {
  const list = el('quest-list');
  if (state.quests.length === 0) {
    list.innerHTML = '<p class="card__empty">No quests available.</p>';
    return;
  }

  list.innerHTML = '';
  for (const quest of state.quests) {
    const started = quest.status !== null && quest.status !== undefined;
    const progress = quest.progress ?? 0;
    const pct = Math.min(100, Math.round((progress / quest.target_value) * 100));
    const statusInfo = started ? QUEST_STATUS_LABEL[quest.status] : { label: 'Not Started', badge: '' };

    const rewardItem = quest.reward_item_type_id ? state.itemTypesById.get(quest.reward_item_type_id) : null;
    const rewardText = [
      quest.reward_materials > 0 ? `${quest.reward_materials} materials` : null,
      rewardItem ? `${quest.reward_item_quantity}× ${rewardItem.item_name}` : null,
    ]
      .filter(Boolean)
      .join(' + ') || 'Bragging rights';

    const card = document.createElement('div');
    card.className = 'quest-card';
    card.innerHTML = `
      <div class="quest-card__top">
        <span class="quest-card__name">${quest.title}</span>
        ${statusInfo.badge ? `<span class="badge ${statusInfo.badge}">${statusInfo.label}</span>` : `<span class="badge">${statusInfo.label}</span>`}
      </div>
      <p class="quest-card__desc">${quest.description}</p>
      <div class="quest-card__progress meter">
        <div class="meter__track"><div class="meter__fill" style="width:${pct}%"></div></div>
      </div>
      <div class="quest-card__footer">
        <span class="quest-card__reward">${progress}/${quest.target_value} · Reward: ${rewardText}</span>
        ${
          quest.status === 'completed'
            ? `<button class="btn btn--lantern btn--small" data-action="claim" data-quest-id="${quest.quest_id}">Claim</button>`
            : ''
        }
      </div>
    `;
    list.appendChild(card);
  }
};

const renderAll = () => {
  renderStatus();
  renderInventory();
  renderRecipes();
  renderUpgrades();
  renderQuests();
};

/* ----------------------------------------------------------------------
 * Data loading
 * -------------------------------------------------------------------- */
const loadAll = async () => {
  const [statusRes, inventoryRes, itemTypesRes, recipesRes, questsRes] = await Promise.all([
    authedFetch('/api/me/status'),
    authedFetch('/api/me/inventory'),
    authedFetch('/api/item-types'),
    authedFetch('/api/crafting-recipes'),
    authedFetch('/api/me/quests'),
  ]);

  if (statusRes.ok) state.status = statusRes.data;
  if (inventoryRes.ok) state.inventory = inventoryRes.data;
  if (questsRes.ok) state.quests = questsRes.data;

  if (itemTypesRes.ok) {
    state.itemTypesById = new Map(itemTypesRes.data.map((item) => [item.item_type_id, item]));
  }

  if (recipesRes.ok) {
    state.recipesByResult = new Map();
    for (const recipe of recipesRes.data) {
      const list = state.recipesByResult.get(recipe.result_item_type_id) || [];
      list.push(recipe);
      state.recipesByResult.set(recipe.result_item_type_id, list);
    }
  }

  renderAll();
};

/* ----------------------------------------------------------------------
 * Actions — every button below hits a real /api/me endpoint, then
 * reloads state as a whole so the effect (e.g. a craft advancing a
 * quest) shows up immediately across every card, not just the one clicked.
 * -------------------------------------------------------------------- */
const craftItem = async (resultItemTypeId) => {
  const { ok, data } = await authedFetch('/api/me/craft', {
    method: 'POST',
    body: { result_item_type_id: Number(resultItemTypeId) },
  });
  if (!ok) return showToast(getErrorMessage(data), 'error');
  showToast(data.message, 'success');
  announceCompletedQuests(data.completed_quests);
  await loadAll();
};

const upgradeRaft = async (upgradeType) => {
  const { ok, data } = await authedFetch('/api/me/upgrade-raft', {
    method: 'POST',
    body: { upgrade_type: upgradeType },
  });
  if (!ok) return showToast(getErrorMessage(data), 'error');
  showToast(data.message, 'success');
  await loadAll();
};

const claimQuest = async (questId) => {
  const { ok, data } = await authedFetch(`/api/me/quests/${questId}/claim`, { method: 'POST' });
  if (!ok) return showToast(getErrorMessage(data), 'error');
  showToast(data.message, 'success');
  await loadAll();
};

// Event delegation — the lists above are fully re-rendered on every refresh, so one
// listener per container avoids re-binding (and leaking) handlers on every render.
document.getElementById('recipe-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="craft"]');
  if (button) craftItem(button.dataset.resultId);
});

document.getElementById('upgrade-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="upgrade"]');
  if (button) upgradeRaft(button.dataset.type);
});

document.getElementById('quest-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="claim"]');
  if (button) claimQuest(button.dataset.questId);
});

/* ----------------------------------------------------------------------
 * Profile: rename + delete
 * -------------------------------------------------------------------- */
document.getElementById('rename-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = el('rename-input');
  const newUsername = input.value.trim();
  if (!newUsername) return;

  const { ok, data } = await authedFetch('/api/me', { method: 'PATCH', body: { username: newUsername } });
  if (!ok) return showToast(getErrorMessage(data), 'error');

  localStorage.setItem('user', JSON.stringify(data));
  nameEl.textContent = data.username;
  input.value = '';
  showToast('Survivor renamed.', 'success');
});

document.getElementById('delete-account-btn').addEventListener('click', async () => {
  const confirmed = window.confirm('This permanently deletes your survivor and everything aboard. Continue?');
  if (!confirmed) return;

  const { ok, data } = await authedFetch('/api/me', { method: 'DELETE' });
  if (!ok) return showToast(getErrorMessage(data), 'error');

  clearSession();
  window.location.href = 'index.html';
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  window.location.href = 'index.html';
});

loadAll().catch(() => showToast('Could not reach the server. Please refresh.', 'error'));
