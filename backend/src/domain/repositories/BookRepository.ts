import type { Book, BookQuery, CreateBookInput } from '../entities/Book.js';

export interface BookRepository {
  create(input: CreateBookInput): Promise<Book>;
  findById(bookId: number): Promise<Book | null>;
  findAvailable(query: BookQuery): Promise<{ items: Book[]; total: number }>;
  existsByShopAndTitle(shopId: number, title: string): Promise<boolean>;
  updateById(bookId: number, input: {
    title: string;
    imagePath: string;
    author: string;
    isbn: string | null;
    genre: string | null;
    bookCondition: '1' | '2' | '3' | '4' | '5' | null;
    description: string | null;
    bookPrice: number;
  }): Promise<Book>;
  deleteById(bookId: number): Promise<void>;
}
