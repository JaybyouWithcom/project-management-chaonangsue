import type { RequestHandler, Router } from 'express';
import express from 'express';

import type { AddressController } from '../controllers/AddressController.js';

export const buildAddressRoutes = (
  addressController: AddressController,
  authMiddleware: RequestHandler,
): Router => {
  const router = express.Router();

  router.get('/', authMiddleware, (req, res, next) => {
    addressController.listMine(req, res).catch(next);
  });

  router.post('/', authMiddleware, (req, res, next) => {
    addressController.create(req, res).catch(next);
  });

  router.patch('/:addressId', authMiddleware, (req, res, next) => {
    addressController.update(req, res).catch(next);
  });

  router.delete('/:addressId', authMiddleware, (req, res, next) => {
    addressController.delete(req, res).catch(next);
  });

  return router;
};
