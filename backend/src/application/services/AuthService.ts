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
  phoneNumber?: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const phoneNumber = input.phoneNumber?.trim() ? input.phoneNumber.trim() : undefined;

    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      throw new AppError('Phone number must be numeric with 9-10 digits', 400);
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
        throw new AppError('Email or username is already in use', 409);
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

  async updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    if (!input.firstname.trim() || !input.lastname.trim()) {
      throw new AppError('Missing required fields', 400);
    }

    const phoneNumber = input.phoneNumber?.trim() ? input.phoneNumber.trim() : null;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      throw new AppError('Phone number must be numeric with 9-10 digits', 400);
    }

    const updated = await this.userRepository.updateProfileById(input.userId, {
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      phoneNumber,
    });

    return toPublicUser(updated);
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

  }
}
