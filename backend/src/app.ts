import path from 'node:path';

import express from 'express';

import { AuthService } from './application/services/AuthService.js';
import { BookService } from './application/services/BookService.js';
import { ShopService } from './application/services/ShopService.js';
import { AuthController } from './api/controllers/AuthController.js';
import { BookController } from './api/controllers/BookController.js';
import { ShopController } from './api/controllers/ShopController.js';
import { buildAuthMiddleware } from './api/middlewares/authMiddleware.js';
import { errorHandler } from './api/middlewares/errorHandler.js';
import { buildAuthRoutes } from './api/routes/authRoutes.js';
import { buildBookRoutes } from './api/routes/bookRoutes.js';
import { buildShopRoutes } from './api/routes/shopRoutes.js';
import { MySqlBookRepository } from './infrastructure/repositories/MySqlBookRepository.js';
import { MySqlShopRepository } from './infrastructure/repositories/MySqlShopRepository.js';
import { MySqlUserRepository } from './infrastructure/repositories/MySqlUserRepository.js';

export const buildApp = () => {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  const userRepository = new MySqlUserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);
  const authMiddleware = buildAuthMiddleware(authService);

  const shopRepository = new MySqlShopRepository();
  const shopService = new ShopService(shopRepository);
  const shopController = new ShopController(shopService);

  const bookRepository = new MySqlBookRepository();
  const bookService = new BookService(bookRepository, shopRepository);
  const bookController = new BookController(bookService);

  app.get('/health', (_req, res) => {
    res.status(200).json({ service: 'chaonangsue-backend', status: 'ok' });
  });

  app.use('/api/auth', buildAuthRoutes(authController, authMiddleware));
  app.use('/api/books', buildBookRoutes(bookController, authMiddleware));
  app.use('/api/shops', buildShopRoutes(shopController, authMiddleware));

  app.use(errorHandler);

  return app;
};
