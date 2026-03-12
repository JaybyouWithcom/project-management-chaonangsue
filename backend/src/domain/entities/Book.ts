export type BookStatus = 'Available' | 'Rented';
export type RentalPlan = '15days' | '30days';

export interface Book {
  bookId: number;
  ownerId: number;
  shopId: number | null;
  shopName: string | null;
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
  ratingAverage: number;
  reviewCount: number;
}

export interface CreateBookInput {
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

export interface BookQuery {
  shopId?: number;
  q?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
}
