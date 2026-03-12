import fs from 'node:fs/promises';
import path from 'node:path';

import type { Request, Response } from 'express';

import type { BookService } from '../../application/services/BookService.js';
import type { ReportService } from '../../application/services/ReportService.js';
import type { RentalPlan } from '../../domain/entities/Book.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const isRentalPlan = (value: unknown): value is RentalPlan => value === '15days' || value === '30days';
const isInteger = (value: unknown): value is number => Number.isInteger(value);

const saveImageFromDataUrl = async (imageBase64: string): Promise<string> => {
  const matched = imageBase64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matched) {
    throw new AppError('รูปภาพต้องเป็น base64 data URL (png/jpeg/webp)', 400);
  }

  const mime = matched[1];
  const data = matched[3];

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'books');

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(data, 'base64'));

  return `/uploads/books/${filename}`;
};

const saveReturnProofFromDataUrl = async (imageBase64: string): Promise<string> => {
  const matched = imageBase64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matched) {
    throw new AppError('รูปหลักฐานต้องเป็น base64 data URL (png/jpeg/webp)', 400);
  }

  const mime = matched[1];
  const data = matched[3];

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'returns');

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(data, 'base64'));

  return `/uploads/returns/${filename}`;
};

export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly reportService: ReportService,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const {
      shopId,
      title,
      author,
      isbn,
      genre,
      bookCondition,
      description,
      bookPrice,
      imageBase64,
    } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(title) || !isNonEmptyString(author)) {
      throw new AppError('Missing required fields', 400);
    }

    if (!isNonEmptyString(imageBase64)) {
      throw new AppError('กรุณาอัปโหลดรูปหนังสือ', 400);
    }

    const imagePath = await saveImageFromDataUrl(imageBase64);

    const parsedBookPrice = parseNumber(bookPrice);

    if (parsedBookPrice === undefined) {
      throw new AppError('bookPrice must be a number', 400);
    }
    const parsedShopId = parseNumber(shopId);
    if (!parsedShopId || !Number.isInteger(parsedShopId)) {
      throw new AppError('shopId must be an integer', 400);
    }

    const result = await this.bookService.create({
      ownerId: req.auth.userId,
      shopId: parsedShopId,
      title,
      imagePath,
      author,
      isbn: isNonEmptyString(isbn) ? isbn : undefined,
      genre: isNonEmptyString(genre) ? genre : undefined,
      bookCondition: isNonEmptyString(bookCondition) ? (bookCondition as '1' | '2' | '3' | '4' | '5') : undefined,
      description: isNonEmptyString(description) ? description : undefined,
      bookPrice: parsedBookPrice,
    });

    sendSuccess(res, { book: result }, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const {
      title,
      author,
      isbn,
      genre,
      bookCondition,
      description,
      bookPrice,
      imageBase64,
    } = req.body as Record<string, unknown>;

    const parsedBookPrice = parseNumber(bookPrice);
    if (bookPrice !== undefined && parsedBookPrice === undefined) {
      throw new AppError('bookPrice must be a number', 400);
    }

    let imagePath: string | undefined;
    if (isNonEmptyString(imageBase64)) {
      imagePath = await saveImageFromDataUrl(imageBase64);
    }

    const updated = await this.bookService.update({
      ownerId: req.auth.userId,
      bookId,
      title: isNonEmptyString(title) ? title : undefined,
      author: isNonEmptyString(author) ? author : undefined,
      isbn: typeof isbn === 'string' ? isbn : undefined,
      genre: typeof genre === 'string' ? genre : undefined,
      bookCondition: isNonEmptyString(bookCondition) ? (bookCondition as '1' | '2' | '3' | '4' | '5') : undefined,
      description: typeof description === 'string' ? description : undefined,
      bookPrice: parsedBookPrice,
      imagePath,
    });

    sendSuccess(res, { book: updated });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));

    const result = await this.bookService.search({
      shopId: parseNumber(req.query.shopId),
      q: isNonEmptyString(req.query.q) ? req.query.q : undefined,
      genre: isNonEmptyString(req.query.genre) ? req.query.genre : undefined,
      minPrice: parseNumber(req.query.minPrice),
      maxPrice: parseNumber(req.query.maxPrice),
      page,
      limit,
    });

    sendSuccess(
      res,
      { books: result.items },
      200,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    );
  };

  listReviews = async (req: Request, res: Response): Promise<void> => {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));

    const result = await this.bookService.listReviewsByBook(bookId, page, limit);
    sendSuccess(
      res,
      { reviews: result.items, summary: result.summary },
      200,
      { page, limit, total: result.total },
    );
  };

  detail = async (req: Request, res: Response): Promise<void> => {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const book = await this.bookService.getById(bookId);
    sendSuccess(res, { book });
  };

  quote = async (req: Request, res: Response): Promise<void> => {
    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const { plan } = req.query;
    if (!isRentalPlan(plan)) {
      throw new AppError('กรุณาเลือกแผนการยืมหนังสือ', 400);
    }

    const quote = await this.bookService.getBorrowQuote(bookId, plan);
    sendSuccess(res, quote);
  };

  rent = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const { plan } = req.body as Record<string, unknown>;
    if (!isRentalPlan(plan)) {
      throw new AppError('กรุณาเลือกแผนการยืมหนังสือ', 400);
    }

    const result = await this.bookService.rent({
      userId: req.auth.userId,
      bookId,
      plan,
    });

    sendSuccess(res, result, 201);
  };

  createReview = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const { rentalId, rating, comment } = req.body as Record<string, unknown>;
    const parsedRentalId = Number(rentalId);
    const parsedRating = Number(rating);

    if (!isInteger(parsedRentalId)) {
      throw new AppError('rentalId must be an integer', 400);
    }
    if (!isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new AppError('rating must be between 1 and 5', 400);
    }

    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';
    const finalComment = trimmedComment.length > 0 ? trimmedComment.slice(0, 500) : null;

    const result = await this.bookService.addReview({
      userId: req.auth.userId,
      bookId,
      rentalId: parsedRentalId,
      rating: parsedRating,
      comment: finalComment,
    });

    sendSuccess(res, result, 201);
  };

  report = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    const { reason, details } = req.body as Record<string, unknown>;
    if (!isNonEmptyString(reason)) {
      throw new AppError('reason is required', 400);
    }

    const trimmedDetails = typeof details === 'string' ? details.trim() : '';
    const finalDetails = trimmedDetails.length > 0 ? trimmedDetails.slice(0, 1000) : null;

    const reportId = await this.reportService.createBookReport(bookId, {
      reporterUserId: req.auth.userId,
      reason: reason.trim().slice(0, 255),
      details: finalDetails,
    });

    sendSuccess(res, { reportId }, 201);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const bookId = Number(req.params.bookId);
    if (!Number.isInteger(bookId)) {
      throw new AppError('Invalid bookId', 400);
    }

    await this.bookService.delete({ ownerId: req.auth.userId, bookId });
    sendSuccess(res, { deleted: true });
  };

  listMyRentals = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rentals = await this.bookService.listRentalsByUserId(req.auth.userId);
    sendSuccess(res, { rentals });
  };

  listShopRentals = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const shopId = parseNumber(req.query.shopId);
    if (!shopId || !Number.isInteger(shopId)) {
      throw new AppError('shopId must be an integer', 400);
    }

    const rentals = await this.bookService.listRentalsByShop(req.auth.userId, shopId);
    sendSuccess(res, { rentals });
  };

  payFine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rentalId = Number(req.params.rentalId);
    if (!Number.isInteger(rentalId)) {
      throw new AppError('Invalid rentalId', 400);
    }

    const result = await this.bookService.payFine({
      userId: req.auth.userId,
      rentalId,
    });
    sendSuccess(res, result);
  };

  requestReturn = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rentalId = Number(req.params.rentalId);
    if (!Number.isInteger(rentalId)) {
      throw new AppError('Invalid rentalId', 400);
    }

    const { deliveryProofImageBase64, deliverySentAt, simulatedOverdueDays } = req.body as Record<string, unknown>;
    let parsedDeliverySentAt: Date | null = null;
    let deliveryProofPath: string | null = null;
    let parsedSimulatedOverdueDays: number | undefined;

    const hasProof = isNonEmptyString(deliveryProofImageBase64);
    const hasDeliverySentAt = isNonEmptyString(deliverySentAt);
    if (hasProof || hasDeliverySentAt) {
      if (!hasProof) {
        throw new AppError('กรุณาแนบรูปหลักฐานการส่งคืน', 400);
      }
      if (!hasDeliverySentAt) {
        throw new AppError('กรุณาระบุเวลาที่จัดส่งคืน', 400);
      }

      parsedDeliverySentAt = new Date(deliverySentAt as string);
      if (Number.isNaN(parsedDeliverySentAt.getTime())) {
        throw new AppError('รูปแบบเวลาจัดส่งคืนไม่ถูกต้อง', 400);
      }

      deliveryProofPath = await saveReturnProofFromDataUrl(deliveryProofImageBase64 as string);
    }

    if (simulatedOverdueDays !== undefined) {
      if (typeof simulatedOverdueDays !== 'number' || !Number.isInteger(simulatedOverdueDays)) {
        throw new AppError('Invalid simulatedOverdueDays', 400);
      }
      if (simulatedOverdueDays < 0 || simulatedOverdueDays > 7) {
        throw new AppError('Invalid simulatedOverdueDays', 400);
      }
      parsedSimulatedOverdueDays = simulatedOverdueDays;
    }

    const result = await this.bookService.requestReturn({
      userId: req.auth.userId,
      rentalId,
      deliveryProofPath,
      deliverySentAt: parsedDeliverySentAt,
      simulatedOverdueDays: parsedSimulatedOverdueDays,
    });
    sendSuccess(res, result);
  };

  simulateAutoComplete = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rentalId = Number(req.params.rentalId);
    if (!Number.isInteger(rentalId)) {
      throw new AppError('Invalid rentalId', 400);
    }

    const result = await this.bookService.simulateAutoComplete({
      userId: req.auth.userId,
      rentalId,
    });
    sendSuccess(res, result);
  };

  activateRental = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rentalId = Number(req.params.rentalId);
    if (!Number.isInteger(rentalId)) {
      throw new AppError('Invalid rentalId', 400);
    }

    const result = await this.bookService.activateRental({
      userId: req.auth.userId,
      rentalId,
    });
    sendSuccess(res, result);
  };

  confirmReturnByShop = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const rentalId = Number(req.params.rentalId);
    if (!Number.isInteger(rentalId)) {
      throw new AppError('Invalid rentalId', 400);
    }

    const { conditionFineRate } = req.body as Record<string, unknown>;
    const parsedConditionFineRate = parseNumber(conditionFineRate);
    if (parsedConditionFineRate === undefined) {
      throw new AppError('conditionFineRate must be a number', 400);
    }

    const result = await this.bookService.confirmReturnByShop({
      userId: req.auth.userId,
      rentalId,
      conditionFineRate: parsedConditionFineRate,
    });
    sendSuccess(res, result);
  };
}
