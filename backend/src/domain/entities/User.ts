export type UserRole = 'Customer' | 'Admin' | 'Banned';

export interface User {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  password: string;
  role: UserRole;
  balance: string;
  suspendedUntil: Date | null;
  deletedAt: Date | null;
}

export interface PublicUser {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  balance: string;
  suspendedUntil: Date | null;
  deletedAt: Date | null;
}

export interface CreateUserInput {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber?: string | null;
  passwordHash: string;
  role?: UserRole;
}

export const toPublicUser = (user: User): PublicUser => ({
  userId: user.userId,
  firstname: user.firstname,
  lastname: user.lastname,
  username: user.username,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  balance: user.balance,
  suspendedUntil: user.suspendedUntil,
  deletedAt: user.deletedAt,
});
