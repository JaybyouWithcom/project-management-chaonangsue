import express from 'express';

import { AuthService } from './application/services/AuthService.js';
import { AuthController } from './api/controllers/AuthController.js';
import { buildAuthMiddleware } from './api/middlewares/authMiddleware.js';
import { errorHandler } from './api/middlewares/errorHandler.js';
import { buildAuthRoutes } from './api/routes/authRoutes.js';
import { MySqlUserRepository } from './infrastructure/repositories/MySqlUserRepository.js';

export const buildApp = () => {
  const app = express();

  app.use(express.json());

  const userRepository = new MySqlUserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);
  const authMiddleware = buildAuthMiddleware(authService);

  app.get('/health', (_req, res) => {
    res.status(200).json({ service: 'chaonangsue-backend', status: 'ok' });
  });

  app.use('/api/auth', buildAuthRoutes(authController, authMiddleware));

  app.use(errorHandler);

  return app;
};
