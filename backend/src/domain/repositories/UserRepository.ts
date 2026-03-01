import type { CreateUserInput, User } from '../entities/User.js';

export interface UpdateProfileInput {
  firstname: string;
  lastname: string;
  email: string;
  phoneNumber: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findById(userId: number): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  updateProfileById(userId: number, input: UpdateProfileInput): Promise<User>;
  incrementBalanceById(userId: number, amount: number): Promise<User>;
  softDeleteById(userId: number): Promise<void>;
  restoreById(userId: number): Promise<void>;
  hardDeleteById(userId: number): Promise<void>;
}
