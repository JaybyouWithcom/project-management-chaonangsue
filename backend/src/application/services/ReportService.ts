import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { dbPool } from '../../infrastructure/database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';

interface BookRow extends RowDataPacket {
  book_id: number;
  deleted_at: Date | null;
}

interface ShopRow extends RowDataPacket {
  shop_id: number;
  deleted_at: Date | null;
}

export interface ReportCreateInput {
  reporterUserId: number;
  reason: string;
  details?: string | null;
}

export class ReportService {
  async createBookReport(bookId: number, input: ReportCreateInput): Promise<number> {
    const [rows] = await dbPool.query<BookRow[]>(
      'SELECT book_id, deleted_at FROM books WHERE book_id = ? LIMIT 1',
      [bookId],
    );
    if (rows.length === 0 || rows[0].deleted_at !== null) {
      throw new AppError('Book not found', 404);
    }

    const [result] = await dbPool.query<ResultSetHeader>(
      `
      INSERT INTO reports (report_type, book_id, reporter_user_id, reason, details)
      VALUES ('Book', ?, ?, ?, ?)
      `,
      [bookId, input.reporterUserId, input.reason, input.details ?? null],
    );
    return result.insertId;
  }

  async createShopReport(shopId: number, input: ReportCreateInput): Promise<number> {
    const [rows] = await dbPool.query<ShopRow[]>(
      'SELECT shop_id, deleted_at FROM shops WHERE shop_id = ? LIMIT 1',
      [shopId],
    );
    if (rows.length === 0 || rows[0].deleted_at !== null) {
      throw new AppError('Shop not found', 404);
    }

    const [result] = await dbPool.query<ResultSetHeader>(
      `
      INSERT INTO reports (report_type, shop_id, reporter_user_id, reason, details)
      VALUES ('Shop', ?, ?, ?, ?)
      `,
      [shopId, input.reporterUserId, input.reason, input.details ?? null],
    );
    return result.insertId;
  }
}
