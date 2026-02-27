import type { Response } from 'express';

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
}

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200, meta?: ApiMeta): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
};

export const sendError = (res: Response, message: string, statusCode: number): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
};
