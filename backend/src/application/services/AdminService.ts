import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { dbPool } from '../../infrastructure/database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';

type UserRole = 'Customer' | 'Admin' | 'Banned';
type UserStatusAction = 'BAN' | 'UNBAN' | 'SUSPEND' | 'UNSUSPEND';
type ReportStatusAction = 'RESOLVE' | 'DISMISS' | 'REOPEN';

interface AdminUserRow extends RowDataPacket {
  user_id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  balance: string;
  suspended_until: Date | null;
  deleted_at: Date | null;
}

interface AdminBookRow extends RowDataPacket {
  book_id: number;
  title: string;
  author: string;
  status: 'Available' | 'Rented';
  owner_id: number;
  owner_name: string;
  shop_id: number | null;
  shop_name: string | null;
  created_at: Date;
}

interface DashboardSummaryRow extends RowDataPacket {
  total_users: number;
  banned_users: number;
  suspended_users: number;
  active_users: number;
}

interface CommissionSummaryRow extends RowDataPacket {
  total_commission_revenue: string | null;
}

interface BookCountRow extends RowDataPacket {
  total_books: number;
}

interface RentalStatsRow extends RowDataPacket {
  active_rentals: number;
  completed_rentals: number;
  overdue_rentals: number;
}

interface ShopRow extends RowDataPacket {
  shop_id: number;
  user_id: number;
  shop_name: string;
  owner_name: string;
  book_count: number;
  created_at: Date;
}

interface ReportRow extends RowDataPacket {
  report_id: number;
  report_type: 'Book' | 'Shop';
  reason: string;
  details: string | null;
  status: 'Open' | 'Resolved' | 'Dismissed';
  admin_note: string | null;
  created_at: Date;
  handled_at: Date | null;
  reporter_id: number;
  reporter_username: string;
  book_id: number | null;
  book_title: string | null;
  shop_id: number | null;
  shop_name: string | null;
  handled_by_id: number | null;
  handled_by_username: string | null;
}

interface WalletStatsRow extends RowDataPacket {
  total_user_balance: string;
  average_user_balance: string;
}

export interface AdminUserItem {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  balance: number;
  suspendedUntil: string | null;
  deletedAt: string | null;
}

export interface AdminBookItem {
  bookId: number;
  title: string;
  author: string;
  status: 'Available' | 'Rented';
  ownerId: number;
  ownerName: string;
  shopId: number | null;
  shopName: string | null;
  createdAt: string;
}

export interface AdminShopItem {
  shopId: number;
  userId: number;
  shopName: string;
  ownerName: string;
  bookCount: number;
  createdAt: string;
}

export interface AdminReportItem {
  reportId: number;
  reportType: 'Book' | 'Shop';
  reason: string;
  details: string | null;
  status: 'Open' | 'Resolved' | 'Dismissed';
  adminNote: string | null;
  createdAt: string;
  handledAt: string | null;
  reporter: {
    userId: number;
    username: string;
  };
  target: {
    bookId: number | null;
    bookTitle: string | null;
    shopId: number | null;
    shopName: string | null;
  };
  handledBy: {
    userId: number;
    username: string;
  } | null;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  totalBooks: number;
  activeRentals: number;
  completedRentals: number;
  overdueRentals: number;
  totalCommissionRevenue: number;
  totalUserBalance: number;
  averageUserBalance: number;
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary;
  users: AdminUserItem[];
  books: AdminBookItem[];
  shops: AdminShopItem[];
  reports: AdminReportItem[];
}

const mapAdminUser = (row: AdminUserRow): AdminUserItem => ({
  userId: row.user_id,
  firstname: row.firstname,
  lastname: row.lastname,
  username: row.username,
  email: row.email,
  phoneNumber: row.phone_number,
  role: row.role,
  balance: Number(row.balance),
  suspendedUntil: row.suspended_until ? row.suspended_until.toISOString() : null,
  deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
});

const mapAdminBook = (row: AdminBookRow): AdminBookItem => ({
  bookId: row.book_id,
  title: row.title,
  author: row.author,
  status: row.status,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  shopId: row.shop_id,
  shopName: row.shop_name,
  createdAt: row.created_at.toISOString(),
});

const mapAdminShop = (row: ShopRow): AdminShopItem => ({
  shopId: row.shop_id,
  userId: row.user_id,
  shopName: row.shop_name,
  ownerName: row.owner_name,
  bookCount: row.book_count,
  createdAt: row.created_at.toISOString(),
});

const mapAdminReport = (row: ReportRow): AdminReportItem => ({
  reportId: row.report_id,
  reportType: row.report_type,
  reason: row.reason,
  details: row.details,
  status: row.status,
  adminNote: row.admin_note,
  createdAt: row.created_at.toISOString(),
  handledAt: row.handled_at ? row.handled_at.toISOString() : null,
  reporter: {
    userId: row.reporter_id,
    username: row.reporter_username,
  },
  target: {
    bookId: row.book_id,
    bookTitle: row.book_title,
    shopId: row.shop_id,
    shopName: row.shop_name,
  },
  handledBy: row.handled_by_id
    ? {
      userId: row.handled_by_id,
      username: row.handled_by_username ?? 'admin',
    }
    : null,
});

export class AdminService {
  private async assertAdmin(userId: number): Promise<void> {
    const [rows] = await dbPool.query<Array<{ role: UserRole; deleted_at: Date | null } & RowDataPacket>>(
      'SELECT role, deleted_at FROM users WHERE user_id = ? LIMIT 1',
      [userId],
    );
    if (rows.length === 0 || rows[0].deleted_at !== null) {
      throw new AppError('Unauthorized', 401);
    }
    if (rows[0].role !== 'Admin') {
      throw new AppError('Forbidden', 403);
    }
  }

  async getDashboardData(adminUserId: number): Promise<AdminDashboardData> {
    await this.assertAdmin(adminUserId);

    const [summaryRows] = await dbPool.query<DashboardSummaryRow[]>(
      `
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN role = 'Banned' THEN 1 ELSE 0 END) AS banned_users,
        SUM(CASE WHEN role != 'Banned' AND suspended_until IS NOT NULL AND suspended_until > NOW() THEN 1 ELSE 0 END) AS suspended_users,
        SUM(CASE WHEN role != 'Banned' AND (suspended_until IS NULL OR suspended_until <= NOW()) THEN 1 ELSE 0 END) AS active_users
      FROM users
      WHERE deleted_at IS NULL
      `,
    );

    const [commissionRows] = await dbPool.query<CommissionSummaryRow[]>(
      `
      SELECT COALESCE(SUM(ROUND(r.rental_price * r.commission_rate, 2)), 0) AS total_commission_revenue
      FROM rentals r
      WHERE r.status = 'คืนแล้ว'
      `,
    );

    const [bookCountRows] = await dbPool.query<BookCountRow[]>(
      `
      SELECT COUNT(*) AS total_books
      FROM books
      WHERE deleted_at IS NULL
      `,
    );

    const [rentalStatsRows] = await dbPool.query<RentalStatsRow[]>(
      `
      SELECT
        SUM(CASE WHEN status = 'กำลังยืม' THEN 1 ELSE 0 END) AS active_rentals,
        SUM(CASE WHEN status = 'คืนแล้ว' THEN 1 ELSE 0 END) AS completed_rentals,
        SUM(
          CASE
            WHEN status != 'คืนแล้ว' AND due_date IS NOT NULL AND due_date < NOW() THEN 1
            ELSE 0
          END
        ) AS overdue_rentals
      FROM rentals
      `,
    );

    const [walletStatsRows] = await dbPool.query<WalletStatsRow[]>(
      `
      SELECT
        COALESCE(SUM(balance), 0) AS total_user_balance,
        COALESCE(AVG(balance), 0) AS average_user_balance
      FROM users
      WHERE deleted_at IS NULL AND role != 'Banned'
      `,
    );

    const [users] = await dbPool.query<AdminUserRow[]>(
      `
      SELECT user_id, firstname, lastname, username, email, phone_number, role, balance, suspended_until, deleted_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY user_id DESC
      `,
    );

    const [books] = await dbPool.query<AdminBookRow[]>(
      `
      SELECT
        b.book_id,
        b.title,
        b.author,
        b.status,
        b.owner_id,
        u.username AS owner_name,
        b.shop_id,
        s.shop_name,
        b.created_at
      FROM books b
      JOIN users u ON u.user_id = b.owner_id
      LEFT JOIN shops s ON s.shop_id = b.shop_id
      WHERE b.deleted_at IS NULL
      ORDER BY b.created_at DESC
      LIMIT 200
      `,
    );

    const [shops] = await dbPool.query<ShopRow[]>(
      `
      SELECT
        s.shop_id,
        s.user_id,
        s.shop_name,
        u.username AS owner_name,
        COUNT(b.book_id) AS book_count,
        s.created_at
      FROM shops s
      JOIN users u ON u.user_id = s.user_id
      LEFT JOIN books b ON b.shop_id = s.shop_id AND b.deleted_at IS NULL
      WHERE s.deleted_at IS NULL
      GROUP BY s.shop_id, s.user_id, s.shop_name, u.username, s.created_at
      ORDER BY s.created_at DESC
      LIMIT 100
      `,
    );

    const [reports] = await dbPool.query<ReportRow[]>(
      `
      SELECT
        r.report_id,
        r.report_type,
        r.reason,
        r.details,
        r.status,
        r.admin_note,
        r.created_at,
        r.handled_at,
        reporter.user_id AS reporter_id,
        reporter.username AS reporter_username,
        b.book_id,
        b.title AS book_title,
        s.shop_id,
        s.shop_name,
        handler.user_id AS handled_by_id,
        handler.username AS handled_by_username
      FROM reports r
      JOIN users reporter ON reporter.user_id = r.reporter_user_id
      LEFT JOIN books b ON b.book_id = r.book_id
      LEFT JOIN shops s ON s.shop_id = r.shop_id
      LEFT JOIN users handler ON handler.user_id = r.handled_by
      ORDER BY r.created_at DESC
      LIMIT 200
      `,
    );

    const summaryRow = summaryRows[0];
    const commissionRow = commissionRows[0];
    const bookCountRow = bookCountRows[0];
    const rentalStatsRow = rentalStatsRows[0];
    const walletStatsRow = walletStatsRows[0];

    return {
      summary: {
        totalUsers: Number(summaryRow.total_users),
        activeUsers: Number(summaryRow.active_users),
        suspendedUsers: Number(summaryRow.suspended_users),
        bannedUsers: Number(summaryRow.banned_users),
        totalBooks: Number(bookCountRow.total_books),
        activeRentals: Number(rentalStatsRow.active_rentals) || 0,
        completedRentals: Number(rentalStatsRow.completed_rentals) || 0,
        overdueRentals: Number(rentalStatsRow.overdue_rentals) || 0,
        totalCommissionRevenue: Number(commissionRow.total_commission_revenue ?? 0),
        totalUserBalance: Number(walletStatsRow.total_user_balance),
        averageUserBalance: Number(walletStatsRow.average_user_balance),
      },
      users: users.map(mapAdminUser),
      books: books.map(mapAdminBook),
      shops: shops.map(mapAdminShop),
      reports: reports.map(mapAdminReport),
    };
  }

  async updateUserStatus(
    adminUserId: number,
    input: { targetUserId: number; action: UserStatusAction; suspendUntil?: Date },
  ): Promise<AdminUserItem> {
    await this.assertAdmin(adminUserId);
    if (input.targetUserId === adminUserId) {
      throw new AppError('You cannot change your own status', 400);
    }

    const [targetRows] = await dbPool.query<AdminUserRow[]>(
      `
      SELECT user_id, firstname, lastname, username, email, phone_number, role, balance, suspended_until, deleted_at
      FROM users
      WHERE user_id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [input.targetUserId],
    );
    if (targetRows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const target = targetRows[0];
    if (target.role === 'Admin') {
      throw new AppError('Cannot change status of another admin', 400);
    }

    if (input.action === 'BAN') {
      await dbPool.query(
        `
        UPDATE users
        SET role = 'Banned', suspended_until = NULL
        WHERE user_id = ? AND deleted_at IS NULL
        `,
        [input.targetUserId],
      );
    } else if (input.action === 'UNBAN') {
      await dbPool.query(
        `
        UPDATE users
        SET role = 'Customer'
        WHERE user_id = ? AND deleted_at IS NULL
        `,
        [input.targetUserId],
      );
    } else if (input.action === 'SUSPEND') {
      if (!input.suspendUntil || input.suspendUntil.getTime() <= Date.now()) {
        throw new AppError('suspendUntil must be a future date-time', 400);
      }
      await dbPool.query(
        `
        UPDATE users
        SET suspended_until = ?
        WHERE user_id = ? AND deleted_at IS NULL AND role != 'Banned'
        `,
        [input.suspendUntil, input.targetUserId],
      );
    } else if (input.action === 'UNSUSPEND') {
      await dbPool.query(
        `
        UPDATE users
        SET suspended_until = NULL
        WHERE user_id = ? AND deleted_at IS NULL
        `,
        [input.targetUserId],
      );
    }

    const [updatedRows] = await dbPool.query<AdminUserRow[]>(
      `
      SELECT user_id, firstname, lastname, username, email, phone_number, role, balance, suspended_until, deleted_at
      FROM users
      WHERE user_id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [input.targetUserId],
    );
    if (updatedRows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return mapAdminUser(updatedRows[0]);
  }

  async softDeleteBook(adminUserId: number, bookId: number): Promise<void> {
    await this.assertAdmin(adminUserId);

    const [result] = await dbPool.query<ResultSetHeader>(
      `
      UPDATE books
      SET deleted_at = NOW()
      WHERE book_id = ? AND deleted_at IS NULL
      `,
      [bookId],
    );
    if (result.affectedRows === 0) {
      throw new AppError('Book not found or already deleted', 404);
    }
  }

  async updateReportStatus(
    adminUserId: number,
    reportId: number,
    input: { action: ReportStatusAction; adminNote?: string | null },
  ): Promise<AdminReportItem> {
    await this.assertAdmin(adminUserId);

    const [rows] = await dbPool.query<Array<{ report_id: number } & RowDataPacket>>(
      'SELECT report_id FROM reports WHERE report_id = ? LIMIT 1',
      [reportId],
    );
    if (rows.length === 0) {
      throw new AppError('Report not found', 404);
    }

    const nextAdminNote = input.adminNote !== undefined
      ? (input.adminNote && input.adminNote.trim().length > 0 ? input.adminNote.trim().slice(0, 1000) : null)
      : undefined;

    if (input.action === 'RESOLVE' || input.action === 'DISMISS') {
      const nextStatus = input.action === 'RESOLVE' ? 'Resolved' : 'Dismissed';
      await dbPool.query(
        `
        UPDATE reports
        SET status = ?, handled_by = ?, handled_at = NOW(), admin_note = COALESCE(?, admin_note)
        WHERE report_id = ?
        `,
        [nextStatus, adminUserId, nextAdminNote ?? null, reportId],
      );
    } else if (input.action === 'REOPEN') {
      await dbPool.query(
        `
        UPDATE reports
        SET status = 'Open', handled_by = NULL, handled_at = NULL, admin_note = COALESCE(?, admin_note)
        WHERE report_id = ?
        `,
        [nextAdminNote ?? null, reportId],
      );
    }

    const [reportRows] = await dbPool.query<ReportRow[]>(
      `
      SELECT
        r.report_id,
        r.report_type,
        r.reason,
        r.details,
        r.status,
        r.admin_note,
        r.created_at,
        r.handled_at,
        reporter.user_id AS reporter_id,
        reporter.username AS reporter_username,
        b.book_id,
        b.title AS book_title,
        s.shop_id,
        s.shop_name,
        handler.user_id AS handled_by_id,
        handler.username AS handled_by_username
      FROM reports r
      JOIN users reporter ON reporter.user_id = r.reporter_user_id
      LEFT JOIN books b ON b.book_id = r.book_id
      LEFT JOIN shops s ON s.shop_id = r.shop_id
      LEFT JOIN users handler ON handler.user_id = r.handled_by
      WHERE r.report_id = ?
      LIMIT 1
      `,
      [reportId],
    );
    if (reportRows.length === 0) {
      throw new AppError('Report not found', 404);
    }

    return mapAdminReport(reportRows[0]);
  }
}
