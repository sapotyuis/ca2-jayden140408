/**
 * Controller for /api/me — every action the logged-in survivor performs on their OWN raft.
 *
 * These handlers never read a user id from the URL or the request body. The survivor is
 * always `req.user`, loaded by loadCurrentUser from the verified JWT. That is what makes it
 * impossible for one player to collect debris on, upgrade, or delete another player's raft.
 */
import { validationResult } from 'express-validator';
import { findUserByUsername, updateUser, removeUser, upgradeRaftAtomic, findUserUpgradeTypes, collectDebrisAtomic } from '../models/userModel.js';
import { findAllUserItems, craftItemAtomic } from '../models/userItemModel.js';
import { findAllItemTypes, findItemTypeById } from '../models/itemTypeModel.js';
import { findAllCraftingRecipes } from '../models/craftingRecipeModel.js';
import { findAllRaftUpgrades } from '../models/raftUpgradeModel.js';
import { UPGRADE_SPECS, VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import { AppError } from '../utils/_errors.js';

/** Throws VALIDATION_ERROR if the route's express-validator rules failed. */
const assertValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Surface only the first failure — the frontend shows one message at a time.
    throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
  }
};

/** GET /api/me — the logged-in survivor's own profile. */
export const getMyProfile = async (req, res) => {
  res.status(200).json(req.user);
};

/**
 * PATCH /api/me — rename the survivor, or set hunger.
 *
 * user_id is deliberately NOT recomputed when the username changes. A primary key that
 * moves would have to cascade across every child table and would silently invalidate the
 * user's JWT (which carries the old id), logging them out mid-session. The id is assigned
 * once at registration and is immutable from then on.
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    assertValid(req);

    // Progression stats (materials, raft_size) are intentionally not editable here —
    // they may only change by playing the game via the action routes below.
    const data = {};
    if (req.body.username !== undefined) data.username = req.body.username;
    if (req.body.hunger !== undefined) data.hunger = req.body.hunger;

    // Reject an empty body early rather than firing a no-op UPDATE at the database.
    if (Object.keys(data).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No fields provided to update');
    }

    if (data.username !== undefined) {
      const conflict = await findUserByUsername(data.username);
      // Comparing user_id lets a user re-submit their current username without a false 409.
      if (conflict && conflict.user_id !== req.user.user_id) {
        return res.status(409).json({
          error: { code: 'CONFLICT', message: `Username "${data.username}" is already taken` },
        });
      }
    }

    const user = await updateUser(req.user.user_id, data);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/me — the survivor abandons the raft. 204 No Content on success. */
export const deleteMyAccount = async (req, res, next) => {
  try {
    await removeUser(req.user.user_id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/inventory — everything currently in the survivor's hold. */
export const getMyInventory = async (req, res, next) => {
  try {
    const filters = { user_id: req.user.user_id };
    if (req.query.category) filters.category = req.query.category;

    const items = await findAllUserItems(filters);
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

/** GET /api/me/upgrades — the survivor's raft upgrade history. */
export const getMyUpgrades = async (req, res, next) => {
  try {
    const upgrades = await findAllRaftUpgrades({ user_id: req.user.user_id });
    res.status(200).json(upgrades);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/me/status — the survivor's full progression state in a single call.
 * The frontend uses this to paint the whole game view without fanning out to several routes.
 */
export const getMyStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const upgradeTypes = await findUserUpgradeTypes(user.user_id);

    // Recommend the first upgrade in the standard progression order the user has not bought yet.
    const nextUpgrade = VALID_UPGRADE_TYPES.find((u) => !upgradeTypes.includes(u)) || null;
    const nextSpec = nextUpgrade ? UPGRADE_SPECS[nextUpgrade] : null;

    res.status(200).json({
      user: user.username,
      raft_size: user.raft_size,
      materials: user.materials,
      hunger: user.hunger,
      upgrades: upgradeTypes,
      next_recommended_upgrade: nextUpgrade,
      can_upgrade: nextSpec ? user.materials >= nextSpec.material_cost : false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/me/collect-debris — sweep the ocean for materials.
 *
 * Yield scales with raft_size, so upgrades compound: a bigger raft sweeps a wider net.
 * Sail unlocks a chance at rare equipment; Net Launcher adds flat bonus materials.
 */
export const collectDebris = async (req, res, next) => {
  try {
    const user = req.user;

    const userUpgrades = await findUserUpgradeTypes(user.user_id);
    const hasSail = userUpgrades.includes('Sail');
    const hasNetLauncher = userUpgrades.includes('Net Launcher');

    const materialItems = await findAllItemTypes({ category: 'material' });
    const equipmentItems = await findAllItemTypes({ category: 'equipment' });

    // Pick 2–3 random material types; each yields a quantity capped by raft_size.
    const shuffled = [...materialItems].sort(() => Math.random() - 0.5).slice(0, Math.min(3, materialItems.length));
    const debrisItems = shuffled.map((item) => ({
      item_type_id: item.item_type_id,
      item_name: item.item_name,
      quantity: Math.floor(Math.random() * user.raft_size) + 1,
    }));

    let totalMaterials = debrisItems.reduce((sum, i) => sum + i.quantity, 0);
    const bonusReasons = [];

    if (hasNetLauncher) {
      totalMaterials += user.raft_size * 2;
      bonusReasons.push('Net Launcher auto-collected bonus materials');
    }

    // Sail: 30% chance to spot a rare equipment item floating past.
    if (hasSail && equipmentItems.length > 0 && Math.random() < 0.3) {
      const rare = equipmentItems[Math.floor(Math.random() * equipmentItems.length)];
      debrisItems.push({ item_type_id: rare.item_type_id, item_name: rare.item_name, quantity: 1 });
      bonusReasons.push('Sail spotted rare debris');
    }

    const { updatedUser, insertedItems } = await collectDebrisAtomic(
      user.user_id,
      user.materials + totalMaterials,
      debrisItems
    );

    const response = {
      message: 'You swept the ocean and found useful debris.',
      found: insertedItems,
      collected: totalMaterials,
      new_materials: updatedUser.materials,
      raft_size: updatedUser.raft_size,
    };
    if (bonusReasons.length > 0) response.bonus_reason = bonusReasons.join('; ');

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/me/upgrade-raft — spend materials to grow the raft.
 * The balance check happens here; the deduction, the raft_size increase, and the upgrade
 * record are written together in one transaction so a failure cannot leave a half-applied upgrade.
 */
export const performRaftUpgrade = async (req, res, next) => {
  try {
    assertValid(req);

    const user = req.user;
    const spec = UPGRADE_SPECS[req.body.upgrade_type];

    if (user.materials < spec.material_cost) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Not enough materials for a ${req.body.upgrade_type}. Need ${spec.material_cost}, have ${user.materials} — collect more debris first.`
      );
    }

    // New values are computed here so the model layer stays free of game rules.
    const { updatedUser, upgrade } = await upgradeRaftAtomic(
      user.user_id,
      user.materials - spec.material_cost,
      user.raft_size + spec.raft_size_gain,
      { user_id: user.user_id, upgrade_type: req.body.upgrade_type, material_cost: spec.material_cost }
    );

    res.status(200).json({
      message: `Raft upgraded with ${req.body.upgrade_type}!`,
      upgrade,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/me/craft — turn inventory ingredients into a crafted item.
 * Every ingredient is validated against the recipe BEFORE anything is written, then the
 * deduction and the new item are committed in one transaction — so a recipe the survivor
 * cannot fully afford consumes nothing at all.
 */
export const craftItem = async (req, res, next) => {
  try {
    assertValid(req);

    const user = req.user;
    const resultItemTypeId = req.body.result_item_type_id;

    const recipes = await findAllCraftingRecipes({ result_item_type_id: resultItemTypeId });
    if (recipes.length === 0) throw new AppError('NOT_FOUND', 'No recipe found for this item');

    const resultItem = await findItemTypeById(resultItemTypeId);
    if (!resultItem) throw new AppError('NOT_FOUND', 'Item type not found');

    // A survivor can hold the same item across several rows, so totals are aggregated by
    // item_type_id before being compared against what the recipe demands.
    const userInventory = await findAllUserItems({ user_id: user.user_id });
    const inventoryMap = {};
    for (const row of userInventory) {
      if (!inventoryMap[row.item_type_id]) inventoryMap[row.item_type_id] = { total: 0, rows: [] };
      inventoryMap[row.item_type_id].total += row.quantity;
      inventoryMap[row.item_type_id].rows.push(row);
    }

    const deductions = [];
    for (const recipe of recipes) {
      const inv = inventoryMap[recipe.ingredient_item_type_id];
      const have = inv ? inv.total : 0;
      if (have < recipe.quantity_required) {
        const ingredientItem = await findItemTypeById(recipe.ingredient_item_type_id);
        throw new AppError(
          'VALIDATION_ERROR',
          `Not enough ${ingredientItem?.item_name || 'ingredient'} to craft ${resultItem.item_name}. Need ${recipe.quantity_required}, have ${have}.`
        );
      }
      deductions.push({ rows: inv.rows, required: recipe.quantity_required });
    }

    const crafted = await craftItemAtomic(user.user_id, deductions, resultItemTypeId);

    res.status(200).json({
      message: `Successfully crafted ${resultItem.item_name}!`,
      crafted: {
        item_name: resultItem.item_name,
        category: resultItem.category,
        user_item_id: crafted.user_item_id,
        quantity: crafted.quantity,
      },
    });
  } catch (error) {
    next(error);
  }
};
