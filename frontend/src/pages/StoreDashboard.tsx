import { useMemo, useState } from "react";
import {
  BookOpen, Package, DollarSign, AlertTriangle, Plus, Edit, Trash2,
  TrendingUp, BarChart3, Users, Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockOrders, genres } from "@/lib/mockData";
import { conditionOptions, normalizeConditionLabel } from "@/lib/bookCondition";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiGet, apiPatch, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface ApiBook {
  bookId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  bookCondition: string | null;
  description: string | null;
  bookPrice: string;
  status: "Available" | "Rented";
}

interface ApiRental {
  rentalId: number;
  bookId: number;
  bookTitle: string;
  bookCover: string;
  bookAuthor: string;
  bookCondition: string | null;
  bookPrice: number;
  renterName: string;
  renterId: number;
  startDate: string;
  endDate: string;
  rentalPrice: number;
  status: "กำลังยืม" | "คืนแล้ว" | "เลยกำหนด";
  totalPrice: number;
  pastDueDays: number;
  fineAmountDue: number;
  fineAmountTotal: number;
  finePaidAt: string | null;
  paymentStatus: "รอชำระ" | "ชำระแล้ว" | "ยกเลิก";
}

type InventoryFilter = "all" | "rented" | "not-rented";

interface InventoryBookItem {
  bookId: number;
  title: string;
  imagePath: string;
  author: string;
  bookPrice: string | null;
  bookCondition: string | null;
  hasBeenRented: boolean;
  isCurrentlyRented: boolean;
  sourceBook: ApiBook | null;
}

// เพิ่ม Interface สำหรับ Shop
interface ApiShop {
  shopId: number;
  shopName: string;
  description: string | null;
  imagePath: string;
}

const paymentStatusColors: Record<string, string> = {
  "รอชำระ": "bg-warning/20 text-warning",
  "ชำระแล้ว": "bg-success/20 text-success",
  "ยกเลิก": "bg-destructive/20 text-destructive",
};

const StoreDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shopId = Number(searchParams.get("shopId"));
  const hasValidShopId = Number.isInteger(shopId) && shopId > 0;
  const token = getAuthToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookSearch, setBookSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ApiBook | null>(null);
  const [deletingBook, setDeletingBook] = useState<ApiBook | null>(null);
  const [deleteBookConfirm, setDeleteBookConfirm] = useState("");
  const [editShopOpen, setEditShopOpen] = useState(false);
  const [deleteShopOpen, setDeleteShopOpen] = useState(false);
  const [shopForm, setShopForm] = useState({ shopName: "", description: "" });
  const [shopImageFile, setShopImageFile] = useState<File | null>(null);
  const [deleteShopConfirm, setDeleteShopConfirm] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    genre: "",
    bookPrice: "",
    bookCondition: "2",
    description: "",
  });

  const resetBookForm = () => {
    setForm({
      title: "",
      author: "",
      isbn: "",
      genre: "",
      bookPrice: "",
      bookCondition: "2",
      description: "",
    });
  };

  // ดึงข้อมูลร้านค้าทั้งหมดของเราเพื่อหาชื่อร้านปัจจุบัน (ดึงจาก Cache ของหน้า StoreMenu ได้เลย)
  const { data: shops = [] } = useQuery({
    queryKey: ["my-shops"],
    queryFn: async () => {
      if (!token) return [] as ApiShop[];
      const result = await apiGet<{ shops: ApiShop[] }>("/api/shops", token);
      return result.data.shops;
    },
    enabled: !!token, // ทำงานเมื่อมี token เท่านั้น
  });

  const { data: books = [], isError } = useQuery({
    queryKey: ["admin-books", shopId],
    queryFn: async () => {
      if (!hasValidShopId) {
        return [] as ApiBook[];
      }
      const result = await apiGet<{ books: ApiBook[] }>(`/api/books?limit=100&shopId=${shopId}`);
      return result.data.books;
    },
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ["shop-rentals", shopId],
    queryFn: async () => {
      if (!hasValidShopId || !token) {
        return [] as ApiRental[];
      }
      const result = await apiGet<{ rentals: ApiRental[] }>(`/api/books/rentals/shop?shopId=${shopId}`, token);
      return result.data.rentals;
    },
  });

  const totalRevenue = rentals.filter(o => o.paymentStatus === "ชำระแล้ว").reduce((s, o) => s + o.totalPrice, 0);
  const totalPenalty = rentals.reduce((s, o) => s + o.fineAmountTotal, 0);
  const activeRentals = rentals.filter(o => o.status !== "คืนแล้ว").length;
  const overdueCount = rentals.filter(o => o.status === "เลยกำหนด").length;

  const inventoryBooks = useMemo<InventoryBookItem[]>(() => {
    const rentalsByBookId = new Map<number, { hasBeenRented: boolean; isCurrentlyRented: boolean; rental: ApiRental }>();
    for (const rental of rentals) {
      const current = rentalsByBookId.get(rental.bookId);
      rentalsByBookId.set(rental.bookId, {
        hasBeenRented: true,
        isCurrentlyRented: current ? current.isCurrentlyRented || rental.status !== "คืนแล้ว" : rental.status !== "คืนแล้ว",
        rental,
      });
    }

    const itemsFromBooks = books.map((book) => {
      const rentalMeta = rentalsByBookId.get(book.bookId);
      return {
        bookId: book.bookId,
        title: book.title,
        imagePath: book.imagePath,
        author: book.author,
        bookPrice: book.bookPrice,
        bookCondition: book.bookCondition,
        hasBeenRented: Boolean(rentalMeta?.hasBeenRented),
        isCurrentlyRented: Boolean(rentalMeta?.isCurrentlyRented),
        sourceBook: book,
      };
    });

    const itemsFromRentalsOnly = rentals
      .filter((rental) => !books.some((book) => book.bookId === rental.bookId))
      .reduce<InventoryBookItem[]>((acc, rental) => {
        if (acc.some((item) => item.bookId === rental.bookId)) {
          return acc;
        }
        acc.push({
          bookId: rental.bookId,
          title: rental.bookTitle,
          imagePath: rental.bookCover,
          author: rental.bookAuthor,
          bookPrice: String(rental.bookPrice),
          bookCondition: rental.bookCondition,
          hasBeenRented: true,
          isCurrentlyRented: rental.status !== "คืนแล้ว",
          sourceBook: null,
        });
        return acc;
      }, []);

    return [...itemsFromBooks, ...itemsFromRentalsOnly];
  }, [books, rentals]);

  const filteredBooks = useMemo(
    () =>
      inventoryBooks.filter((book) => {
        const matchesSearch =
          book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
          book.author.toLowerCase().includes(bookSearch.toLowerCase());
        if (!matchesSearch) {
          return false;
        }
        if (inventoryFilter === "rented") {
          return book.hasBeenRented;
        }
        if (inventoryFilter === "not-rented") {
          return !book.hasBeenRented;
        }
        return true;
      }),
    [inventoryBooks, bookSearch, inventoryFilter],
  );

  const handleSaveBook = async () => {
    const token = getAuthToken();
    if (!token) {
      toast({ title: "กรุณา login ก่อนลงหนังสือ", variant: "destructive" });
      return;
    }
    if (!hasValidShopId && !editingBook) {
      toast({ title: "ไม่พบร้านที่เลือก", description: "กรุณากลับไปเลือกจากเมนูร้านของฉัน", variant: "destructive" });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "กรุณากรอกชื่อหนังสือ", variant: "destructive" });
      return;
    }
    if (!form.author.trim()) {
      toast({ title: "กรุณากรอกชื่อผู้เขียน", variant: "destructive" });
      return;
    }
    if (!form.bookPrice || Number.isNaN(Number(form.bookPrice))) {
      toast({ title: "กรุณากรอกราคาหนังสือให้ถูกต้อง", variant: "destructive" });
      return;
    }

    try {
      if (!editingBook && !imageFile) {
        toast({ title: "กรุณาเลือกรูปปกหนังสือ", variant: "destructive" });
        return;
      }

      const imageBase64 = imageFile ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
            return;
          }

          reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
        };
        reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่สำเร็จ'));
        reader.readAsDataURL(imageFile);
      }) : undefined;

      if (editingBook) {
        await apiPatch(`/api/books/${editingBook.bookId}`, {
          ...form,
          bookPrice: Number(form.bookPrice),
          imageBase64,
        }, token);
        toast({ title: "อัปเดตหนังสือสำเร็จ" });
      } else {
        await apiPost("/api/books", {
          ...form,
          shopId,
          bookPrice: Number(form.bookPrice),
          imageBase64,
        }, token);
        toast({ title: "เพิ่มหนังสือสำเร็จ! 📚" });
      }

      resetBookForm();
      setImageFile(null);
      setEditingBook(null);
      setBookDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-books", shopId] });
    } catch (error) {
      toast({
        title: editingBook ? "อัปเดตหนังสือไม่สำเร็จ" : "เพิ่มหนังสือไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const openCreateBookDialog = () => {
    setEditingBook(null);
    resetBookForm();
    setImageFile(null);
    setBookDialogOpen(true);
  };

  const openEditBookDialog = (book: ApiBook) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn ?? "",
      genre: book.genre ?? "",
      bookPrice: String(book.bookPrice ?? ""),
      bookCondition: book.bookCondition ?? "2",
      description: book.description ?? "",
    });
    setImageFile(null);
    setBookDialogOpen(true);
  };

  const handleDeleteBook = async () => {
    if (!deletingBook) return;
    const token = getAuthToken();
    if (!token) {
      toast({ title: "กรุณา login ก่อนลบหนังสือ", variant: "destructive" });
      return;
    }
    try {
      await apiDelete(`/api/books/${deletingBook.bookId}`, token);
      toast({ title: "ลบหนังสือสำเร็จ" });
      setDeletingBook(null);
      setDeleteBookConfirm("");
      await queryClient.invalidateQueries({ queryKey: ["admin-books", shopId] });
    } catch (error) {
      toast({
        title: "ลบหนังสือไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const selectedShop = shops.find((s) => s.shopId === shopId);
  // ค้นหาชื่อร้านจากข้อมูลร้านค้าทั้งหมด ถ้าไม่พบให้แสดงคำว่า "แดชบอร์ดร้าน"
  const shopName = selectedShop?.shopName || "แดชบอร์ดร้าน";
  const shopBanner = selectedShop?.imagePath
    ? resolveImageUrl(selectedShop.imagePath)
    : "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80";
  const canShowShopActions = !!token && !!selectedShop;

  const openEditShopDialog = () => {
    if (!selectedShop) return;
    setShopForm({
      shopName: selectedShop.shopName,
      description: selectedShop.description ?? "",
    });
    setShopImageFile(null);
    setEditShopOpen(true);
  };

  const handleUpdateShop = async () => {
    if (!token) {
      toast({ title: "กรุณา login ก่อนแก้ไขร้าน", variant: "destructive" });
      return;
    }
    if (!selectedShop) return;
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

      await apiPatch(`/api/shops/${selectedShop.shopId}`, {
        shopName: shopForm.shopName.trim(),
        description: shopForm.description.trim() ? shopForm.description.trim() : null,
        imageBase64,
      }, token);

      toast({ title: "อัปเดตร้านสำเร็จ" });
      setEditShopOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["my-shops"] });
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
      toast({ title: "กรุณา login ก่อนลบร้าน", variant: "destructive" });
      return;
    }
    if (!selectedShop) return;
    try {
      await apiDelete(`/api/shops/${selectedShop.shopId}`, token);
      toast({ title: "ลบร้านสำเร็จ" });
      await queryClient.invalidateQueries({ queryKey: ["my-shops"] });
      navigate("/store");
    } catch (error) {
      toast({
        title: "ลบร้านไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        {!hasValidShopId && (
          <p className="text-destructive mb-4">ไม่พบ shopId กรุณาเลือกเข้าร้านจากหน้าเมนูร้านของฉัน</p>
        )}
        <section className="relative overflow-hidden rounded-2xl border mb-6">
          <img src={shopBanner} alt={shopName} className="h-52 w-full object-cover" />
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
            {/* นำตัวแปร shopName มาแสดงตรงนี้ */}
            <h1 className="font-display text-3xl md:text-4xl font-bold">{shopName}</h1>
            {selectedShop?.description && (
              <p className="text-sm md:text-base text-white/90 mt-1 line-clamp-2">{selectedShop.description}</p>
            )}
          </div>
        </section>

        {isError && <p className="text-destructive mb-4">โหลดข้อมูลหนังสือจาก API ไม่สำเร็จ</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "รายได้รวม", value: `฿${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-success", sub: `+฿${totalPenalty.toLocaleString()} ค่าปรับ` },
            { label: "ออเดอร์เลยกำหนด", value: overdueCount, icon: AlertTriangle, color: "text-destructive", sub: "ต้องติดตาม" },
            { label: "กำลังเช่า", value: activeRentals, icon: Package, color: "text-info", sub: "รายการ" },
            { label: "หนังสือในระบบ", value: books.length, icon: BookOpen, color: "text-accent", sub: `${books.filter(b => b.status === 'Available').length} ว่างอยู่` },
          ].map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2"><card.icon className={`h-5 w-5 ${card.color}`} /><span className="text-sm text-muted-foreground">{card.label}</span></div>
              <div className="text-2xl font-display font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="inventory">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="inventory"><BookOpen className="h-4 w-4 mr-1" /> คลังหนังสือ</TabsTrigger>
              <TabsTrigger value="orders"><Package className="h-4 w-4 mr-1" /> คำสั่งเช่า</TabsTrigger>
              <TabsTrigger value="revenue"><BarChart3 className="h-4 w-4 mr-1" /> รายงาน</TabsTrigger>
              <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> การชำระเงิน</TabsTrigger>
            </TabsList>
            <Dialog
              open={bookDialogOpen}
              onOpenChange={(open) => {
                setBookDialogOpen(open);
                if (!open) {
                  setEditingBook(null);
                  setImageFile(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground" disabled={!hasValidShopId} onClick={openCreateBookDialog}>
                  <Plus className="mr-2 h-4 w-4" /> เพิ่มหนังสือ
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingBook ? "แก้ไขหนังสือ" : "เพิ่มหนังสือใหม่"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div><Label>ชื่อหนังสือ</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div><Label>ผู้เขียน</Label><Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} /></div>
                  <div><Label>ISBN</Label><Input value={form.isbn} onChange={(e) => setForm((p) => ({ ...p, isbn: e.target.value }))} /></div>
                  <div><Label>รูปปกหนังสือ</Label><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>หมวดหมู่</Label>
                      <Select value={form.genre} onValueChange={(genre) => setForm((p) => ({ ...p, genre }))}>
                        <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                        <SelectContent>{genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>ราคาหนังสือ</Label><Input type="number" value={form.bookPrice} onChange={(e) => setForm((p) => ({ ...p, bookPrice: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label>สภาพหนังสือ</Label>
                    <Select value={form.bookCondition} onValueChange={(bookCondition) => setForm((p) => ({ ...p, bookCondition }))}>
                      <SelectTrigger><SelectValue placeholder="เลือกสภาพ" /></SelectTrigger>
                      <SelectContent>{conditionOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">ระบบจะคำนวณอัตโนมัติ: มัดจำ 50% | เช่า 15 วัน 30% | เช่า 30 วัน 50%</p>
                  <div><Label>รายละเอียด</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveBook}>
                    {editingBook ? "บันทึกการแก้ไข" : "บันทึก"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="inventory">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative max-w-sm flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="ค้นหาชื่อหนังสือ/ผู้เขียน" value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />
                </div>
                <Select value={inventoryFilter} onValueChange={(value) => setInventoryFilter(value as InventoryFilter)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="กรองสถานะการยืม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="rented">ถูกยืมแล้ว</SelectItem>
                    <SelectItem value="not-rented">ยังไม่ถูกยืม</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <div key={book.bookId} className="flex items-center gap-4 rounded-lg border p-3">
                    <img src={resolveImageUrl(book.imagePath)} alt={book.title} className="w-14 h-20 rounded object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                      <p className="text-xs text-muted-foreground">ราคาหนังสือ {book.bookPrice ? `฿${book.bookPrice}` : "-"}</p>
                      <p className="text-xs text-muted-foreground">สภาพหนังสือ: {book.bookCondition ? normalizeConditionLabel(book.bookCondition) : "-"}</p>
                    </div>
                    {book.isCurrentlyRented ? (
                      <Badge className="bg-warning text-warning-foreground border-0">ยืมแล้ว</Badge>
                    ) : (
                      <Badge variant="default">ว่าง</Badge>
                    )}
                    {book.sourceBook ? (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEditBookDialog(book.sourceBook)}><Edit className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingBook(book.sourceBook);
                            setDeleteBookConfirm("");
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">ไม่สามารถแก้ไขได้ขณะกำลังถูกยืม</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders"><div className="text-muted-foreground">ยังเป็น mock data (เชื่อมจริงรอบถัดไป)</div></TabsContent>
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> สรุปรายได้</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b"><span className="text-muted-foreground">รายได้จากค่าเช่า</span><span className="font-bold text-lg">฿{totalRevenue.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center py-3 border-b"><span className="text-muted-foreground">รายได้จากค่าปรับ</span><span className="font-bold text-lg text-destructive">฿{totalPenalty.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-6"><h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-info" /> สถิติผู้ใช้งาน</h3></div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="bg-card rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>รหัสคำสั่ง</TableHead><TableHead>ผู้เช่า</TableHead><TableHead>ค่าเช่า</TableHead><TableHead>ค่าปรับ</TableHead><TableHead>รวม</TableHead><TableHead>สถานะ</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rentals.map((order) => (
                    <TableRow key={order.rentalId}>
                      <TableCell className="font-mono text-xs">RENT-{order.rentalId}</TableCell>
                      <TableCell className="text-sm">{order.renterName}</TableCell>
                      <TableCell className="font-semibold">฿{order.totalPrice}</TableCell>
                      <TableCell className={order.fineAmountTotal > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>{order.fineAmountTotal > 0 ? `฿${order.fineAmountTotal}` : "—"}</TableCell>
                      <TableCell className="font-bold">฿{order.totalPrice + order.fineAmountTotal}</TableCell>
                      <TableCell><Badge className={`${paymentStatusColors[order.paymentStatus]} border-0`}>{order.paymentStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

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
                <Label htmlFor="shop-name-edit">ชื่อร้าน</Label>
                <Input
                  id="shop-name-edit"
                  value={shopForm.shopName}
                  onChange={(event) => setShopForm((prev) => ({ ...prev, shopName: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="shop-desc-edit">รายละเอียดร้าน</Label>
                <Textarea
                  id="shop-desc-edit"
                  rows={4}
                  value={shopForm.description}
                  onChange={(event) => setShopForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="shop-image-edit">แบนเนอร์ร้าน (ถ้าต้องการเปลี่ยน)</Label>
                <Input
                  id="shop-image-edit"
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
                พิมพ์ชื่อร้าน <span className="font-semibold text-foreground">{selectedShop?.shopName}</span> เพื่อยืนยันการลบ
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
                <Button
                  variant="destructive"
                  disabled={!selectedShop || deleteShopConfirm.trim() !== selectedShop.shopName}
                  onClick={handleDeleteShop}
                >
                  ลบร้าน
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!deletingBook}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingBook(null);
              setDeleteBookConfirm("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">ยืนยันการลบหนังสือ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                พิมพ์ชื่อหนังสือ <span className="font-semibold text-foreground">{deletingBook?.title}</span> เพื่อยืนยันการลบ
              </p>
              <Input
                value={deleteBookConfirm}
                onChange={(event) => setDeleteBookConfirm(event.target.value)}
                placeholder="พิมพ์ชื่อหนังสือ"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDeletingBook(null); setDeleteBookConfirm(""); }}>
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  disabled={!deletingBook || deleteBookConfirm.trim() !== deletingBook.title}
                  onClick={handleDeleteBook}
                >
                  ลบหนังสือ
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isError && <div className="text-sm text-destructive mt-4">โหลดข้อมูลคลังหนังสือไม่สำเร็จ</div>}
      </div>
      <Footer />
    </div>
  );
};

export default StoreDashboard;
