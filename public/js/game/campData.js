// Loads and manages the player's camp data and game actions such as crafting and upgrades.
import { extractErrorMessage } from '../api/api.js';

export const UPGRADE_SPECS = {
  'Floor Extension': { material_cost: 10, raft_size_gain: 1, repeatable: true },
  Sail: { material_cost: 20, raft_size_gain: 2, repeatable: true },
  'Net Launcher': { material_cost: 35, raft_size_gain: 3, repeatable: true },
  'Spear Rack': { material_cost: 30, raft_size_gain: 0, repeatable: false, protects_against: 'shark_attack' },
  Shelter: { material_cost: 45, raft_size_gain: 0, repeatable: false, protects_against: 'tsunami' },
  Roof: { material_cost: 35, raft_size_gain: 0, repeatable: false, protects_against: 'heavy_downpour' },
};

export const createGameState = ({ auth, toast }) => {
  let state = { loading: true, status: null, inventory: [], itemTypes: [], recipes: [], quests: [] };
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener(getView()));

  const getView = () => {
    const itemsById = new Map(state.itemTypes.map((item) => [item.item_type_id, item]));
    const totals = new Map();
    for (const row of state.inventory) totals.set(row.item_type_id, (totals.get(row.item_type_id) || 0) + row.quantity);
    const inventoryItems = [...totals.entries()]
      .map(([id, quantity]) => ({ item: itemsById.get(id), quantity }))
      .filter(({ item }) => item);
    const grouped = new Map();
    for (const recipe of state.recipes) grouped.set(recipe.result_item_type_id, [...(grouped.get(recipe.result_item_type_id) || []), recipe]);
    const craftables = [...grouped.entries()].map(([resultId, group]) => {
      const result = itemsById.get(resultId);
      if (!result) return null;
      const ingredients = group.map((recipe) => {
        const ingredient = itemsById.get(recipe.ingredient_item_type_id);
        const have = totals.get(recipe.ingredient_item_type_id) || 0;
        return { name: ingredient?.item_name || 'Unknown', need: recipe.quantity_required, have, short: have < recipe.quantity_required };
      });
      return { resultId, result, ingredients, canCraft: ingredients.every((ingredient) => !ingredient.short) };
    }).filter(Boolean);
    return { ...state, itemsById, inventoryItems, craftables };
  };

  const loadAll = async () => {
    console.log('[GAME] dashboard load started');
    const [statusRes, inventoryRes, itemTypesRes, recipesRes, questsRes] = await Promise.all([
      auth.api('/api/me/status'),
      auth.api('/api/me/inventory'),
      auth.api('/api/item-types'),
      auth.api('/api/crafting-recipes'),
      auth.api('/api/me/quests'),
    ]);
    console.log('[GAME] dashboard load responses', {
      status: statusRes.status, inventory: inventoryRes.status, item_types: itemTypesRes.status,
      recipes: recipesRes.status, quests: questsRes.status,
    });
    state = {
      loading: false,
      status: statusRes.ok ? statusRes.data : state.status,
      inventory: inventoryRes.ok ? inventoryRes.data : state.inventory,
      itemTypes: itemTypesRes.ok ? itemTypesRes.data : state.itemTypes,
      recipes: recipesRes.ok ? recipesRes.data : state.recipes,
      quests: questsRes.ok ? questsRes.data : state.quests,
    };
    notify();
  };

  const runMutation = async (path, body, successMessage, announce = false) => {
    const { ok, data } = await auth.api(path, { method: 'POST', body });
    if (!ok) {
      toast.push(extractErrorMessage(data), 'error');
      return;
    }
    toast.push(data.message || successMessage, 'success');
    if (announce) for (const quest of data.completed_quests || []) toast.push(`Quest complete: "${quest.title}" — claim it on the Quest Board!`, 'quest');
    await loadAll();
  };

  return {
    getView,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadAll,
    craft: (resultItemTypeId) => runMutation('/api/me/craft', { result_item_type_id: resultItemTypeId }, 'Item crafted.', true),
    upgrade: (upgradeType) => runMutation('/api/me/upgrade-raft', { upgrade_type: upgradeType }, 'Raft upgraded.'),
    claimQuest: (questId) => runMutation(`/api/me/quests/${questId}/claim`, undefined, 'Quest reward claimed.'),
  };
};
