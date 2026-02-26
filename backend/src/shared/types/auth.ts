import type { UserRole } from '../../domain/entities/User.js';

export interface AuthJwtPayload {
  sub: string;
  role: UserRole;
}
