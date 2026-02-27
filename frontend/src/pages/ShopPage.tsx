import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiGet, HttpError, resolveImageUrl } from "@/lib/api";
import { conditions, genres } from "@/lib/mockData";
import { type ApiBook, toUiBook } from "@/lib/books";

interface ApiShop {
  shopId: number;
  shopName: string;
  description: string | null;
  imagePath: string;
}

const ShopPage = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const parsedShopId = Number(shopId);
  const hasValidShopId = Number.isInteger(parsedShopId) && parsedShopId > 0;

  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGenreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shopQuery = useQuery({
    queryKey: ["public-shop", parsedShopId],
    enabled: hasValidShopId,
    queryFn: async () => {
      const response = await apiGet<{ shop: ApiShop }>(`/api/shops/${parsedShopId}`);
      return response.data.shop;
    },
  });

  const booksQuery = useQuery({
    queryKey: ["shop-books", parsedShopId, search],
    enabled: hasValidShopId,
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set("shopId", String(parsedShopId));
      query.set("limit", "50");
      if (search) query.set("q", search);
      const response = await apiGet<{ books: ApiBook[] }>(`/api/books?${query.toString()}`);
      return response.data.books.map(toUiBook);
    },
  });

  const filteredBooks = useMemo(() => {
    let books = [...(booksQuery.data ?? [])];
    if (selectedGenres.length > 0) books = books.filter((b) => selectedGenres.includes(b.genre));
    if (selectedCondition !== "all") books = books.filter((b) => b.condition === selectedCondition);
    if (sortBy === "price-asc") books.sort((a, b) => a.minRentalPrice - b.minRentalPrice);
    else if (sortBy === "price-desc") books.sort((a, b) => b.minRentalPrice - a.minRentalPrice);
    else if (sortBy === "rating") books.sort((a, b) => b.rating - a.rating);
    else books.sort((a, b) => b.totalRentals - a.totalRentals);
    return books;
  }, [booksQuery.data, selectedCondition, selectedGenres, sortBy]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((previous) =>
      previous.includes(genre) ? previous.filter((item) => item !== genre) : [...previous, genre],
    );
  };

  const shopErrorMessage =
    shopQuery.error instanceof HttpError ? shopQuery.error.message : "ไม่สามารถโหลดข้อมูลร้านได้";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        {!hasValidShopId ? (
          <p className="text-destructive">ไม่พบรหัสร้านที่ถูกต้อง</p>
        ) : shopQuery.isLoading ? (
          <p className="text-muted-foreground">กำลังโหลดข้อมูลร้าน...</p>
        ) : shopQuery.isError || !shopQuery.data ? (
          <p className="text-destructive">{shopErrorMessage}</p>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-2xl border mb-6">
              <img
                src={resolveImageUrl(shopQuery.data.imagePath)}
                alt={shopQuery.data.shopName}
                className="h-52 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h1 className="font-display text-3xl md:text-4xl font-bold">{shopQuery.data.shopName}</h1>
                {shopQuery.data.description && (
                  <p className="text-sm md:text-base text-white/90 mt-1 line-clamp-2">{shopQuery.data.description}</p>
                )}
              </div>
            </section>

            <div className="bg-card rounded-xl border p-4 mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยชื่อ, ผู้เขียน หรือ ISBN..."
                  className="pl-10"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <div className="relative" ref={dropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-40 justify-between font-normal bg-background"
                    onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                  >
                    {selectedGenres.length > 0 ? `หมวดหมู่ (${selectedGenres.length})` : "ทุกหมวดหมู่"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                  {isGenreDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 p-3 bg-popover border rounded-md shadow-lg z-50">
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {genres.map((genre) => (
                          <label
                            key={genre}
                            className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors"
                          >
                            <Checkbox
                              checked={selectedGenres.includes(genre)}
                              onCheckedChange={() => toggleGenre(genre)}
                            />
                            <span>{genre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="สภาพ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกสภาพ</SelectItem>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="เรียงตาม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">ยอดนิยม</SelectItem>
                    <SelectItem value="rating">คะแนนสูงสุด</SelectItem>
                    <SelectItem value="price-asc">ราคาต่ำ → สูง</SelectItem>
                    <SelectItem value="price-desc">ราคาสูง → ต่ำ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(selectedGenres.length > 0 || selectedCondition !== "all") && (
                <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
                  {selectedGenres.map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre} ✕
                    </Badge>
                  ))}
                  {selectedCondition !== "all" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setSelectedCondition("all")}
                    >
                      {selectedCondition} ✕
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {booksQuery.isLoading ? (
              <p className="text-muted-foreground">กำลังโหลดหนังสือ...</p>
            ) : booksQuery.isError ? (
              <p className="text-destructive">โหลดหนังสือของร้านไม่สำเร็จ</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">พบ {filteredBooks.length} เล่มในร้านนี้</p>
                {filteredBooks.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {filteredBooks.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>ไม่พบหนังสือที่ตรงกับคำค้นหาในร้านนี้</p>
                    <Button asChild variant="ghost" className="mt-3">
                      <Link to="/browse">กลับไปหน้าค้นหาหนังสือ</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ShopPage;
