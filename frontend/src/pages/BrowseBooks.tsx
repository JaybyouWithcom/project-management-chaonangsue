import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { conditions, genres } from "@/lib/mockData";
import { apiGet } from "@/lib/api";
import { type ApiBook, toUiBook } from "@/lib/books";

const BrowseBooks = () => {
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["books", search],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (search) query.set("q", search);
      query.set("limit", "50");
      const response = await apiGet<{ books: ApiBook[] }>(`/api/books?${query.toString()}`);
      return response.data.books.map(toUiBook);
    },
  });

  const filtered = useMemo(() => {
    let books = [...(data ?? [])];
    if (selectedGenres.length > 0) books = books.filter((b) => selectedGenres.includes(b.genre));
    if (selectedCondition !== "all") books = books.filter((b) => b.condition === selectedCondition);
    if (sortBy === "price-asc") books.sort((a, b) => a.minRentalPrice - b.minRentalPrice);
    else if (sortBy === "price-desc") books.sort((a, b) => b.minRentalPrice - a.minRentalPrice);
    else if (sortBy === "rating") books.sort((a, b) => b.rating - a.rating);
    else books.sort((a, b) => b.totalRentals - a.totalRentals);
    return books;
  }, [data, selectedCondition, selectedGenres, sortBy]);

  const recommendedBooks = useMemo(
    () => filtered.filter((book) => book.rating >= 4.5).slice(0, 4),
    [filtered],
  );

  const toggleGenre = (genre: string) => {
    setSelectedGenres((previous) =>
      previous.includes(genre) ? previous.filter((item) => item !== genre) : [...previous, genre],
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">ค้นหาหนังสือ</h1>

        <div className="bg-card rounded-xl border p-4 mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยชื่อ, ผู้เขียน หรือ ISBN..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger className="w-36"><SelectValue placeholder="สภาพ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสภาพ</SelectItem>
                {conditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40"><SelectValue placeholder="เรียงตาม" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">ยอดนิยม</SelectItem>
                <SelectItem value="rating">คะแนนสูงสุด</SelectItem>
                <SelectItem value="price-asc">ราคาต่ำ → สูง</SelectItem>
                <SelectItem value="price-desc">ราคาสูง → ต่ำ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">เลือกได้หลายหมวดหมู่</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {genres.map((genre) => (
                <label key={genre} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedGenres.includes(genre)} onCheckedChange={() => toggleGenre(genre)} />
                  <span>{genre}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedGenres.map((genre) => (
              <Badge key={genre} variant="secondary" className="cursor-pointer" onClick={() => toggleGenre(genre)}>{genre} ✕</Badge>
            ))}
            {selectedCondition !== "all" && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCondition("all")}>{selectedCondition} ✕</Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">กำลังโหลดหนังสือ...</p>
        ) : isError ? (
          <p className="text-destructive">โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ backend API</p>
        ) : (
          <>
            {recommendedBooks.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2"><Star className="h-5 w-5 text-accent fill-current" /> หนังสือแนะนำจากคะแนนรีวิว</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {recommendedBooks.map((book) => (
                    <BookCard key={`recommended-${book.id}`} book={book} />
                  ))}
                </div>
              </section>
            )}

            <p className="text-sm text-muted-foreground mb-4">พบ {filtered.length} เล่ม</p>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filtered.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>ไม่พบหนังสือที่ค้นหา ลองเปลี่ยนคำค้นหาดู</p>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BrowseBooks;
