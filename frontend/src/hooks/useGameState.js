import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../lib/api';

// Mirrors src/config/gameRules.js on the backend. The server is the source of truth for what a
// purchase actually costs — this is only used to render cost/gain labels and an affordability
// hint on the buttons, so the UI can grey out what you can't yet buy without a round-trip.
export const UPGRADE_SPECS = {
  'Floor Extension': { material_cost: 10, raft_size_gain: 1 },
  Sail: { material_cost: 20, raft_size_gain: 2 },
  'Net Launcher': { material_cost: 35, raft_size_gain: 3 },
  'Spear Rack': { material_cost: 30, raft_size_gain: 0, protects_against: 'shark_attack' },
  Shelter: { material_cost: 45, raft_size_gain: 0, protects_against: 'tsunami' },
  Roof: { material_cost: 35, raft_size_gain: 0, protects_against: 'heavy_downpour' },
};

/**
 * All the dashboard's data and actions in one place, kept out of the view components the same
 * way the backend keeps its models out of its controllers. Every mutation (craft, upgrade,
 * claim...) re-fetches the whole game state afterward rather than patching locally, so a change
 * with side effects — e.g. crafting food advancing a quest — shows up everywhere at once and the
 * client never drifts out of sync with the server.
 */
export function useGameState() {
  const { api } = useAuth();
  const pushToast = useToast();

  const [status, setStatus] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [statusRes, inventoryRes, itemTypesRes, recipesRes, questsRes] = await Promise.all([
      api('/api/me/status'),
      api('/api/me/inventory'),
      api('/api/item-types'),
      api('/api/crafting-recipes'),
      api('/api/me/quests'),
    ]);

    if (statusRes.ok) setStatus(statusRes.data);
    if (inventoryRes.ok) setInventory(inventoryRes.data);
    if (itemTypesRes.ok) setItemTypes(itemTypesRes.data);
    if (recipesRes.ok) setRecipes(recipesRes.data);
    if (questsRes.ok) setQuests(questsRes.data);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    loadAll().catch(() => {
      pushToast('Could not reach the server. Please refresh.', 'error');
      setLoading(false);
    });
  }, [loadAll, pushToast]);

  /* ---- derived, memoised views the panels consume ---- */

  const itemsById = useMemo(() => new Map(itemTypes.map((it) => [it.item_type_id, it])), [itemTypes]);

  // Inventory can spread one item type across several rows — total them for display and for
  // the crafting affordability check.
  const inventoryTotals = useMemo(() => {
    const totals = new Map();
    for (const row of inventory) totals.set(row.item_type_id, (totals.get(row.item_type_id) || 0) + row.quantity);
    return totals;
  }, [inventory]);

  const inventoryItems = useMemo(
    () =>
      [...inventoryTotals.entries()]
        .map(([id, quantity]) => ({ item: itemsById.get(id), quantity }))
        .filter((entry) => entry.item),
    [inventoryTotals, itemsById]
  );

  // Group recipes by their result item and annotate each ingredient with have/need + affordability.
  const craftables = useMemo(() => {
    const byResult = new Map();
    for (const recipe of recipes) {
      const list = byResult.get(recipe.result_item_type_id) || [];
      list.push(recipe);
      byResult.set(recipe.result_item_type_id, list);
    }
    return [...byResult.entries()]
      .map(([resultId, group]) => {
        const result = itemsById.get(resultId);
        if (!result) return null;
        const ingredients = group.map((recipe) => {
          const ingredient = itemsById.get(recipe.ingredient_item_type_id);
          const have = inventoryTotals.get(recipe.ingredient_item_type_id) || 0;
          return { name: ingredient?.item_name || 'Unknown', need: recipe.quantity_required, have, short: have < recipe.quantity_required };
        });
        return { resultId, result, ingredients, canCraft: ingredients.every((i) => !i.short) };
      })
      .filter(Boolean);
  }, [recipes, itemsById, inventoryTotals]);

  const announceCompleted = useCallback(
    (completedQuests) => {
      for (const quest of completedQuests || []) {
        pushToast(`Quest complete: "${quest.title}" — claim it on the Quest Board!`, 'quest');
      }
    },
    [pushToast]
  );

  /* ---- actions ---- */

  const craft = useCallback(
    async (resultItemTypeId) => {
      const { ok, data } = await api('/api/me/craft', { method: 'POST', body: { result_item_type_id: resultItemTypeId } });
      if (!ok) return pushToast(extractErrorMessage(data), 'error');
      pushToast(data.message, 'success');
      announceCompleted(data.completed_quests);
      await loadAll();
    },
    [api, pushToast, announceCompleted, loadAll]
  );

  const upgrade = useCallback(
    async (upgradeType) => {
      const { ok, data } = await api('/api/me/upgrade-raft', { method: 'POST', body: { upgrade_type: upgradeType } });
      if (!ok) return pushToast(extractErrorMessage(data), 'error');
      pushToast(data.message, 'success');
      await loadAll();
    },
    [api, pushToast, loadAll]
  );

  const claimQuest = useCallback(
    async (questId) => {
      const { ok, data } = await api(`/api/me/quests/${questId}/claim`, { method: 'POST' });
      if (!ok) return pushToast(extractErrorMessage(data), 'error');
      pushToast(data.message, 'success');
      await loadAll();
    },
    [api, pushToast, loadAll]
  );

  return {
    loading,
    status,
    itemsById,
    inventoryItems,
    craftables,
    quests,
    craft,
    upgrade,
    claimQuest,
  };
}
