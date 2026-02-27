import type { Book, RentalPlan } from '../../domain/entities/Book.js';
import type { BookRepository } from '../../domain/repositories/BookRepository.js';
import { AppError } from '../../shared/errors/AppError.js';

interface CreateBookInput {
  ownerId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn?: string;
  genre?: string;
  bookCondition?: '1' | '2' | '3' | '4' | '5';
  description?: string;
  rentalPrice: number;
  depositPrice: number;
}

interface SearchBooksInput {
  ownerId?: number;
  q?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}

const planDaysMap: Record<RentalPlan, number> = {
  '7days': 7,
  '14days': 14,
  '30days': 30,
};

export class BookService {
  constructor(private readonly bookRepository: BookRepository) {}

  async create(input: CreateBookInput): Promise<Book> {
    if (await this.bookRepository.existsByOwnerAndTitle(input.ownerId, input.title)) {
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

  async getBorrowQuote(bookId: number, plan: RentalPlan): Promise<{ book: Book; rentalPlan: RentalPlan; dueDate: string; totalAmount: number }> {
    const book = await this.getById(bookId);
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + planDaysMap[plan]);

    const totalAmount = Number(book.depositPrice) + Number(book.rentalPrice);

    return {
      book,
      rentalPlan: plan,
      dueDate: dueDate.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace(' ', 'T'),
      totalAmount,
    };
  }
}
