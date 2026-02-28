import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { BookController } from '../controllers/BookController.js';

export const buildBookRoutes = (bookController: BookController, authMiddleware: RequestHandler): Router => {
  const router = Router();

  router.get('/rentals/me', authMiddleware, (req, res, next) => {
    bookController.listMyRentals(req, res).catch(next);
  });

  router.get('/rentals/shop', authMiddleware, (req, res, next) => {
    bookController.listShopRentals(req, res).catch(next);
  });

  router.post('/rentals/:rentalId/pay-fine', authMiddleware, (req, res, next) => {
    bookController.payFine(req, res).catch(next);
  });

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

  router.patch('/:bookId', authMiddleware, (req, res, next) => {
    bookController.update(req, res).catch(next);
  });

  router.delete('/:bookId', authMiddleware, (req, res, next) => {
    bookController.delete(req, res).catch(next);
  });

  router.post('/:bookId/rent', authMiddleware, (req, res, next) => {
    bookController.rent(req, res).catch(next);
  });

  return router;
};
