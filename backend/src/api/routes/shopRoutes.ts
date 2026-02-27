import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { ShopController } from '../controllers/ShopController.js';

export const buildShopRoutes = (shopController: ShopController, authMiddleware: RequestHandler): Router => {
  const router = Router();

  router.get('/:shopId', (req, res, next) => {
    shopController.detail(req, res).catch(next);
  });

  router.get('/', authMiddleware, (req, res, next) => {
    shopController.listMine(req, res).catch(next);
  });

  router.post('/', authMiddleware, (req, res, next) => {
    shopController.create(req, res).catch(next);
  });

  return router;
};
