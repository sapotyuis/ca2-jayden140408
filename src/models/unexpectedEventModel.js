import { eq, and, asc, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import {
  users,
  ocean_events,
  user_events,
  user_items,
  item_types,
  raft_upgrades,
} from '../db/schema.js';
import { calculateUnexpectedEventOutcome } from '../utils/unexpectedEventRules.js';

const publicUserFields = {
  user_id: users.user_id,
  username: users.username,
  materials: users.materials,
  hunger: users.hunger,
  raft_size: users.raft_size,
  lastLogin: users.lastLogin,
};

/** Get the active unexpected-event catalogue. */
export const findUnexpectedEvents = async () => {
  return await db
    .select()
    .from(ocean_events)
    .where(and(eq(ocean_events.is_unexpected, 1), eq(ocean_events.is_active, 1)));
};

/** Get one active unexpected event by ID; ordinary ocean events cannot be resolved here. */
export const findUnexpectedEventById = async (eventId) => {
  const rows = await db
    .select()
    .from(ocean_events)
    .where(and(
      eq(ocean_events.event_id, Number(eventId)),
      eq(ocean_events.is_unexpected, 1),
      eq(ocean_events.is_active, 1),
    ));
  return rows[0];
};

/**
 * Resolve one event atomically. The event ID is supplied by the client, but every consequence
 * is read from the server's event row and applied inside this transaction.
 */
export const resolveUnexpectedEventAtomic = async ({ userId, event, now = new Date().toISOString() }) => {
  return await db.transaction(async (tx) => {
    const [user] = await tx
      .select(publicUserFields)
      .from(users)
      .where(eq(users.user_id, String(userId)));

    if (!user) return null;

    const [latestEvent] = await tx
      .select({ occurred_at: user_events.occurred_at })
      .from(user_events)
      .where(and(
        eq(user_events.user_id, String(userId)),
        eq(user_events.event_id, event.event_id),
      ))
      .orderBy(desc(user_events.occurred_at))
      .limit(1);

    const cooldownSeconds = Math.max(0, Number(event.cooldown_seconds) || 0);
    const elapsedSinceLastEvent = latestEvent ? Date.parse(now) - Date.parse(latestEvent.occurred_at) : Number.NaN;
    if (Number.isFinite(elapsedSinceLastEvent) && elapsedSinceLastEvent < cooldownSeconds * 1000) {
      return {
        cooldownSecondsRemaining: Math.ceil((cooldownSeconds * 1000 - elapsedSinceLastEvent) / 1000),
      };
    }

    const upgradeRows = await tx
      .select({ upgrade_type: raft_upgrades.upgrade_type })
      .from(raft_upgrades)
      .where(eq(raft_upgrades.user_id, String(userId)));
    const userUpgrades = upgradeRows.map((row) => row.upgrade_type);

    const inventoryRows = event.loss_item_type_id
      ? await tx
        .select()
        .from(user_items)
        .where(and(
          eq(user_items.user_id, String(userId)),
          eq(user_items.item_type_id, event.loss_item_type_id),
        ))
        .orderBy(asc(user_items.acquired_at), asc(user_items.user_item_id))
      : [];

    const [lossItem] = event.loss_item_type_id
      ? await tx
        .select({ item_name: item_types.item_name })
        .from(item_types)
        .where(eq(item_types.item_type_id, event.loss_item_type_id))
      : [];

    const outcome = calculateUnexpectedEventOutcome({
      event,
      userUpgrades,
      inventory: inventoryRows,
      lossItemName: lossItem?.item_name || 'item',
    });

    let remainingToDeduct = outcome.lostItemQuantity;
    for (const row of inventoryRows) {
      if (remainingToDeduct <= 0) break;

      const quantityToTake = Math.min(row.quantity, remainingToDeduct);
      const remainingQuantity = row.quantity - quantityToTake;
      remainingToDeduct -= quantityToTake;

      if (remainingQuantity <= 0) {
        await tx.delete(user_items).where(and(
          eq(user_items.user_item_id, row.user_item_id),
          eq(user_items.user_id, String(userId)),
        ));
      } else {
        await tx
          .update(user_items)
          .set({ quantity: remainingQuantity })
          .where(and(
            eq(user_items.user_item_id, row.user_item_id),
            eq(user_items.user_id, String(userId)),
          ));
      }
    }

    const nextHunger = Math.min(100, Math.max(0, user.hunger + outcome.hungerChange));
    const [updatedUser] = await tx
      .update(users)
      .set({ hunger: nextHunger })
      .where(eq(users.user_id, String(userId)))
      .returning(publicUserFields);

    const [eventHistory] = await tx
      .insert(user_events)
      .values({
        user_id: String(userId),
        event_id: event.event_id,
        outcome: outcome.message,
        materials_change: 0,
        hunger_change: outcome.hungerChange,
        reward_item_quantity: 0,
        prevented: outcome.prevented ? 1 : 0,
        lost_item_type_id: outcome.lostItemTypeId,
        lost_item_quantity: outcome.lostItemQuantity,
        protection_upgrade_type: outcome.protectionUpgradeType,
        occurred_at: now,
      })
      .returning();

    return {
      event,
      outcome,
      updatedUser,
      eventHistory,
      lostItemName: lossItem?.item_name || null,
      cooldownSecondsRemaining: 0,
    };
  });
};
