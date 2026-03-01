import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import type { PublicUser, User, UserRole } from '../../domain/entities/User.js';
import { toPublicUser } from '../../domain/entities/User.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { env } from '../../infrastructure/config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthJwtPayload } from '../../shared/types/auth.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{9,10}$/;

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

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface TopUpWalletResponse {
  user: PublicUser;
  amount: number;
  method: string;
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
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
    let user: User;
    try {
      user = await this.userRepository.create({
        firstname: input.firstname,
        lastname: input.lastname,
        username: input.username,
        email,
        phoneNumber: phoneNumber ?? null,
        passwordHash,
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw new AppError('อีเมล หรือ Username นี้ถูกใช้งานแล้ว', 409);
      }
      throw error;
    }

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
    // 2. ตรวจสอบค่าว่างและรูปแบบอีเมล
    const email = input.email.trim().toLowerCase();
    if (!input.firstname.trim() || !input.lastname.trim() || !email) {
      throw new AppError('ข้อมูลไม่ครบถ้วน', 400);
    }

    if (!emailRegex.test(email)) {
      throw new AppError('อีเมลไม่ถูกต้อง', 400);
    }

    // 3. ตรวจสอบว่าอีเมลใหม่ซ้ำกับคนอื่นในระบบหรือไม่
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser && existingUser.userId !== input.userId) {
      throw new AppError('อีเมลนี้ถูกใช้งานแล้วในบัญชีอื่น', 409);
    }

    const phoneNumber = input.phoneNumber?.trim() ? input.phoneNumber.trim() : null;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      throw new AppError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลักเท่านั้น', 400);
    }

    // 4. ส่ง email ไปยัง repository เพื่ออัปเดตลงฐานข้อมูล
    const updated = await this.userRepository.updateProfileById(input.userId, {
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      email, // บันทึกอีเมลใหม่
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

    return {
      user: toPublicUser(updatedUser),
      amount: normalizedAmount,
      method,
    };
  }

  verifyToken(token: string): AuthJwtPayload {
    try {
      const payload = jwt.verify(token, env.auth.jwtSecret) as AuthJwtPayload;
      return payload;
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
