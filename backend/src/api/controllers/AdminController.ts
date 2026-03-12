import type { Request, Response } from 'express';

import type { AdminService } from '../../application/services/AdminService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isUserStatusAction = (value: unknown): value is 'BAN' | 'UNBAN' | 'SUSPEND' | 'UNSUSPEND' =>
  value === 'BAN' || value === 'UNBAN' || value === 'SUSPEND' || value === 'UNSUSPEND';

const isReportStatusAction = (value: unknown): value is 'RESOLVE' | 'DISMISS' | 'REOPEN' =>
  value === 'RESOLVE' || value === 'DISMISS' || value === 'REOPEN';

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  dashboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const dashboard = await this.adminService.getDashboardData(req.auth.userId);
    sendSuccess(res, dashboard);
  };

  updateUserStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const targetUserId = Number(req.params.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AppError('Invalid userId', 400);
    }

    const { action, suspendUntil } = req.body as Record<string, unknown>;
    if (!isUserStatusAction(action)) {
      throw new AppError('Invalid action', 400);
    }

    let parsedSuspendUntil: Date | undefined;
    if (suspendUntil !== undefined) {
      if (typeof suspendUntil !== 'string' || !suspendUntil.trim()) {
        throw new AppError('suspendUntil must be an ISO date string', 400);
      }
      parsedSuspendUntil = new Date(suspendUntil);
      if (Number.isNaN(parsedSuspendUntil.getTime())) {
        throw new AppError('Invalid suspendUntil format', 400);
      }
    }

    const user = await this.adminService.updateUserStatus(req.auth.userId, {
      targetUserId,
      action,
      suspendUntil: parsedSuspendUntil,
    });
    sendSuccess(res, { user });
  };

  softDeleteBook = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      throw new AppError('Invalid bookId', 400);
    }

    await this.adminService.softDeleteBook(req.auth.userId, bookId);
    sendSuccess(res, { deleted: true });
  };

  updateReportStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      throw new AppError('Invalid reportId', 400);
    }

    const { action, adminNote } = req.body as Record<string, unknown>;
    if (!isReportStatusAction(action)) {
      throw new AppError('Invalid action', 400);
    }
    if (adminNote !== undefined && typeof adminNote !== 'string') {
      throw new AppError('adminNote must be a string', 400);
    }

    const report = await this.adminService.updateReportStatus(req.auth.userId, reportId, {
      action,
      adminNote: adminNote ?? undefined,
    });

    sendSuccess(res, { report });
  };
}
