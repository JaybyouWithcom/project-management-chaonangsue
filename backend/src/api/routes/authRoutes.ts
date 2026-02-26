import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { AuthController } from '../controllers/AuthController.js';

export const buildAuthRoutes = (
  authController: AuthController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  router.post('/register', (req, res, next) => {
    authController.register(req, res).catch(next);
  });

  router.post('/login', (req, res, next) => {
    authController.login(req, res).catch(next);
  });

  router.get('/me', authMiddleware, (req, res, next) => {
    authController.me(req, res).catch(next);
  });

  return router;
};
