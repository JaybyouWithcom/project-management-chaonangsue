import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import type { CreateShopInput, Shop } from '../../domain/entities/Shop.js';
import type { ShopRepository } from '../../domain/repositories/ShopRepository.js';
import { dbPool } from '../database/mysql.js';

interface ShopRow extends RowDataPacket {
  shop_id: number;
  user_id: number;
  shop_name: string;
  description: string | null;
  image_path: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

const mapShop = (row: ShopRow): Shop => ({
  shopId: row.shop_id,
  userId: row.user_id,
  shopName: row.shop_name,
  description: row.description,
  imagePath: row.image_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

export class MySqlShopRepository implements ShopRepository {
  async create(input: CreateShopInput): Promise<Shop> {
    const [result] = await dbPool.query<ResultSetHeader>(
      `
      INSERT INTO shops (user_id, shop_name, description, image_path)
      VALUES (?, ?, ?, ?)
      `,
      [input.userId, input.shopName, input.description ?? null, input.imagePath],
    );

    const shop = await this.findById(result.insertId);
    if (!shop) {
      throw new Error('Failed to load created shop');
    }

    return shop;
  }

  async findById(shopId: number): Promise<Shop | null> {
    const [rows] = await dbPool.query<ShopRow[]>(
      'SELECT * FROM shops WHERE shop_id = ? AND deleted_at IS NULL LIMIT 1',
      [shopId],
    );

    return rows.length > 0 ? mapShop(rows[0]) : null;
  }

  async findByUserId(userId: number): Promise<Shop[]> {
    const [rows] = await dbPool.query<ShopRow[]>(
      'SELECT * FROM shops WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [userId],
    );

    return rows.map(mapShop);
  }

  async softDeleteById(shopId: number): Promise<void> {
    await dbPool.query('UPDATE shops SET deleted_at = NOW() WHERE shop_id = ? AND deleted_at IS NULL', [shopId]);
  }

  async restoreById(shopId: number): Promise<void> {
    await dbPool.query('UPDATE shops SET deleted_at = NULL WHERE shop_id = ? AND deleted_at IS NOT NULL', [shopId]);
  }

  async hardDeleteById(shopId: number): Promise<void> {
    await dbPool.query('DELETE FROM shops WHERE shop_id = ?', [shopId]);
  }
}
