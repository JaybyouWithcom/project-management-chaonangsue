import type { UserRole } from '../domain/entities/User.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        role: UserRole;
      };
    }
  }
}

export {};
