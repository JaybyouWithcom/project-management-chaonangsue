import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { AdminController } from '../controllers/AdminController.js';

export const buildAdminRoutes = (adminController: AdminController, authMiddleware: RequestHandler): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.get('/dashboard', (req, res, next) => {
    adminController.dashboard(req, res).catch(next);
  });

  router.patch('/users/:userId/status', (req, res, next) => {
    adminController.updateUserStatus(req, res).catch(next);
  });

  router.delete('/books/:bookId', (req, res, next) => {
    adminController.softDeleteBook(req, res).catch(next);
  });

  router.patch('/reports/:reportId', (req, res, next) => {
    adminController.updateReportStatus(req, res).catch(next);
  });

  return router;
};
