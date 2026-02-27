import type { NextFunction, Request, Response } from 'express';

import type { AuthService } from '../../application/services/AuthService.js';
import { AppError } from '../../shared/errors/AppError.js';

const getBearerToken = (authorization?: string): string | null => {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const buildAuthMiddleware = (authService: AuthService) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = getBearerToken(req.header('authorization'));

    if (!token) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    const payload = authService.verifyToken(token);
    req.auth = {
      userId: Number(payload.sub),
      role: payload.role,
    };

    next();
  };
};

export const buildOptionalAuthMiddleware = (authService: AuthService) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = getBearerToken(req.header('authorization'));
    if (!token) {
      next();
      return;
    }

    const payload = authService.verifyToken(token);
    req.auth = {
      userId: Number(payload.sub),
      role: payload.role,
    };

    next();
  };
};
