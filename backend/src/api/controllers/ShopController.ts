import type { Request, Response } from 'express';

import type { ShopService } from '../../application/services/ShopService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { shopName, description } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(shopName)) {
      throw new AppError('กรุณาระบุชื่อร้าน', 400);
    }

    const shop = await this.shopService.create({
      userId: req.auth.userId,
      shopName,
      description: isNonEmptyString(description) ? description : undefined,
    });

    sendSuccess(res, { shop }, 201);
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const shops = await this.shopService.listByUserId(req.auth.userId);
    sendSuccess(res, { shops });
  };
}
