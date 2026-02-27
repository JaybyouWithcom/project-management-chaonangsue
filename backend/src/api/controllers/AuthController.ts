import type { Request, Response } from 'express';

import type { AuthService } from '../../application/services/AuthService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

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

  login = async (req: Request, res: Response): Promise<void> => {
    const { login, password } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(login) || !isNonEmptyString(password)) {
      throw new AppError('Missing required fields', 400);
    }

    const result = await this.authService.login({ login, password });
    sendSuccess(res, result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await this.authService.me(req.auth.userId);
    sendSuccess(res, { user });
  };
}
