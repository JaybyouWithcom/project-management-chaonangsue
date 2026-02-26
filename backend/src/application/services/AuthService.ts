import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import type { PublicUser, UserRole } from '../../domain/entities/User.js';
import { toPublicUser } from '../../domain/entities/User.js';
import type { UserRepository } from '../../domain/repositories/UserRepository.js';
import { env } from '../../infrastructure/config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import type { AuthJwtPayload } from '../../shared/types/auth.js';

interface RegisterInput {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
}

interface LoginInput {
  login: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    await this.assertUniqueness(input);

    const passwordHash = await bcrypt.hash(input.password, env.auth.bcryptSaltRounds);
    const user = await this.userRepository.create({
      firstname: input.firstname,
      lastname: input.lastname,
      username: input.username,
      email: input.email,
      phoneNumber: input.phoneNumber,
      passwordHash,
    });

    return {
      user: toPublicUser(user),
      token: this.signToken(user.userId, user.role),
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const userByEmail = await this.userRepository.findByEmail(input.login);
    const user = userByEmail ?? (await this.userRepository.findByUsername(input.login));

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordMatched = await bcrypt.compare(input.password, user.password);

    if (!passwordMatched) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.role === 'Banned') {
      throw new AppError('This account is banned', 403);
    }

    return {
      user: toPublicUser(user),
      token: this.signToken(user.userId, user.role),
    };
  }

  async me(userId: number): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toPublicUser(user);
  }

  verifyToken(token: string): AuthJwtPayload {
    try {
      const payload = jwt.verify(token, env.auth.jwtSecret) as AuthJwtPayload;
      return payload;
    } catch {
      throw new AppError('Invalid or expired token', 401);
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
      throw new AppError('Email is already in use', 409);
    }

    const existingByUsername = await this.userRepository.findByUsername(input.username);
    if (existingByUsername) {
      throw new AppError('Username is already in use', 409);
    }

    const existingByPhone = await this.userRepository.findByPhoneNumber(input.phoneNumber);
    if (existingByPhone) {
      throw new AppError('Phone number is already in use', 409);
    }
  }
}
