import type { RowDataPacket } from 'mysql2';

import type { CreateUserInput, User } from '../../domain/entities/User.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { dbPool } from '../database/mysql.js';

interface UserRow extends RowDataPacket {
  user_id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone_number: string | null;
  password: string;
  role: User['role'];
  balance: string;
  deleted_at: Date | null;
}

const mapUser = (row: UserRow): User => ({
  userId: row.user_id,
  firstname: row.firstname,
  lastname: row.lastname,
  username: row.username,
  email: row.email,
  phoneNumber: row.phone_number,
  password: row.password,
  role: row.role,
  balance: row.balance,
  deletedAt: row.deleted_at,
});

export class MySqlUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await dbPool.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [email],
    );
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [rows] = await dbPool.query<UserRow[]>(
      'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL LIMIT 1',
      [username],
    );
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async findById(userId: number): Promise<User | null> {
    const [rows] = await dbPool.query<UserRow[]>(
      'SELECT * FROM users WHERE user_id = ? AND deleted_at IS NULL LIMIT 1',
      [userId],
    );
    return rows.length > 0 ? mapUser(rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const role = input.role ?? 'Customer';

    const [result] = await dbPool.query(
      `
      INSERT INTO users (firstname, lastname, username, email, phone_number, password, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.firstname,
        input.lastname,
        input.username,
        input.email,
        input.phoneNumber ?? null,
        input.passwordHash,
        role,
      ],
    );

    const insertId = Number((result as { insertId: number }).insertId);
    const user = await this.findById(insertId);

    if (!user) {
      throw new Error('Failed to load created user');
    }

    return user;
  }

  async softDeleteById(userId: number): Promise<void> {
    await dbPool.query('UPDATE users SET deleted_at = NOW() WHERE user_id = ? AND deleted_at IS NULL', [userId]);
  }

  async restoreById(userId: number): Promise<void> {
    await dbPool.query('UPDATE users SET deleted_at = NULL WHERE user_id = ? AND deleted_at IS NOT NULL', [userId]);
  }

  async hardDeleteById(userId: number): Promise<void> {
    await dbPool.query('DELETE FROM users WHERE user_id = ?', [userId]);
  }
}
