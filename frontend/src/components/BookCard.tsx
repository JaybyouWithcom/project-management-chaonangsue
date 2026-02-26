import { Star } from "lucide-react";
import { Book } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface BookCardProps {
  book: Book;
}

const BookCard = ({ book }: BookCardProps) => (
  <Link
    to={`/book/${book.id}`}
    className="group block rounded-xl overflow-hidden bg-card border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
  >
    <div className="relative aspect-[3/4] overflow-hidden">
      <img
        src={book.cover}
        alt={book.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      {!book.available && (
        <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
          <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
            เช่าหมดแล้ว
          </span>
        </div>
      )}
      <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground border-0 text-xs">
        {book.condition}
      </Badge>
    </div>
    <div className="p-4">
      <h3 className="font-display font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
        {book.title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-primary font-bold">
          ฿{book.minRentalPrice}
        </span>
        <div className="flex items-center gap-1 text-sm text-accent">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="font-medium">{book.rating}</span>
        </div>
      </div>
    </div>
  </Link>
);

export default BookCard;
