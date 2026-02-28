import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import type { Book, BookQuery, CreateBookInput } from '../../domain/entities/Book.js';
import type { BookRepository } from '../../domain/repositories/BookRepository.js';
import { dbPool } from '../database/mysql.js';

interface BookRow extends RowDataPacket {
  book_id: number;
  owner_id: number;
  shop_id: number | null;
  shop_name: string | null;
  title: string;
  image_path: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  book_condition: '1' | '2' | '3' | '4' | '5' | null;
  description: string | null;
  book_price: string;
  status: 'Available' | 'Rented';
  created_at: Date;
  owner_name: string;
}

const baseSelect = `
  SELECT b.*, u.username AS owner_name, s.shop_name
  FROM books b
  JOIN users u ON u.user_id = b.owner_id
  LEFT JOIN shops s ON s.shop_id = b.shop_id
`;

const mapBook = (row: BookRow): Book => ({
  bookId: row.book_id,
  ownerId: row.owner_id,
  shopId: row.shop_id,
  shopName: row.shop_name,
  title: row.title,
  imagePath: row.image_path,
  author: row.author,
  isbn: row.isbn,
  genre: row.genre,
  bookCondition: row.book_condition,
  description: row.description,
  bookPrice: row.book_price,
  status: row.status,
  createdAt: row.created_at,
  ownerName: row.owner_name,
});

export class MySqlBookRepository implements BookRepository {
  async create(input: CreateBookInput): Promise<Book> {
    const [result] = await dbPool.query<ResultSetHeader>(
      `INSERT INTO books (owner_id, shop_id, title, image_path, author, isbn, genre, book_condition, description, book_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
      [
        input.ownerId,
        input.shopId,
        input.title,
        input.imagePath,
        input.author,
        input.isbn ?? null,
        input.genre ?? null,
        input.bookCondition ?? null,
        input.description ?? null,
        input.bookPrice,
      ],
    );

    const created = await this.findById(result.insertId);
    if (!created) {
      throw new Error('Failed to load created book');
    }

    return created;
  }

  async findById(bookId: number): Promise<Book | null> {
    const [rows] = await dbPool.query<BookRow[]>(`${baseSelect} WHERE b.book_id = ? LIMIT 1`, [bookId]);
    return rows.length > 0 ? mapBook(rows[0]) : null;
  }

  async findAvailable(query: BookQuery): Promise<{ items: Book[]; total: number }> {
    const whereClauses: string[] = ['b.status = ?'];
    const values: Array<string | number> = ['Available'];

    whereClauses.push('(b.shop_id IS NULL OR s.deleted_at IS NULL)');

    if (query.shopId !== undefined) {
      whereClauses.push('b.shop_id = ?');
      values.push(query.shopId);
    }

    if (query.q) {
      whereClauses.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn = ?)');
      values.push(`%${query.q}%`, `%${query.q}%`, query.q);
    }

    if (query.genre) {
      whereClauses.push('b.genre = ?');
      values.push(query.genre);
    }

    if (query.minPrice !== undefined) {
      whereClauses.push('b.book_price >= ?');
      values.push(query.minPrice);
    }

    if (query.maxPrice !== undefined) {
      whereClauses.push('b.book_price <= ?');
      values.push(query.maxPrice);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await dbPool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM books b
       LEFT JOIN shops s ON s.shop_id = b.shop_id
       ${whereSql}`,
      values,
    );

    const offset = (query.page - 1) * query.limit;
    const [rows] = await dbPool.query<BookRow[]>(
      `${baseSelect} ${whereSql} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...values, query.limit, offset],
    );

    return {
      items: rows.map(mapBook),
      total: Number(countRows[0].total),
    };
  }

  async existsByShopAndTitle(shopId: number, title: string): Promise<boolean> {
    const [rows] = await dbPool.query<RowDataPacket[]>(
      'SELECT 1 FROM books WHERE shop_id = ? AND title = ? LIMIT 1',
      [shopId, title],
    );

    return rows.length > 0;
  }

  async updateById(bookId: number, input: {
    title: string;
    imagePath: string;
    author: string;
    isbn: string | null;
    genre: string | null;
    bookCondition: '1' | '2' | '3' | '4' | '5' | null;
    description: string | null;
    bookPrice: number;
  }): Promise<Book> {
    await dbPool.query(
      `
      UPDATE books
      SET title = ?, image_path = ?, author = ?, isbn = ?, genre = ?, book_condition = ?, description = ?, book_price = ?
      WHERE book_id = ?
      `,
      [
        input.title,
        input.imagePath,
        input.author,
        input.isbn,
        input.genre,
        input.bookCondition,
        input.description,
        input.bookPrice,
        bookId,
      ],
    );

    const updated = await this.findById(bookId);
    if (!updated) {
      throw new Error('Failed to load updated book');
    }

    return updated;
  }

  async deleteById(bookId: number): Promise<void> {
    await dbPool.query('DELETE FROM books WHERE book_id = ?', [bookId]);
  }
}
