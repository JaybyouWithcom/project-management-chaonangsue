import type { Book, RentalPlan } from '../../domain/entities/Book.js';
import type { BookRepository } from '../../domain/repositories/BookRepository.js';
import type { ShopRepository } from '../../domain/repositories/ShopRepository.js';
import { AppError } from '../../shared/errors/AppError.js';

interface CreateBookInput {
  ownerId: number;
  shopId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn?: string;
  genre?: string;
  bookCondition?: '1' | '2' | '3' | '4' | '5';
  description?: string;
  bookPrice: number;
}

interface SearchBooksInput {
  shopId?: number;
  q?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}

const planDaysMap: Record<RentalPlan, number> = {
  '15days': 15,
  '30days': 30,
};

const planRateMap: Record<RentalPlan, number> = {
  '15days': 0.3,
  '30days': 0.5,
};

const depositRate = 0.5;

const toMoney = (value: number): number => Math.round(value * 100) / 100;

export class BookService {
  constructor(
    private readonly bookRepository: BookRepository,
    private readonly shopRepository: ShopRepository,
  ) {}

  async create(input: CreateBookInput): Promise<Book> {
    const shop = await this.shopRepository.findById(input.shopId);
    if (!shop || shop.userId !== input.ownerId) {
      throw new AppError('ไม่พบร้านที่คุณเลือก หรือคุณไม่มีสิทธิ์จัดการร้านนี้', 403);
    }

    if (await this.bookRepository.existsByShopAndTitle(input.shopId, input.title)) {
      throw new AppError('หนังสือนี้ถูกลงในร้านของคุณแล้ว', 409);
    }

    return this.bookRepository.create(input);
  }

  async search(input: SearchBooksInput): Promise<{ items: Book[]; total: number; page: number; limit: number }> {
    const result = await this.bookRepository.findAvailable(input);
    return {
      ...result,
      page: input.page,
      limit: input.limit,
    };
  }

  async getById(bookId: number): Promise<Book> {
    const book = await this.bookRepository.findById(bookId);

    if (!book || book.status !== 'Available') {
      throw new AppError('หนังสือเล่มนี้ไม่พร้อมให้ยืม', 404);
    }

    return book;
  }

  async getBorrowQuote(bookId: number, plan: RentalPlan): Promise<{
    book: Book;
    rentalPlan: RentalPlan;
    dueDate: string;
    rentalPrice: number;
    depositPrice: number;
    totalAmount: number;
  }> {
    const book = await this.getById(bookId);
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + planDaysMap[plan]);

    const basePrice = Number(book.bookPrice);
    const rentalPrice = toMoney(basePrice * planRateMap[plan]);
    const depositPrice = toMoney(basePrice * depositRate);
    const totalAmount = toMoney(rentalPrice + depositPrice);

    return {
      book,
      rentalPlan: plan,
      dueDate: dueDate.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(' ', 'T'),
      rentalPrice,
      depositPrice,
      totalAmount,
    };
  }
}
