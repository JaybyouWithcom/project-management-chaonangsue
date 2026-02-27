import fs from 'node:fs/promises';
import path from 'node:path';

import type { Request, Response } from 'express';

import type { ShopService } from '../../application/services/ShopService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const saveImageFromDataUrl = async (imageBase64: string): Promise<string> => {
  const matched = imageBase64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matched) {
    throw new AppError('รูปภาพต้องเป็น base64 data URL (png/jpeg/webp)', 400);
  }

  const mime = matched[1];
  const data = matched[3];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'shops');

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(data, 'base64'));

  return `/uploads/shops/${filename}`;
};

export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  detail = async (req: Request, res: Response): Promise<void> => {
    const shopId = Number(req.params.shopId);
    if (!Number.isInteger(shopId) || shopId <= 0) {
      throw new AppError('shopId must be an integer', 400);
    }

    const shop = await this.shopService.getById(shopId);
    sendSuccess(res, { shop });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { shopName, description, imageBase64 } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(shopName)) {
      throw new AppError('กรุณาระบุชื่อร้าน', 400);
    }
    if (!isNonEmptyString(imageBase64)) {
      throw new AppError('กรุณาอัปโหลดรูปร้าน', 400);
    }

    const imagePath = await saveImageFromDataUrl(imageBase64);

    const shop = await this.shopService.create({
      userId: req.auth.userId,
      shopName,
      description: isNonEmptyString(description) ? description : undefined,
      imagePath,
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
