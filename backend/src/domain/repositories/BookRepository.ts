import type { Book, BookQuery, CreateBookInput } from '../entities/Book.js';

export interface BookRepository {
  create(input: CreateBookInput): Promise<Book>;
  findById(bookId: number): Promise<Book | null>;
  findAvailable(query: BookQuery): Promise<{ items: Book[]; total: number }>;
  existsByOwnerAndTitle(ownerId: number, title: string): Promise<boolean>;
}
