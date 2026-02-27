export type BookStatus = 'Available' | 'Rented';
export type RentalPlan = '15days' | '30days';

export interface Book {
  bookId: number;
  ownerId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  bookCondition: '1' | '2' | '3' | '4' | '5' | null;
  description: string | null;
  bookPrice: string;
  status: BookStatus;
  createdAt: Date;
  ownerName: string;
}

export interface CreateBookInput {
  ownerId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn?: string;
  genre?: string;
  bookCondition?: '1' | '2' | '3' | '4' | '5';
  description?: string;
  bookPrice: number;
}

export interface BookQuery {
  q?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}
