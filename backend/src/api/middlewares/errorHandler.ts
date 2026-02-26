import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../shared/errors/AppError.js';

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
};
