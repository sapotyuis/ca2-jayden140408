import { findAllOceanEvents, findOceanEventById, insertOceanEvent, updateOceanEvent, removeOceanEvent } from '../models/oceanEventModel.js';
import { findItemTypeById } from '../models/itemTypeModel.js';
import { VALID_UPGRADE_TYPES } from '../config/gameRules.js';
import { AppError } from '../utils/_errors.js';

/** Parses a route parameter to a positive integer. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
};

/** Checks that an optional event reward item exists. */
export const validateOceanEventRewardItem = async (req, res, next) => {
  try {
    if (req.body.reward_item_type_id === undefined) return next();

    const itemType = await findItemTypeById(req.body.reward_item_type_id);
    if (!itemType) throw new AppError('NOT_FOUND', `Item type with id ${req.body.reward_item_type_id} not found`);
    next();
  } catch (error) {
    next(error);
  }
};

/** Checks that an optional item loss target exists in the item catalogue. */
export const validateOceanEventLossItem = async (req, res, next) => {
  try {
    if (req.body.loss_item_type_id === undefined) return next();

    const itemType = await findItemTypeById(req.body.loss_item_type_id);
    if (!itemType) throw new AppError('NOT_FOUND', `loss_item_type_id ${req.body.loss_item_type_id} does not exist`);
    next();
  } catch (error) {
    next(error);
  }
};

/** Unexpected events must have a complete server-owned loss configuration. */
const validateLossConfig = (isUnexpected, lossItemTypeId, lossItemQuantity) => {
  if (!isUnexpected) return;
  if (!Number.isInteger(Number(lossItemTypeId)) || Number(lossItemTypeId) <= 0 || lossItemQuantity <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Unexpected events require a loss item and a positive loss quantity');
  }
};

/** Ensures an event cannot promise a maximum material reward below its minimum. */
const validateMaterialRange = (minimum, maximum) => {
  if (maximum < minimum) throw new AppError('VALIDATION_ERROR', 'max_materials must be at least min_materials');
};

/** GET /api/ocean-events — list events, optionally filtered by type. */
export const getAllOceanEvents = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.event_type !== undefined) filters.event_type = req.query.event_type;

    const rows = await findAllOceanEvents(filters);
    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
};

/** GET /api/ocean-events/:event_id — get one event. */
export const getOceanEventById = async (req, res, next) => {
  try {
    const eventId = parsePositiveInt(req.params.event_id, 'event_id');
    const row = await findOceanEventById(eventId);
    if (!row) throw new AppError('NOT_FOUND', 'Ocean event not found');

    res.status(200).json(row);
  } catch (error) {
    next(error);
  }
};

/** POST /api/ocean-events — create an ocean event. */
export const createOceanEvent = async (req, res, next) => {
  try {
    const minimum = req.body.min_materials ?? 0;
    const maximum = req.body.max_materials ?? 0;
    validateMaterialRange(minimum, maximum);
    const isUnexpected = req.body.is_unexpected ?? 0;
    const lossQuantity = req.body.loss_item_quantity ?? 0;
    validateLossConfig(isUnexpected, req.body.loss_item_type_id, lossQuantity);

    const data = {
      event_name: req.body.event_name,
      description: req.body.description,
      event_type: req.body.event_type,
      is_unexpected: isUnexpected,
      min_raft_size: req.body.min_raft_size ?? 1,
      risk_percent: req.body.risk_percent ?? 0,
      min_materials: minimum,
      max_materials: maximum,
      reward_item_quantity: req.body.reward_item_quantity ?? 0,
      loss_item_quantity: lossQuantity,
      cooldown_seconds: req.body.cooldown_seconds ?? 60,
      is_active: req.body.is_active ?? 1,
    };
    if (req.body.reward_item_type_id !== undefined) data.reward_item_type_id = req.body.reward_item_type_id;
    if (req.body.prevention_upgrade_type !== undefined) data.prevention_upgrade_type = req.body.prevention_upgrade_type;
    if (req.body.loss_item_type_id !== undefined) data.loss_item_type_id = req.body.loss_item_type_id;

    const row = await insertOceanEvent(data);
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
};

/** Load an event before a patch. This step calls only the event lookup model. */
export const loadOceanEventForPatch = async (req, res, next) => {
  try {
    const eventId = parsePositiveInt(req.params.event_id, 'event_id');
    const existing = await findOceanEventById(eventId);
    if (!existing) throw new AppError('NOT_FOUND', 'Ocean event not found');

    res.locals.oceanEventForPatch = existing;
    res.locals.oceanEventId = eventId;
    next();
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/ocean-events/:event_id — update an event without overwriting omitted fields. */
export const patchOceanEvent = async (req, res, next) => {
  try {
    const eventId = res.locals.oceanEventId;
    const existing = res.locals.oceanEventForPatch;

    const data = {};
    if (req.body.reward_item_type_id !== undefined) {
      data.reward_item_type_id = req.body.reward_item_type_id;
    }
    if (req.body.event_name !== undefined) data.event_name = req.body.event_name;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.event_type !== undefined) data.event_type = req.body.event_type;
    if (req.body.is_unexpected !== undefined) data.is_unexpected = req.body.is_unexpected;
    if (req.body.min_raft_size !== undefined) data.min_raft_size = req.body.min_raft_size;
    if (req.body.risk_percent !== undefined) data.risk_percent = req.body.risk_percent;
    if (req.body.min_materials !== undefined) data.min_materials = req.body.min_materials;
    if (req.body.max_materials !== undefined) data.max_materials = req.body.max_materials;
    if (req.body.reward_item_quantity !== undefined) data.reward_item_quantity = req.body.reward_item_quantity;
    if (req.body.prevention_upgrade_type !== undefined) data.prevention_upgrade_type = req.body.prevention_upgrade_type;
    if (req.body.loss_item_type_id !== undefined) {
      data.loss_item_type_id = req.body.loss_item_type_id;
    }
    if (req.body.loss_item_quantity !== undefined) data.loss_item_quantity = req.body.loss_item_quantity;
    if (req.body.cooldown_seconds !== undefined) data.cooldown_seconds = req.body.cooldown_seconds;
    if (req.body.is_active !== undefined) data.is_active = req.body.is_active;

    const minimum = data.min_materials ?? existing.min_materials;
    const maximum = data.max_materials ?? existing.max_materials;
    validateMaterialRange(minimum, maximum);
    const isUnexpected = data.is_unexpected ?? existing.is_unexpected;
    const lossItemTypeId = data.loss_item_type_id ?? existing.loss_item_type_id;
    const lossQuantity = data.loss_item_quantity ?? existing.loss_item_quantity;
    validateLossConfig(isUnexpected, lossItemTypeId, lossQuantity);

    if (Object.keys(data).length === 0) throw new AppError('VALIDATION_ERROR', 'No fields provided to update');

    const row = await updateOceanEvent(eventId, data);
    res.status(200).json(row);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/ocean-events/:event_id — delete an event. */
export const deleteOceanEvent = async (req, res, next) => {
  try {
    const eventId = parsePositiveInt(req.params.event_id, 'event_id');
    const row = await removeOceanEvent(eventId);
    if (!row) throw new AppError('NOT_FOUND', 'Ocean event not found');

    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
