import type { Shop } from '../../domain/entities/Shop.js';
import type { ShopRepository } from '../../domain/repositories/ShopRepository.js';
import { AppError } from '../../shared/errors/AppError.js';

interface CreateShopInput {
  userId: number;
  shopName: string;
  description?: string;
}

export class ShopService {
  constructor(private readonly shopRepository: ShopRepository) {}

  async create(input: CreateShopInput): Promise<Shop> {
    if (!input.shopName.trim()) {
      throw new AppError('กรุณาระบุชื่อร้าน', 400);
    }

    return this.shopRepository.create({
      userId: input.userId,
      shopName: input.shopName.trim(),
      description: input.description?.trim() || undefined,
    });
  }

  async listByUserId(userId: number): Promise<Shop[]> {
    return this.shopRepository.findByUserId(userId);
  }
}
