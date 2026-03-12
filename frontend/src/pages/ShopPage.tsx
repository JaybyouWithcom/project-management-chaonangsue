import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Edit, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPatch, HttpError, resolveImageUrl } from "@/lib/api";
import { conditions, genres } from "@/lib/mockData";
import { type ApiBook, toUiBook } from "@/lib/books";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth";

interface ApiShop {
  shopId: number;
  userId: number;
  shopName: string;
  description: string | null;
  imagePath: string;
}

interface AuthMe {
  userId: number;
}

const ShopPage = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const parsedShopId = Number(shopId);
  const hasValidShopId = Number.isInteger(parsedShopId) && parsedShopId > 0;
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = getAuthToken();

  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editShopOpen, setEditShopOpen] = useState(false);
  const [deleteShopOpen, setDeleteShopOpen] = useState(false);
  const [shopForm, setShopForm] = useState({ shopName: "", description: "" });
  const [shopImageFile, setShopImageFile] = useState<File | null>(null);
  const [deleteShopConfirm, setDeleteShopConfirm] = useState("");

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

  const meQuery = useQuery({
    queryKey: ["auth-me", token],
    enabled: !!token,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthMe }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const openEditShopDialog = () => {
    if (!shopQuery.data) return;
    setShopForm({
      shopName: shopQuery.data.shopName,
      description: shopQuery.data.description ?? "",
    });
    setShopImageFile(null);
    setEditShopOpen(true);
  };

  const handleUpdateShop = async () => {
    if (!token) {
      toast({ title: "กรุณาเข้าสู่ระบบก่อนแก้ไขร้าน", variant: "destructive" });
      return;
    }
    if (!shopQuery.data) return;
    if (meQuery.data?.userId !== shopQuery.data.userId) {
      toast({ title: "คุณไม่มีสิทธิ์แก้ไขร้านนี้", variant: "destructive" });
      return;
    }
    if (!shopForm.shopName.trim()) {
      toast({ title: "กรุณาระบุชื่อร้าน", variant: "destructive" });
      return;
    }

    try {
      const imageBase64 = shopImageFile ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
            return;
          }
          reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        };
        reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        reader.readAsDataURL(shopImageFile);
      }) : undefined;

      await apiPatch(`/api/shops/${parsedShopId}`, {
        shopName: shopForm.shopName.trim(),
        description: shopForm.description.trim() ? shopForm.description.trim() : null,
        imageBase64,
      }, token);

      toast({ title: "อัปเดตร้านสำเร็จ" });
      setEditShopOpen(false);
      await shopQuery.refetch();
    } catch (error) {
      toast({
        title: "อัปเดตร้านไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleDeleteShop = async () => {
    if (!token) {
      toast({ title: "กรุณาเข้าสู่ระบบก่อนลบร้าน", variant: "destructive" });
      return;
    }
    if (!shopQuery.data) return;
    if (meQuery.data?.userId !== shopQuery.data.userId) {
      toast({ title: "คุณไม่มีสิทธิ์ลบร้านนี้", variant: "destructive" });
      return;
    }
    try {
      await apiDelete(`/api/shops/${parsedShopId}`, token);
      toast({ title: "ลบร้านสำเร็จ" });
      navigate("/store");
    } catch (error) {
      toast({
        title: "ลบร้านไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

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
  const isShopOwner = Boolean(
    token &&
    meQuery.data?.userId &&
    shopQuery.data?.userId &&
    meQuery.data.userId === shopQuery.data.userId,
  );
  const canShowShopActions = isShopOwner;
  const canDeleteShop = deleteShopConfirm.trim() === (shopQuery.data?.shopName ?? "");

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
              {canShowShopActions && (
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 bg-white/90 text-foreground hover:bg-white"
                    onClick={openEditShopDialog}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 bg-destructive/90 hover:bg-destructive"
                    onClick={() => {
                      setDeleteShopConfirm("");
                      setDeleteShopOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h1 className="font-display text-3xl md:text-4xl font-bold">{shopQuery.data.shopName}</h1>
                {shopQuery.data.description && (
                  <p className="text-sm md:text-base text-white/90 mt-1 line-clamp-2">{shopQuery.data.description}</p>
                )}
              </div>
            </section>

            <Dialog
              open={editShopOpen}
              onOpenChange={(open) => {
                setEditShopOpen(open);
                if (!open) {
                  setShopImageFile(null);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>แก้ไขร้าน</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shop-name">ชื่อร้าน</Label>
                    <Input
                      id="shop-name"
                      value={shopForm.shopName}
                      onChange={(event) => setShopForm((prev) => ({ ...prev, shopName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-desc">รายละเอียดร้าน</Label>
                    <Textarea
                      id="shop-desc"
                      rows={4}
                      value={shopForm.description}
                      onChange={(event) => setShopForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-image">แบนเนอร์ร้าน (ถ้าต้องการเปลี่ยน)</Label>
                    <Input
                      id="shop-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setShopImageFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <Button className="w-full" onClick={handleUpdateShop}>
                    บันทึกการแก้ไข
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={deleteShopOpen}
              onOpenChange={(open) => {
                setDeleteShopOpen(open);
                if (!open) {
                  setDeleteShopConfirm("");
                }
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">ยืนยันการลบร้าน</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    พิมพ์ชื่อร้าน <span className="font-semibold text-foreground">{shopQuery.data.shopName}</span> เพื่อยืนยันการลบ
                  </p>
                  <Input
                    value={deleteShopConfirm}
                    onChange={(event) => setDeleteShopConfirm(event.target.value)}
                    placeholder="พิมพ์ชื่อร้าน"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDeleteShopOpen(false)}>
                      ยกเลิก
                    </Button>
                    <Button variant="destructive" disabled={!canDeleteShop} onClick={handleDeleteShop}>
                      ลบร้าน
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
