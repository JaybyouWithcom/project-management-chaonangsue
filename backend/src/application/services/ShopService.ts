import type { Shop } from '../../domain/entities/Shop.js';
import type { ShopRepository } from '../../domain/repositories/ShopRepository.js';
import { AppError } from '../../shared/errors/AppError.js';

interface CreateShopInput {
  userId: number;
  shopName: string;
  description?: string;
  imagePath: string;
}

export class ShopService {
  constructor(private readonly shopRepository: ShopRepository) {}

  async create(input: CreateShopInput): Promise<Shop> {
    if (!input.shopName.trim()) {
      throw new AppError('กรุณาระบุชื่อร้าน', 400);
    }
    if (!input.imagePath.trim()) {
      throw new AppError('กรุณาอัปโหลดรูปร้าน', 400);
    }

    return this.shopRepository.create({
      userId: input.userId,
      shopName: input.shopName.trim(),
      description: input.description?.trim() || undefined,
      imagePath: input.imagePath.trim(),
    });
  }

  async listByUserId(userId: number): Promise<Shop[]> {
    return this.shopRepository.findByUserId(userId);
  }

  async getById(shopId: number): Promise<Shop> {
    if (!Number.isInteger(shopId) || shopId <= 0) {
      throw new AppError('shopId must be an integer', 400);
    }

    const shop = await this.shopRepository.findById(shopId);
    if (!shop) {
      throw new AppError('ไม่พบร้านที่ต้องการ', 404);
    }

    return shop;
  }
}
