import crypto from 'node:crypto';
import tls from 'node:tls';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import type { PublicUser, User, UserRole } from '../../domain/entities/User.js';
import { toPublicUser } from '../../domain/entities/User.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { env } from '../../infrastructure/config/env.js';
import { dbPool } from '../../infrastructure/database/mysql.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthJwtPayload } from '../../shared/types/auth.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const thaiPhoneRegex = /^0\d{9}$/;
type VerificationMethod = 'email' | 'phone';

interface RegisterInput {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
}

interface LoginInput {
  login: string;
  password: string;
}

interface UpdateProfileInput {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber?: string;
}

interface TopUpWalletInput {
  userId: number;
  amount: number;
  method: string;
}

interface RequestOtpInput {
  pendingSignupId: number;
  method: VerificationMethod;
}

interface VerifyOtpInput {
  pendingSignupId: number;
  method: VerificationMethod;
  otp: string;
}

interface ForgotPasswordInput {
  email: string;
}

interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

interface ChangePasswordInput {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

interface PendingSignupRow extends RowDataPacket {
  pending_signup_id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone_number: string | null;
  password_hash: string;
  consumed_at: Date | null;
  expires_at: Date;
}

interface PendingOtpRow extends RowDataPacket {
  pending_signup_otp_id: number;
  otp_hash: string;
  expires_at: Date;
}

interface PasswordResetOtpRow extends RowDataPacket {
  password_reset_otp_id: number;
  otp_hash: string;
  expires_at: Date;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface RegisterResponse {
  pendingSignupId: number;
  email: string;
  phoneNumber: string | null;
  requiresVerification: true;
}

export interface TopUpWalletResponse {
  user: PublicUser;
  amount: number;
  method: string;
}

interface WalletTransactionRow extends RowDataPacket {
  transaction_id: number;
  transaction_type: 'TOPUP' | 'RENTAL' | 'REFUND' | 'FINE' | 'PAYOUT';
  amount: string;
  description: string;
  created_at: Date;
}

export interface WalletTransactionItem {
  transactionId: number;
  type: 'TOPUP' | 'RENTAL' | 'REFUND' | 'FINE' | 'PAYOUT';
  amount: number;
  description: string;
  createdAt: string;
}

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(`${otp}:${env.auth.otpSecret}`).digest('hex');

const generateOtp = (): string => String(Math.floor(100000 + Math.random() * 900000));

const getMockPhoneOtp = (): string => env.auth.otpSecret;

const readSmtpCode = (response: string): number => Number(response.slice(0, 3));

const normalizePhoneNumber = (phoneNumber?: string | null): string | null => {
  if (!phoneNumber?.trim()) {
    return null;
  }
  const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
  return digitsOnly || null;
};

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<RegisterResponse> {
    const email = input.email.trim().toLowerCase();
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);

    if (!emailRegex.test(email)) {
      throw new AppError('กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น user@example.com', 400);
    }
    if (phoneNumber && !thaiPhoneRegex.test(phoneNumber)) {
      throw new AppError('เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0123456789)', 400);
    }

    await this.assertUniqueness({ ...input, email, phoneNumber: phoneNumber ?? undefined });

    const passwordHash = await bcrypt.hash(input.password, env.auth.bcryptSaltRounds);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await dbPool.query<ResultSetHeader>(
      `
      INSERT INTO pending_signups (
        firstname,
        lastname,
        username,
        email,
        phone_number,
        password_hash,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.firstname.trim(),
        input.lastname.trim(),
        input.username.trim(),
        email,
        phoneNumber,
        passwordHash,
        expiresAt,
      ],
    );

    return {
      pendingSignupId: result.insertId,
      email,
      phoneNumber,
      requiresVerification: true,
    };
  }

  async requestOtp(input: RequestOtpInput): Promise<{ method: VerificationMethod; expiresInSeconds: number }> {
    const pending = await this.getPendingSignup(input.pendingSignupId);
    if (!pending || pending.consumed_at || pending.expires_at.getTime() < Date.now()) {
      throw new AppError('คำขอสมัครหมดอายุหรือถูกใช้งานแล้ว กรุณาสมัครใหม่', 400);
    }

    let otp: string;
    let target: string;
    if (input.method === 'email') {
      otp = generateOtp();
      target = pending.email;
      await this.sendEmailOtp(pending.email, otp);
    } else {
      if (!pending.phone_number) {
        throw new AppError('บัญชีนี้ยังไม่มีเบอร์โทรศัพท์', 400);
      }
      otp = getMockPhoneOtp();
      target = pending.phone_number;
    }

    const expiresInSeconds = 300;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await dbPool.query(
      `
      UPDATE pending_signup_otps
      SET used_at = NOW()
      WHERE pending_signup_id = ? AND method = ? AND used_at IS NULL
      `,
      [input.pendingSignupId, input.method],
    );

    await dbPool.query(
      `
      INSERT INTO pending_signup_otps (pending_signup_id, method, target, otp_hash, expires_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [input.pendingSignupId, input.method, target, hashOtp(otp), expiresAt],
    );

    return { method: input.method, expiresInSeconds };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
    const pending = await this.getPendingSignup(input.pendingSignupId);
    if (!pending || pending.consumed_at || pending.expires_at.getTime() < Date.now()) {
      throw new AppError('คำขอสมัครหมดอายุหรือถูกใช้งานแล้ว กรุณาสมัครใหม่', 400);
    }

    const [rows] = await dbPool.query<PendingOtpRow[]>(
      `
      SELECT pending_signup_otp_id, otp_hash, expires_at
      FROM pending_signup_otps
      WHERE pending_signup_id = ? AND method = ? AND used_at IS NULL
      ORDER BY pending_signup_otp_id DESC
      LIMIT 1
      `,
      [input.pendingSignupId, input.method],
    );
    if (rows.length === 0) {
      throw new AppError('ไม่พบ OTP ที่ใช้งานได้', 400);
    }

    const row = rows[0];
    if (row.expires_at.getTime() < Date.now()) {
      throw new AppError('OTP หมดอายุแล้ว', 400);
    }
    if (hashOtp(input.otp) !== row.otp_hash) {
      throw new AppError('OTP ไม่ถูกต้อง', 400);
    }

    await this.assertUniqueness({
      firstname: pending.firstname,
      lastname: pending.lastname,
      username: pending.username,
      email: pending.email,
      phoneNumber: pending.phone_number ?? undefined,
      password: '',
    });

    let user: User;
    try {
      user = await this.userRepository.create({
        firstname: pending.firstname,
        lastname: pending.lastname,
        username: pending.username,
        email: pending.email,
        phoneNumber: pending.phone_number,
        passwordHash: pending.password_hash,
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw new AppError('อีเมล, ชื่อผู้ใช้ หรือเบอร์โทรนี้ถูกใช้งานแล้ว', 409);
      }
      throw error;
    }

    await dbPool.query('UPDATE pending_signup_otps SET used_at = NOW() WHERE pending_signup_otp_id = ?', [row.pending_signup_otp_id]);
    await dbPool.query('UPDATE pending_signups SET consumed_at = NOW() WHERE pending_signup_id = ?', [input.pendingSignupId]);

    return {
      user: toPublicUser(user),
      token: this.signToken(user.userId, user.role),
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const userByEmail = await this.userRepository.findByEmail(input.login);
    const user = userByEmail ?? (await this.userRepository.findByUsername(input.login));

    if (!user) {
      throw new AppError('ชื่อผู้ใช้/รหัสผ่านไม่ถูกต้อง', 401);
    }
    const passwordMatched = await bcrypt.compare(input.password, user.password);
    if (!passwordMatched) {
      throw new AppError('ชื่อผู้ใช้/รหัสผ่านไม่ถูกต้อง', 401);
    }
    if (user.role === 'Banned') {
      throw new AppError('บัญชีนี้ถูกแบนถาวร', 403);
    }
    if (user.suspendedUntil && user.suspendedUntil.getTime() > Date.now()) {
      throw new AppError('บัญชีนี้ถูกระงับชั่วคราว', 403);
    }

    return {
      user: toPublicUser(user),
      token: this.signToken(user.userId, user.role),
    };
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('ไม่พบบัญชีผู้ใช้', 404);
    }
    return toPublicUser(user);
  }

  async requestPasswordReset(input: ForgotPasswordInput): Promise<{ expiresInSeconds: number }> {
    const email = input.email.trim().toLowerCase();
    if (!emailRegex.test(email)) {
      throw new AppError('กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น user@example.com', 400);
    }

    const expiresInSeconds = 300;
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Return the same response even when not found to avoid account enumeration.
      return { expiresInSeconds };
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await this.sendEmailOtp(email, otp);

    await dbPool.query(
      `
      UPDATE password_reset_otps
      SET used_at = NOW()
      WHERE user_id = ? AND used_at IS NULL
      `,
      [user.userId],
    );

    await dbPool.query(
      `
      INSERT INTO password_reset_otps (user_id, target, otp_hash, expires_at)
      VALUES (?, ?, ?, ?)
      `,
      [user.userId, email, hashOtp(otp), expiresAt],
    );

    return { expiresInSeconds };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const otp = input.otp.trim();
    const newPassword = input.newPassword;

    if (!emailRegex.test(email)) {
      throw new AppError('กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น user@example.com', 400);
    }
    if (!otp) {
      throw new AppError('กรุณากรอก OTP', 400);
    }
    if (newPassword.length < 8) {
      throw new AppError('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร', 400);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('ข้อมูลสำหรับรีเซ็ตรหัสผ่านไม่ถูกต้อง', 400);
    }

    const [rows] = await dbPool.query<PasswordResetOtpRow[]>(
      `
      SELECT password_reset_otp_id, otp_hash, expires_at
      FROM password_reset_otps
      WHERE user_id = ? AND used_at IS NULL
      ORDER BY password_reset_otp_id DESC
      LIMIT 1
      `,
      [user.userId],
    );

    if (rows.length === 0) {
      throw new AppError('ไม่พบ OTP ที่ใช้งานได้', 400);
    }

    const row = rows[0];
    if (row.expires_at.getTime() < Date.now()) {
      throw new AppError('OTP หมดอายุแล้ว', 400);
    }
    if (hashOtp(otp) !== row.otp_hash) {
      throw new AppError('OTP ไม่ถูกต้อง', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, env.auth.bcryptSaltRounds);
    await this.userRepository.updatePasswordById(user.userId, passwordHash);
    await dbPool.query('UPDATE password_reset_otps SET used_at = NOW() WHERE password_reset_otp_id = ?', [
      row.password_reset_otp_id,
    ]);
  }

  async updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();
    if (!input.firstname.trim() || !input.lastname.trim() || !input.username.trim() || !email) {
      throw new AppError('ข้อมูลไม่ครบถ้วน', 400);
    }
    if (!emailRegex.test(email)) {
      throw new AppError('อีเมลไม่ถูกต้อง', 400);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser && existingUser.userId !== input.userId) {
      throw new AppError('อีเมลนี้ถูกใช้งานแล้วในบัญชีอื่น', 409);
    }

    const existingByUsername = await this.userRepository.findByUsername(username);
    if (existingByUsername && existingByUsername.userId !== input.userId) {
      throw new AppError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', 409);
    }

    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    if (phoneNumber && !thaiPhoneRegex.test(phoneNumber)) {
      throw new AppError('เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0123456789)', 400);
    }

    if (phoneNumber) {
      const existingByPhone = await this.userRepository.findByPhoneNumber(phoneNumber);
      if (existingByPhone && existingByPhone.userId !== input.userId) {
        throw new AppError('เบอร์โทรนี้ถูกใช้งานแล้วในบัญชีอื่น', 409);
      }
    }

    let updated: User;
    try {
      updated = await this.userRepository.updateProfileById(input.userId, {
        firstname: input.firstname.trim(),
        lastname: input.lastname.trim(),
        username,
        email,
        phoneNumber: phoneNumber ?? null,
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw new AppError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', 409);
      }
      throw error;
    }

    return toPublicUser(updated);
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    const currentPassword = input.currentPassword.trim();
    const newPassword = input.newPassword;

    if (!currentPassword) {
      throw new AppError('กรุณากรอกรหัสผ่านปัจจุบัน', 400);
    }
    if (newPassword.length < 8) {
      throw new AppError('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร', 400);
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError('ไม่พบบัญชีผู้ใช้', 404);
    }

    const passwordMatched = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatched) {
      throw new AppError('รหัสผ่านปัจจุบันไม่ถูกต้อง', 400);
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, env.auth.bcryptSaltRounds);
    await this.userRepository.updatePasswordById(user.userId, passwordHash);
  }

  async topUpWallet(input: TopUpWalletInput): Promise<TopUpWalletResponse> {
    const amount = Number(input.amount);
    const method = input.method.trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('จำนวนเงินที่เติมไม่ถูกต้อง', 400);
    }
    if (!method) {
      throw new AppError('กรุณาเลือกช่องทางการเติมเงิน', 400);
    }

    const normalizedAmount = Math.round(amount * 100) / 100;
    const maxBalance = 999999;
    const currentUser = await this.userRepository.findById(input.userId);
    if (!currentUser) {
      throw new AppError('ไม่พบบัญชีผู้ใช้', 404);
    }
    const currentBalance = Number(currentUser.balance);
    if (currentBalance + normalizedAmount > maxBalance) {
      throw new AppError('ยอดเงินคงเหลือสูงสุดไม่เกิน 999999', 400);
    }

    let updatedUser = await this.userRepository.incrementBalanceById(input.userId, normalizedAmount);
    if (Number(updatedUser.balance) >= 0 && updatedUser.suspendedUntil && updatedUser.suspendedUntil.getTime() > Date.now()) {
      await dbPool.query('UPDATE users SET suspended_until = NULL WHERE user_id = ?', [input.userId]);
      updatedUser = { ...updatedUser, suspendedUntil: null };
    }
    await dbPool.query(
      `
      INSERT INTO wallet_transactions (user_id, transaction_type, amount, description)
      VALUES (?, 'TOPUP', ?, ?)
      `,
      [input.userId, normalizedAmount, `เติมเงินผ่าน ${method}`],
    );

    return { user: toPublicUser(updatedUser), amount: normalizedAmount, method };
  }

  async listWalletTransactions(userId: number, limit = 10): Promise<WalletTransactionItem[]> {
    const [rows] = await dbPool.query<WalletTransactionRow[]>(
      `
      SELECT transaction_id, transaction_type, amount, description, created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC, transaction_id DESC
      LIMIT ?
      `,
      [userId, limit],
    );

    return rows.map((row) => ({
      transactionId: row.transaction_id,
      type: row.transaction_type,
      amount: Number(row.amount),
      description: row.description,
      createdAt: row.created_at.toISOString(),
    }));
  }

  verifyToken(token: string): AuthJwtPayload {
    try {
      return jwt.verify(token, env.auth.jwtSecret) as AuthJwtPayload;
    } catch {
      throw new AppError('Token ไม่ถูกต้องหรือหมดอายุแล้ว', 401);
    }
  }

  private signToken(userId: number, role: UserRole): string {
    const signOptions: SignOptions = {
      subject: String(userId),
      expiresIn: env.auth.jwtExpiresIn as SignOptions['expiresIn'],
    };
    return jwt.sign({ role }, env.auth.jwtSecret, signOptions);
  }

  private async sendEmailOtp(to: string, otp: string): Promise<void> {
    if (!env.smtp.user || !env.smtp.appPassword) {
      throw new AppError('ระบบส่งอีเมล OTP ยังไม่ถูกตั้งค่า (SMTP_USER/SMTP_APP_PASSWORD)', 500);
    }

    const from = env.smtp.fromEmail || env.smtp.user;
    const socket = tls.connect({
      host: 'smtp.gmail.com',
      port: 465,
      servername: 'smtp.gmail.com',
    });

    const waitResponse = async (): Promise<string> => {
      return new Promise((resolve, reject) => {
        let buffer = '';
        const onData = (chunk: Buffer): void => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\r\n').filter(Boolean);
          if (lines.length === 0) {
            return;
          }
          const last = lines[lines.length - 1];
          if (/^\d{3} /.test(last)) {
            socket.off('error', onError);
            socket.off('data', onData);
            resolve(last);
          }
        };
        const onError = (error: Error): void => {
          socket.off('data', onData);
          reject(error);
        };
        socket.on('data', onData);
        socket.once('error', onError);
      });
    };

    const sendCmd = async (cmd: string, expectedCodes: number[]): Promise<void> => {
      socket.write(`${cmd}\r\n`);
      const line = await waitResponse();
      const code = readSmtpCode(line);
      if (!expectedCodes.includes(code)) {
        throw new AppError(`ส่งอีเมล OTP ไม่สำเร็จ (SMTP ${code})`, 502);
      }
    };

    try {
      const greeting = await waitResponse();
      if (readSmtpCode(greeting) !== 220) {
        throw new AppError('SMTP server ไม่พร้อมใช้งาน', 502);
      }

      await sendCmd('EHLO chaonangsue.local', [250]);
      await sendCmd('AUTH LOGIN', [334]);
      await sendCmd(Buffer.from(env.smtp.user).toString('base64'), [334]);
      await sendCmd(Buffer.from(env.smtp.appPassword).toString('base64'), [235]);
      await sendCmd(`MAIL FROM:<${from}>`, [250]);
      await sendCmd(`RCPT TO:<${to}>`, [250, 251]);
      await sendCmd('DATA', [354]);

      const body =
        `From: ${from}\r\n` +
        `To: ${to}\r\n` +
        'Subject: OTP Verification Code\r\n' +
        'Content-Type: text/html; charset=UTF-8\r\n' +
        '\r\n' +
        `<p>รหัส OTP ของคุณคือ <strong>${otp}</strong></p><p>รหัสนี้หมดอายุใน 5 นาที</p>\r\n.\r\n`;

      socket.write(body);
      const dataResp = await waitResponse();
      if (readSmtpCode(dataResp) !== 250) {
        throw new AppError('ส่ง OTP ทางอีเมลไม่สำเร็จ', 502);
      }

      await sendCmd('QUIT', [221]);
    } finally {
      socket.end();
    }
  }

  private async getPendingSignup(pendingSignupId: number): Promise<PendingSignupRow | null> {
    const [rows] = await dbPool.query<PendingSignupRow[]>(
      `
      SELECT pending_signup_id, firstname, lastname, username, email, phone_number, password_hash, consumed_at, expires_at
      FROM pending_signups
      WHERE pending_signup_id = ?
      LIMIT 1
      `,
      [pendingSignupId],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  private async assertUniqueness(input: RegisterInput): Promise<void> {
    const existingByEmail = await this.userRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw new AppError('อีเมลนี้ถูกใช้งานแล้ว', 409);
    }
    const existingByUsername = await this.userRepository.findByUsername(input.username);
    if (existingByUsername) {
      throw new AppError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', 409);
    }

    const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber);
    if (normalizedPhoneNumber) {
      if (!thaiPhoneRegex.test(normalizedPhoneNumber)) {
        throw new AppError('เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0123456789)', 400);
      }

      const existingByPhone = await this.userRepository.findByPhoneNumber(normalizedPhoneNumber);
      if (existingByPhone) {
        throw new AppError('เบอร์โทรนี้ถูกใช้งานแล้ว', 409);
      }
    }
  }
}
