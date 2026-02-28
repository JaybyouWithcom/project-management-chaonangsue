import type { CreateShopInput, Shop } from '../entities/Shop.js';

export interface ShopRepository {
  create(input: CreateShopInput): Promise<Shop>;
  findById(shopId: number): Promise<Shop | null>;
  findByUserId(userId: number): Promise<Shop[]>;
  updateById(shopId: number, input: { shopName: string; description: string | null; imagePath: string }): Promise<Shop>;
  softDeleteById(shopId: number): Promise<void>;
  restoreById(shopId: number): Promise<void>;
  hardDeleteById(shopId: number): Promise<void>;
}
