// Handles read operations for the server-owned ocean-event catalogue.
import { findAllOceanEvents, findOceanEventById } from '../models/oceanEventModel.js';
import { AppError } from '../utils/_errors.js';

/** Parses a route parameter to a positive integer. */
const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} must be a positive integer`);
  }
  return parsed;
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
