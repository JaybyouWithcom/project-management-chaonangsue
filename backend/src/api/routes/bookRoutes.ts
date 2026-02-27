import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { BookController } from '../controllers/BookController.js';

export const buildBookRoutes = (bookController: BookController, authMiddleware: RequestHandler): Router => {
  const router = Router();

  router.get('/', (req, res, next) => {
    bookController.list(req, res).catch(next);
  });

  router.get('/:bookId', (req, res, next) => {
    bookController.detail(req, res).catch(next);
  });

  router.get('/:bookId/quote', (req, res, next) => {
    bookController.quote(req, res).catch(next);
  });

  router.post('/', authMiddleware, (req, res, next) => {
    bookController.create(req, res).catch(next);
  });

  return router;
};
