// Defines read-only endpoints for the server-owned item catalogue.
import { Router } from 'express';
import { getAllItemTypes, getItemTypeById } from '../controllers/itemCatalogController.js';

export const itemCatalogRouter = Router();

itemCatalogRouter.get('/', getAllItemTypes);
itemCatalogRouter.get('/:item_type_id', getItemTypeById);
