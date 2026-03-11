import type { Request, Response } from 'express';

import type { AuthService } from '../../application/services/AuthService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeOtp = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return String(value).padStart(6, '0');
  }
  return null;
};

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const { firstname, lastname, username, email, phoneNumber, password, role } = req.body as Record<string, unknown>;

    if (
      !isNonEmptyString(firstname) ||
      !isNonEmptyString(lastname) ||
      !isNonEmptyString(username) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(password)
    ) {
      throw new AppError('Missing required fields', 400);
    }

    if (role !== undefined) {
      throw new AppError('role is not allowed on register', 400);
    }

    const result = await this.authService.register({
      firstname,
      lastname,
      username,
      email,
      phoneNumber: isNonEmptyString(phoneNumber) ? phoneNumber : undefined,
      password,
    });

    sendSuccess(res, result, 201);
  };

  requestOtp = async (req: Request, res: Response): Promise<void> => {
    const { pendingSignupId, method } = req.body as Record<string, unknown>;
    const parsedPendingSignupId = Number(pendingSignupId);
    if (!Number.isInteger(parsedPendingSignupId)) {
      throw new AppError('Invalid pendingSignupId', 400);
    }
    if (method !== 'email' && method !== 'phone') {
      throw new AppError('method must be email or phone', 400);
    }

    const result = await this.authService.requestOtp({
      pendingSignupId: parsedPendingSignupId,
      method,
    });
    sendSuccess(res, result);
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const { pendingSignupId, method, otp } = req.body as Record<string, unknown>;
    const parsedPendingSignupId = Number(pendingSignupId);
    if (!Number.isInteger(parsedPendingSignupId)) {
      throw new AppError('Invalid pendingSignupId', 400);
    }
    if (method !== 'email' && method !== 'phone') {
      throw new AppError('method must be email or phone', 400);
    }
    const normalizedOtp = normalizeOtp(otp);
    if (!normalizedOtp) {
      throw new AppError('Missing OTP', 400);
    }

    const result = await this.authService.verifyOtp({
      pendingSignupId: parsedPendingSignupId,
      method,
      otp: normalizedOtp,
    });
    sendSuccess(res, result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { login, password } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(login) || !isNonEmptyString(password)) {
      throw new AppError('Missing required fields', 400);
    }

    const result = await this.authService.login({ login, password });
    sendSuccess(res, result);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(email)) {
      throw new AppError('Missing email', 400);
    }

    const result = await this.authService.requestPasswordReset({ email });
    sendSuccess(res, result);
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { email, otp, newPassword } = req.body as Record<string, unknown>;
    const normalizedOtp = normalizeOtp(otp);
    if (!isNonEmptyString(email) || !normalizedOtp || !isNonEmptyString(newPassword)) {
      throw new AppError('Missing required fields', 400);
    }

    await this.authService.resetPassword({ email, otp: normalizedOtp, newPassword });
    sendSuccess(res, { message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { currentPassword, newPassword } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
      throw new AppError('Missing required fields', 400);
    }

    await this.authService.changePassword({
      userId: req.auth.userId,
      currentPassword,
      newPassword,
    });
    sendSuccess(res, { message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await this.authService.me(req.auth.userId);
    sendSuccess(res, { user });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    // 1. เพิ่ม email เข้าไปใน destructuring
    const { firstname, lastname, username, phoneNumber, email } = req.body as Record<string, unknown>;

    // 2. เพิ่มการตรวจสอบ email ว่าเป็น String ที่ไม่ว่าง
    if (!isNonEmptyString(firstname) || !isNonEmptyString(lastname) || !isNonEmptyString(username) || !isNonEmptyString(email)) {
      throw new AppError('Missing required fields', 400);
    }

    const user = await this.authService.updateProfile({
      userId: req.auth.userId,
      firstname,
      lastname,
      username,
      email, // 3. ส่ง email ไปยัง service
      phoneNumber: isNonEmptyString(phoneNumber) ? phoneNumber : undefined,
    });

    sendSuccess(res, { user });
  };

  topUpWallet = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const { amount, method } = req.body as Record<string, unknown>;
    const numericAmount =
      typeof amount === 'number' ? amount : typeof amount === 'string' ? Number(amount) : Number.NaN;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new AppError('จำนวนเงินที่เติมไม่ถูกต้อง', 400);
    }

    if (!isNonEmptyString(method)) {
      throw new AppError('กรุณาเลือกช่องทางการเติมเงิน', 400);
    }

    const result = await this.authService.topUpWallet({
      userId: req.auth.userId,
      amount: numericAmount,
      method,
    });

    sendSuccess(res, result);
  };

  listWalletTransactions = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rawLimit = Number(req.query.limit ?? 10);
    const limit = Number.isInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 10;

    const transactions = await this.authService.listWalletTransactions(req.auth.userId, limit);
    sendSuccess(res, { transactions });
  };
}
