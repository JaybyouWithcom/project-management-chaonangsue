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
const phoneRegex = /^\d{9,10}$/;
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

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(`${otp}:${env.auth.otpSecret}`).digest('hex');

const generateOtp = (): string => String(Math.floor(100000 + Math.random() * 900000));

const readSmtpCode = (response: string): number => Number(response.slice(0, 3));

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<RegisterResponse> {
    const email = input.email.trim().toLowerCase();
    const phoneNumber = input.phoneNumber?.trim() ? input.phoneNumber.trim() : undefined;

    if (!emailRegex.test(email)) {
      throw new AppError('กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น user@example.com', 400);
    }
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      throw new AppError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลักเท่านั้น', 400);
    }

    await this.assertUniqueness({ ...input, email, phoneNumber });

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
        phoneNumber ?? null,
        passwordHash,
        expiresAt,
      ],
    );

    return {
      pendingSignupId: result.insertId,
      email,
      phoneNumber: phoneNumber ?? null,
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
      otp = '000000';
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
        throw new AppError('อีเมล หรือ Username นี้ถูกใช้งานแล้ว', 409);
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
      throw new AppError('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน', 403);
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

  async updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    if (!input.firstname.trim() || !input.lastname.trim() || !email) {
      throw new AppError('ข้อมูลไม่ครบถ้วน', 400);
    }
    if (!emailRegex.test(email)) {
      throw new AppError('อีเมลไม่ถูกต้อง', 400);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser && existingUser.userId !== input.userId) {
      throw new AppError('อีเมลนี้ถูกใช้งานแล้วในบัญชีอื่น', 409);
    }

    const phoneNumber = input.phoneNumber?.trim() ? input.phoneNumber.trim() : null;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      throw new AppError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลักเท่านั้น', 400);
    }

    const updated = await this.userRepository.updateProfileById(input.userId, {
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      email,
      phoneNumber,
    });

    return toPublicUser(updated);
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
    const updatedUser = await this.userRepository.incrementBalanceById(input.userId, normalizedAmount);
    return { user: toPublicUser(updatedUser), amount: normalizedAmount, method };
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
      throw new AppError('Username นี้ถูกใช้งานแล้ว', 409);
    }
  }
}
