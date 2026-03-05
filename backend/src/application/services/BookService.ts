import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import type { Book, RentalPlan } from '../../domain/entities/Book.js';
import type { BookRepository } from '../../domain/repositories/BookRepository.js';
import type { ShopRepository } from '../../domain/repositories/ShopRepository.js';
import { env } from '../../infrastructure/config/env.js';
import { dbPool } from '../../infrastructure/database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';

interface CreateBookInput {
  ownerId: number;
  shopId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn?: string;
  genre?: string;
  bookCondition?: '1' | '2' | '3' | '4' | '5';
  description?: string;
  bookPrice: number;
}

interface UpdateBookInput {
  ownerId: number;
  bookId: number;
  title?: string;
  imagePath?: string;
  author?: string;
  isbn?: string;
  genre?: string;
  bookCondition?: '1' | '2' | '3' | '4' | '5';
  description?: string;
  bookPrice?: number;
}

interface SearchBooksInput {
  shopId?: number;
  q?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}

const planDaysMap: Record<RentalPlan, number> = {
  '15days': 15,
  '30days': 30,
};

const planRateMap: Record<RentalPlan, number> = {
  '15days': 0.3,
  '30days': 0.5,
};

const depositRate = 0.5;

const toMoney = (value: number): number => Math.round(value * 100) / 100;

interface BookForRentRow extends RowDataPacket {
  book_id: number;
  owner_id: number;
  title: string;
  book_price: string;
  status: 'Available' | 'Rented';
}

interface UserBalanceRow extends RowDataPacket {
  user_id: number;
  balance: string;
}

interface RentalRow extends RowDataPacket {
  rental_id: number;
  book_id: number;
  book_title: string;
  book_cover: string;
  book_author: string;
  book_condition: string | null;
  book_price: string;
  renter_name: string;
  renter_id: number;
  start_date: Date;
  due_date: Date;
  rental_price: string;
  commission_rate: string;
  net_rental_amount: string;
  deposit_price: string;
  total_amount: string;
  past_due_days: number;
  fine_paid_at: Date | null;
  fine_amount_due: string;
  fine_amount_total: string;
  payment_status: 'ชำระแล้ว' | 'รอชำระ' | 'ยกเลิก';
  status: 'กำลังยืม' | 'รอคืน' | 'คืนแล้ว' | 'เลยกำหนด';
  return_requested_at: Date | null;
  return_delivery_sent_at: Date | null;
  return_delivery_proof_path: string | null;
}

export interface RentalListItem {
  rentalId: number;
  bookId: number;
  bookTitle: string;
  bookCover: string;
  bookAuthor: string;
  bookCondition: string | null;
  bookPrice: number;
  renterName: string;
  renterId: number;
  startDate: string;
  endDate: string;
  rentalPrice: number;
  commissionRate: number;
  netRentalAmount: number;
  depositPrice: number;
  totalPrice: number;
  pastDueDays: number;
  fineAmountDue: number;
  fineAmountTotal: number;
  finePaidAt: string | null;
  paymentStatus: 'ชำระแล้ว' | 'รอชำระ' | 'ยกเลิก';
  status: 'กำลังยืม' | 'รอคืน' | 'คืนแล้ว' | 'เลยกำหนด';
  returnRequestedAt: string | null;
  returnDeliverySentAt: string | null;
  returnDeliveryProofPath: string | null;
}

const mapRentalRow = (row: RentalRow): RentalListItem => ({
    rentalId: row.rental_id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    bookCover: row.book_cover,
    bookAuthor: row.book_author,
    bookCondition: row.book_condition,
    bookPrice: Number(row.book_price),
    renterName: row.renter_name,
    renterId: row.renter_id,
    startDate: row.start_date.toISOString(),
    endDate: row.due_date.toISOString(),
    rentalPrice: Number(row.rental_price),
    commissionRate: Number(row.commission_rate),
    netRentalAmount: Number(row.net_rental_amount),
    depositPrice: Number(row.deposit_price),
    totalPrice: Number(row.total_amount),
    pastDueDays: Number(row.past_due_days),
    fineAmountDue: Number(row.fine_amount_due),
    fineAmountTotal: Number(row.fine_amount_total),
    finePaidAt: row.fine_paid_at ? row.fine_paid_at.toISOString() : null,
    paymentStatus: row.payment_status,
    status: row.status,
    returnRequestedAt: row.return_requested_at ? row.return_requested_at.toISOString() : null,
    returnDeliverySentAt: row.return_delivery_sent_at ? row.return_delivery_sent_at.toISOString() : null,
    returnDeliveryProofPath: row.return_delivery_proof_path,
});

export class BookService {
  constructor(
    private readonly bookRepository: BookRepository,
    private readonly shopRepository: ShopRepository,
  ) {}

  async create(input: CreateBookInput): Promise<Book> {
    const shop = await this.shopRepository.findById(input.shopId);
    if (!shop || shop.userId !== input.ownerId) {
      throw new AppError('ไม่พบร้านที่คุณเลือก หรือคุณไม่มีสิทธิ์จัดการร้านนี้', 403);
    }

    if (await this.bookRepository.existsByShopAndTitle(input.shopId, input.title)) {
      throw new AppError('หนังสือนี้ถูกลงในร้านของคุณแล้ว', 409);
    }

    return this.bookRepository.create(input);
  }

  async search(input: SearchBooksInput): Promise<{ items: Book[]; total: number; page: number; limit: number }> {
    const result = await this.bookRepository.findAvailable(input);
    return {
      ...result,
      page: input.page,
      limit: input.limit,
    };
  }

  async getById(bookId: number): Promise<Book> {
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      throw new AppError('ไม่พบหนังสือเล่มนี้', 404);
    }

    return book;
  }

  async update(input: UpdateBookInput): Promise<Book> {
    const book = await this.bookRepository.findById(input.bookId);
    if (!book) {
      throw new AppError('ไม่พบหนังสือที่ต้องการ', 404);
    }
    if (book.ownerId !== input.ownerId) {
      throw new AppError('Unauthorized', 403);
    }

    const nextTitle = input.title !== undefined ? input.title.trim() : book.title;
    if (!nextTitle) {
      throw new AppError('กรุณาระบุชื่อหนังสือ', 400);
    }
    if (book.shopId && nextTitle !== book.title && await this.bookRepository.existsByShopAndTitle(book.shopId, nextTitle)) {
      throw new AppError('หนังสือชื่อนี้มีอยู่ในร้านแล้ว', 409);
    }

    const nextAuthor = input.author !== undefined ? input.author.trim() : book.author;
    if (!nextAuthor) {
      throw new AppError('กรุณาระบุผู้เขียน', 400);
    }

    const nextPrice = input.bookPrice !== undefined ? input.bookPrice : Number(book.bookPrice);
    if (!Number.isFinite(nextPrice)) {
      throw new AppError('bookPrice must be a number', 400);
    }

    const nextIsbn = input.isbn !== undefined ? (input.isbn.trim() || null) : book.isbn;
    const nextGenre = input.genre !== undefined ? (input.genre.trim() || null) : book.genre;
    const nextCondition = input.bookCondition !== undefined ? input.bookCondition : book.bookCondition;
    const nextDescription = input.description !== undefined ? (input.description.trim() || null) : book.description;
    const nextImagePath = input.imagePath ?? book.imagePath;

    return this.bookRepository.updateById(input.bookId, {
      title: nextTitle,
      imagePath: nextImagePath,
      author: nextAuthor,
      isbn: nextIsbn,
      genre: nextGenre,
      bookCondition: nextCondition,
      description: nextDescription,
      bookPrice: nextPrice,
    });
  }

  async delete(input: { ownerId: number; bookId: number }): Promise<void> {
    const book = await this.bookRepository.findById(input.bookId);
    if (!book) {
      throw new AppError('ไม่พบหนังสือที่ต้องการ', 404);
    }
    if (book.ownerId !== input.ownerId) {
      throw new AppError('Unauthorized', 403);
    }

    await this.bookRepository.deleteById(input.bookId);
  }

  async getBorrowQuote(bookId: number, plan: RentalPlan): Promise<{
    book: Book;
    rentalPlan: RentalPlan;
    dueDate: string;
    rentalPrice: number;
    depositPrice: number;
    totalAmount: number;
  }> {
    const book = await this.getById(bookId);
    if (book.status !== 'Available') {
      throw new AppError('หนังสือเล่มนี้ไม่พร้อมให้ยืม', 409);
    }
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + planDaysMap[plan]);

    const basePrice = Number(book.bookPrice);
    const rentalPrice = toMoney(basePrice * planRateMap[plan]);
    const depositPrice = toMoney(basePrice * depositRate);
    const totalAmount = toMoney(rentalPrice + depositPrice);

    return {
      book,
      rentalPlan: plan,
      dueDate: dueDate.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(' ', 'T'),
      rentalPrice,
      depositPrice,
      totalAmount,
    };
  }

  async rent(input: {
    userId: number;
    bookId: number;
    plan: RentalPlan;
  }): Promise<{
    bookId: number;
    rentalPlan: RentalPlan;
    dueDate: string;
    totalAmount: number;
    balanceAfter: number;
  }> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [bookRows] = await connection.query<Array<BookForRentRow & { shop_id: number | null }>>(
        'SELECT book_id, owner_id, shop_id, title, book_price, status FROM books WHERE book_id = ? FOR UPDATE',
        [input.bookId],
      );

      if (bookRows.length === 0) {
        throw new AppError('ไม่พบหนังสือเล่มนี้', 404);
      }

      const book = bookRows[0];
      if (book.status !== 'Available') {
        throw new AppError('หนังสือเล่มนี้ไม่พร้อมให้ยืม', 409);
      }
      if (book.owner_id === input.userId) {
        throw new AppError('ไม่สามารถเช่าหนังสือของร้านตัวเองได้', 400);
      }

      const [userRows] = await connection.query<UserBalanceRow[]>(
        'SELECT user_id, balance FROM users WHERE user_id = ? AND deleted_at IS NULL FOR UPDATE',
        [input.userId],
      );

      if (userRows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const basePrice = Number(book.book_price);
      const rentalPrice = toMoney(basePrice * planRateMap[input.plan]);
      const commissionRate = env.billing.commissionRate;
      const netRentalAmount = toMoney(rentalPrice * (1 - commissionRate));
      const depositPrice = toMoney(basePrice * depositRate);
      const totalAmount = toMoney(rentalPrice + depositPrice);
      const currentBalance = Number(userRows[0].balance);

      if (currentBalance < totalAmount) {
        throw new AppError('ยอดเงินไม่เพียงพอ', 400);
      }

      const balanceAfter = toMoney(currentBalance - totalAmount);

      await connection.query('UPDATE users SET balance = ? WHERE user_id = ?', [balanceAfter, input.userId]);
      await connection.query('UPDATE books SET status = ? WHERE book_id = ?', ['Rented', input.bookId]);
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + planDaysMap[input.plan]);
      const [rentalResult] = await connection.query<ResultSetHeader>(
        `
        INSERT INTO rentals (
          book_id,
          shop_id,
          renter_id,
          borrower_id,
          owner_id,
          rental_plan,
          start_date,
          due_date,
          rental_price,
          commission_rate,
          net_rental_amount,
          deposit_price,
          total_amount,
          past_due_days,
          fine_paid_at,
          status,
          payment_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 'กำลังยืม', 'ชำระแล้ว')
        `,
        [
          input.bookId,
          book.shop_id,
          input.userId,
          input.userId,
          book.owner_id,
          input.plan,
          now,
          dueDate,
          rentalPrice,
          commissionRate,
          netRentalAmount,
          depositPrice,
          totalAmount,
        ],
      );

      await connection.query(
        `
        INSERT INTO wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        VALUES (?, 'RENTAL', ?, ?, ?)
        `,
        [input.userId, -totalAmount, `เช่าหนังสือ: ${book.title}`, rentalResult.insertId],
      );

      await connection.commit();

      return {
        bookId: input.bookId,
        rentalPlan: input.plan,
        dueDate: dueDate.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(' ', 'T'),
        totalAmount,
        balanceAfter,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async listRentalsByUserId(userId: number): Promise<RentalListItem[]> {
    const [rows] = await dbPool.query<RentalRow[]>(
      `
      SELECT
        r.rental_id,
        r.book_id,
        b.title AS book_title,
        b.image_path AS book_cover,
        b.author AS book_author,
        b.book_condition,
        b.book_price,
        u.username AS renter_name,
        COALESCE(r.renter_id, r.borrower_id) AS renter_id,
        r.start_date,
        r.due_date,
        r.rental_price,
        r.commission_rate,
        r.net_rental_amount,
        r.deposit_price,
        r.total_amount,
        CASE
          WHEN (r.status = 'เลยกำหนด' OR (r.status = 'กำลังยืม' AND r.due_date < NOW())) AND r.fine_paid_at IS NULL
          THEN GREATEST(r.past_due_days, DATEDIFF(NOW(), r.due_date), 1)
          ELSE r.past_due_days
        END AS past_due_days,
        r.fine_paid_at,
        CASE
          WHEN (r.status = 'เลยกำหนด' OR (r.status = 'กำลังยืม' AND r.due_date < NOW())) AND r.fine_paid_at IS NULL
          THEN ROUND((GREATEST(r.past_due_days, DATEDIFF(NOW(), r.due_date), 1) * r.rental_price * 0.30), 2)
          ELSE 0
        END AS fine_amount_due,
        ROUND((r.past_due_days * r.rental_price * 0.30), 2) AS fine_amount_total,
        r.payment_status,
        r.return_requested_at,
        r.return_delivery_sent_at,
        r.return_delivery_proof_path,
        CASE
          WHEN r.status = 'กำลังยืม' AND r.due_date < NOW() THEN 'เลยกำหนด'
          ELSE r.status
        END AS status
      FROM rentals r
      JOIN books b ON b.book_id = r.book_id
      JOIN users u ON u.user_id = COALESCE(r.renter_id, r.borrower_id)
      WHERE COALESCE(r.renter_id, r.borrower_id) = ?
      ORDER BY r.created_at DESC
      `,
      [userId],
    );

    return rows.map(mapRentalRow);
  }

  async listRentalsByShop(userId: number, shopId: number): Promise<RentalListItem[]> {
    const shop = await this.shopRepository.findById(shopId);
    if (!shop || shop.userId !== userId) {
      throw new AppError('ไม่พบร้านที่คุณเลือก หรือคุณไม่มีสิทธิ์จัดการร้านนี้', 403);
    }

    const [rows] = await dbPool.query<RentalRow[]>(
      `
      SELECT
        r.rental_id,
        r.book_id,
        b.title AS book_title,
        b.image_path AS book_cover,
        b.author AS book_author,
        b.book_condition,
        b.book_price,
        u.username AS renter_name,
        COALESCE(r.renter_id, r.borrower_id) AS renter_id,
        r.start_date,
        r.due_date,
        r.rental_price,
        r.commission_rate,
        r.net_rental_amount,
        r.deposit_price,
        r.total_amount,
        CASE
          WHEN (r.status = 'เลยกำหนด' OR (r.status = 'กำลังยืม' AND r.due_date < NOW())) AND r.fine_paid_at IS NULL
          THEN GREATEST(r.past_due_days, DATEDIFF(NOW(), r.due_date), 1)
          ELSE r.past_due_days
        END AS past_due_days,
        r.fine_paid_at,
        CASE
          WHEN (r.status = 'เลยกำหนด' OR (r.status = 'กำลังยืม' AND r.due_date < NOW())) AND r.fine_paid_at IS NULL
          THEN ROUND((GREATEST(r.past_due_days, DATEDIFF(NOW(), r.due_date), 1) * r.rental_price * 0.30), 2)
          ELSE 0
        END AS fine_amount_due,
        ROUND((r.past_due_days * r.rental_price * 0.30), 2) AS fine_amount_total,
        r.payment_status,
        r.return_requested_at,
        r.return_delivery_sent_at,
        r.return_delivery_proof_path,
        CASE
          WHEN r.status = 'กำลังยืม' AND r.due_date < NOW() THEN 'เลยกำหนด'
          ELSE r.status
        END AS status
      FROM rentals r
      JOIN books b ON b.book_id = r.book_id
      JOIN users u ON u.user_id = COALESCE(r.renter_id, r.borrower_id)
      WHERE r.shop_id = ?
      ORDER BY r.created_at DESC
      `,
      [shopId],
    );

    return rows.map(mapRentalRow);
  }

  async payFine(input: {
    userId: number;
    rentalId: number;
  }): Promise<{
    rentalId: number;
    pastDueDays: number;
    fineAmount: number;
    balanceAfter: number;
  }> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [rentalRows] = await connection.query<Array<{
        rental_id: number;
        renter_id: number;
        rental_price: string;
        due_date: Date;
        status: 'กำลังยืม' | 'รอคืน' | 'คืนแล้ว' | 'เลยกำหนด';
        fine_paid_at: Date | null;
        past_due_days: number;
      } & RowDataPacket>>(
        `
        SELECT rental_id, COALESCE(renter_id, borrower_id) AS renter_id, rental_price, due_date, status, fine_paid_at, past_due_days
        FROM rentals
        WHERE rental_id = ?
        FOR UPDATE
        `,
        [input.rentalId],
      );

      if (rentalRows.length === 0) {
        throw new AppError('Rental not found', 404);
      }

      const rental = rentalRows[0];
      if (rental.renter_id !== input.userId) {
        throw new AppError('Unauthorized', 403);
      }
      if (rental.fine_paid_at) {
        throw new AppError('ชำระค่าปรับแล้ว', 400);
      }

      const overdueDays = Math.max(0, Math.ceil((Date.now() - rental.due_date.getTime()) / 86400000));
      const isOverdue = rental.status === 'เลยกำหนด' || overdueDays > 0;
      if (!isOverdue) {
        throw new AppError('รายการนี้ยังไม่เลยกำหนด', 400);
      }

      const pastDueDays = Math.max(rental.past_due_days, overdueDays, 1);
      const fineAmount = toMoney(Number(rental.rental_price) * 0.30 * pastDueDays);

      const [userRows] = await connection.query<UserBalanceRow[]>(
        'SELECT user_id, balance FROM users WHERE user_id = ? AND deleted_at IS NULL FOR UPDATE',
        [input.userId],
      );
      if (userRows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const currentBalance = Number(userRows[0].balance);
      if (currentBalance < fineAmount) {
        throw new AppError('ยอดเงินไม่เพียงพอ', 400);
      }
      const balanceAfter = toMoney(currentBalance - fineAmount);

      await connection.query('UPDATE users SET balance = ? WHERE user_id = ?', [balanceAfter, input.userId]);
      await connection.query(
        'UPDATE rentals SET status = ?, past_due_days = ?, fine_paid_at = NOW() WHERE rental_id = ?',
        ['เลยกำหนด', pastDueDays, input.rentalId],
      );

      await connection.commit();

      return {
        rentalId: input.rentalId,
        pastDueDays,
        fineAmount,
        balanceAfter,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async requestReturn(input: {
    userId: number;
    rentalId: number;
    deliveryProofPath: string;
    deliverySentAt: Date;
  }): Promise<{
    rentalId: number;
    status: 'รอคืน';
    returnRequestedAt: string;
    returnDeliverySentAt: string;
    returnDeliveryProofPath: string;
  }> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [rentalRows] = await connection.query<Array<{
        rental_id: number;
        renter_id: number;
        status: 'กำลังยืม' | 'รอคืน' | 'คืนแล้ว' | 'เลยกำหนด';
        due_date: Date;
      } & RowDataPacket>>(
        `
        SELECT rental_id, COALESCE(renter_id, borrower_id) AS renter_id, status, due_date
        FROM rentals
        WHERE rental_id = ?
        FOR UPDATE
        `,
        [input.rentalId],
      );

      if (rentalRows.length === 0) {
        throw new AppError('Rental not found', 404);
      }

      const rental = rentalRows[0];
      if (rental.renter_id !== input.userId) {
        throw new AppError('Unauthorized', 403);
      }
      if (rental.status === 'คืนแล้ว') {
        throw new AppError('รายการนี้ถูกคืนแล้ว', 400);
      }
      if (rental.status === 'รอคืน') {
        throw new AppError('คุณได้ส่งคำขอคืนหนังสือแล้ว', 409);
      }
      if (rental.status === 'เลยกำหนด' || rental.due_date.getTime() < Date.now()) {
        throw new AppError('รายการนี้เลยกำหนดแล้ว ยังไม่เปิดรับการคืนผ่านระบบตอนนี้', 400);
      }

      const now = new Date();
      await connection.query(
        `
        UPDATE rentals
        SET
          status = 'รอคืน',
          return_requested_at = ?,
          return_delivery_sent_at = ?,
          return_delivery_proof_path = ?
        WHERE rental_id = ?
        `,
        [now, input.deliverySentAt, input.deliveryProofPath, input.rentalId],
      );

      await connection.commit();

      return {
        rentalId: input.rentalId,
        status: 'รอคืน',
        returnRequestedAt: now.toISOString(),
        returnDeliverySentAt: input.deliverySentAt.toISOString(),
        returnDeliveryProofPath: input.deliveryProofPath,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async confirmReturnByShop(input: {
    userId: number;
    rentalId: number;
  }): Promise<{
    rentalId: number;
    bookId: number;
    status: 'คืนแล้ว';
    refundedAmount: number;
    renterId: number;
    balanceAfter: number;
  }> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      const [rentalRows] = await connection.query<Array<{
        rental_id: number;
        book_id: number;
        book_title: string;
        shop_id: number | null;
        owner_id: number;
        renter_id: number;
        deposit_price: string;
        status: 'กำลังยืม' | 'รอคืน' | 'คืนแล้ว' | 'เลยกำหนด';
      } & RowDataPacket>>(
        `
        SELECT r.rental_id, r.book_id, b.title AS book_title, r.shop_id, r.owner_id, COALESCE(r.renter_id, r.borrower_id) AS renter_id, r.deposit_price, r.status
        FROM rentals r
        JOIN books b ON b.book_id = r.book_id
        WHERE r.rental_id = ?
        FOR UPDATE
        `,
        [input.rentalId],
      );

      if (rentalRows.length === 0) {
        throw new AppError('Rental not found', 404);
      }

      const rental = rentalRows[0];
      if (rental.status !== 'รอคืน') {
        throw new AppError('รายการนี้ยังไม่อยู่ในสถานะรอคืน', 400);
      }

      if (rental.shop_id) {
        const shop = await this.shopRepository.findById(rental.shop_id);
        if (!shop || shop.userId !== input.userId) {
          throw new AppError('Unauthorized', 403);
        }
      } else if (rental.owner_id !== input.userId) {
        throw new AppError('Unauthorized', 403);
      }

      const [renterRows] = await connection.query<UserBalanceRow[]>(
        'SELECT user_id, balance FROM users WHERE user_id = ? AND deleted_at IS NULL FOR UPDATE',
        [rental.renter_id],
      );
      if (renterRows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const refundedAmount = toMoney(Number(rental.deposit_price));
      const balanceAfter = toMoney(Number(renterRows[0].balance) + refundedAmount);

      await connection.query('UPDATE rentals SET status = ? WHERE rental_id = ?', ['คืนแล้ว', input.rentalId]);
      await connection.query('UPDATE books SET status = ? WHERE book_id = ?', ['Available', rental.book_id]);
      await connection.query('UPDATE users SET balance = ? WHERE user_id = ?', [balanceAfter, rental.renter_id]);
      await connection.query(
        `
        INSERT INTO wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        VALUES (?, 'REFUND', ?, ?, ?)
        `,
        [rental.renter_id, refundedAmount, `คืนเงินมัดจำ: ${rental.book_title}`, input.rentalId],
      );

      await connection.commit();

      return {
        rentalId: input.rentalId,
        bookId: rental.book_id,
        status: 'คืนแล้ว',
        refundedAmount,
        renterId: rental.renter_id,
        balanceAfter,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
