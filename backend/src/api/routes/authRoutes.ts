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

  router.post('/password/forgot', (req, res, next) => {
    authController.forgotPassword(req, res).catch(next);
  });

  router.post('/password/reset', (req, res, next) => {
    authController.resetPassword(req, res).catch(next);
  });

  router.post('/verification/request-otp', (req, res, next) => {
    authController.requestOtp(req, res).catch(next);
  });

  router.post('/verification/verify-otp', (req, res, next) => {
    authController.verifyOtp(req, res).catch(next);
  });

  router.get('/me', authMiddleware, (req, res, next) => {
    authController.me(req, res).catch(next);
  });

  router.patch('/me', authMiddleware, (req, res, next) => {
    authController.updateMe(req, res).catch(next);
  });

  router.patch('/me/password', authMiddleware, (req, res, next) => {
    authController.changePassword(req, res).catch(next);
  });

  router.post('/wallet/topup', authMiddleware, (req, res, next) => {
    authController.topUpWallet(req, res).catch(next);
  });

  router.get('/wallet/transactions', authMiddleware, (req, res, next) => {
    authController.listWalletTransactions(req, res).catch(next);
  });

  return router;
};
