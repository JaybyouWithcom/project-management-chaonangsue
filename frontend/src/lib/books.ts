import type { Book as UiBook } from "@/lib/mockData";
import { resolveImageUrl } from "@/lib/api";

export interface ApiBook {
  bookId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  bookCondition: string | null;
  bookPrice: string;
  status: "Available" | "Rented";
  ownerName: string;
  description: string | null;
}

export const toUiBook = (book: ApiBook): UiBook => ({
  id: String(book.bookId),
  title: book.title,
  author: book.author,
  isbn: book.isbn ?? "-",
  genre: book.genre ?? "อื่นๆ",
  cover: resolveImageUrl(book.imagePath),
  condition: book.bookCondition ?? "3",
  minRentalPrice: Math.round(Number(book.bookPrice) * 0.3),
  pricePerDay: Math.round(Number(book.bookPrice) * 0.3),
  deposit: Math.round(Number(book.bookPrice) * 0.5),
  description: book.description ?? "",
  available: book.status === "Available",
  rating: 4.5,
  totalRentals: 0,
});
