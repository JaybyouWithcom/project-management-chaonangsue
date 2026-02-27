import fs from 'node:fs/promises';
import path from 'node:path';

import type { Request, Response } from 'express';

import type { BookService } from '../../application/services/BookService.js';
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

const isRentalPlan = (value: unknown): value is RentalPlan => value === '7days' || value === '14days' || value === '30days';

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

export class BookController {
  constructor(private readonly bookService: BookService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const {
      title,
      author,
      isbn,
      genre,
      bookCondition,
      description,
      rentalPrice,
      depositPrice,
      imageBase64,
    } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(title) || !isNonEmptyString(author)) {
      throw new AppError('Missing required fields', 400);
    }

    if (!isNonEmptyString(imageBase64)) {
      throw new AppError('กรุณาอัปโหลดรูปหนังสือ', 400);
    }

    const imagePath = await saveImageFromDataUrl(imageBase64);

    const parsedRentalPrice = parseNumber(rentalPrice);
    const parsedDepositPrice = parseNumber(depositPrice);

    if (parsedRentalPrice === undefined || parsedDepositPrice === undefined) {
      throw new AppError('rentalPrice and depositPrice must be numbers', 400);
    }

    const result = await this.bookService.create({
      ownerId: req.auth.userId,
      title,
      imagePath,
      author,
      isbn: isNonEmptyString(isbn) ? isbn : undefined,
      genre: isNonEmptyString(genre) ? genre : undefined,
      bookCondition: isNonEmptyString(bookCondition) ? (bookCondition as '1' | '2' | '3' | '4' | '5') : undefined,
      description: isNonEmptyString(description) ? description : undefined,
      rentalPrice: parsedRentalPrice,
      depositPrice: parsedDepositPrice,
    });

    sendSuccess(res, { book: result }, 201);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
    const ownerOnly = req.query.ownerOnly === 'true';

    if (ownerOnly && !req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const result = await this.bookService.search({
      ownerId: ownerOnly ? req.auth?.userId : undefined,
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
}
