import { useMemo, useState } from "react";
import {
  BookOpen, Package, DollarSign, AlertTriangle, Plus, Edit, Trash2,
  TrendingUp, BarChart3, Users, Search, Store,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockOrders, genres } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface ApiBook {
  bookId: number;
  title: string;
  imagePath: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  bookCondition: string | null;
  bookPrice: string;
  status: "Available" | "Rented";
}

const paymentStatusColors: Record<string, string> = {
  "รอชำระ": "bg-warning/20 text-warning",
  "ชำระแล้ว": "bg-success/20 text-success",
  "ยกเลิก": "bg-destructive/20 text-destructive",
};

const AdminDashboard = () => {
  const token = getAuthToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookSearch, setBookSearch] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    genre: "",
    bookPrice: "",
    bookCondition: "3",
    description: "",
  });

  const { data: books = [], isError } = useQuery({
    queryKey: ["admin-books"],
    queryFn: async () => {
      const result = await apiGet<{ books: ApiBook[] }>("/api/books?limit=100");
      return result.data.books;
    },
  });

  const totalRevenue = mockOrders.filter(o => o.paymentStatus === "ชำระแล้ว").reduce((s, o) => s + o.totalPrice, 0);
  const totalPenalty = mockOrders.reduce((s, o) => s + o.penalty, 0);
  const activeRentals = mockOrders.filter(o => !["คืนแล้ว", "ยกเลิก"].includes(o.status)).length;
  const overdueCount = mockOrders.filter(o => o.status === "เลยกำหนด").length;

  const filteredBooks = useMemo(() => books.filter((b) =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.author.toLowerCase().includes(bookSearch.toLowerCase()),
  ), [books, bookSearch]);

  const handleCreateBook = async () => {
    const token = getAuthToken();
    if (!token) {
      toast({ title: "กรุณา login ก่อนลงหนังสือ", variant: "destructive" });
      return;
    }

    try {
      if (!imageFile) {
        toast({ title: "กรุณาเลือกรูปปกหนังสือ", variant: "destructive" });
        return;
      }

      const imageBase64 = await new Promise<string>((resolve, reject) => {
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
      });

      await apiPost("/api/books", {
        ...form,
        bookPrice: Number(form.bookPrice),
        imageBase64,
      }, token);
      toast({ title: "เพิ่มหนังสือสำเร็จ! 📚" });
      setForm({ title: "", author: "", isbn: "", genre: "", bookPrice: "", bookCondition: "3", description: "" });
      setImageFile(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-books"] });
    } catch (error) {
      toast({
        title: "เพิ่มหนังสือไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">แดชบอร์ดร้าน</h1>
            <p className="text-muted-foreground mt-1">จัดการคลัง คำสั่งเช่า และรายได้</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> เพิ่มหนังสือ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">เพิ่มหนังสือใหม่</DialogTitle>
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
                <p className="text-xs text-muted-foreground">ระบบจะคำนวณอัตโนมัติ: มัดจำ 50% | เช่า 15 วัน 30% | เช่า 30 วัน 50%</p>
                <div><Label>รายละเอียด</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreateBook}>บันทึก</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
          <TabsList className="mb-6">
            <TabsTrigger value="inventory"><BookOpen className="h-4 w-4 mr-1" /> คลังหนังสือ</TabsTrigger>
            <TabsTrigger value="orders"><Package className="h-4 w-4 mr-1" /> คำสั่งเช่า</TabsTrigger>
            <TabsTrigger value="revenue"><BarChart3 className="h-4 w-4 mr-1" /> รายงาน</TabsTrigger>
            <TabsTrigger value="payments"><DollarSign className="h-4 w-4 mr-1" /> การชำระเงิน</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <div className="bg-card rounded-xl border p-4 md:p-6">
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="ค้นหาชื่อหนังสือ/ผู้เขียน" value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />
              </div>
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <div key={book.bookId} className="flex items-center gap-4 rounded-lg border p-3">
                    <img src={resolveImageUrl(book.imagePath)} alt={book.title} className="w-14 h-20 rounded object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                      <p className="text-xs text-muted-foreground">ราคาหนังสือ ฿{book.bookPrice}</p>
                    </div>
                    <Badge variant={book.status === 'Available' ? 'default' : 'secondary'}>{book.status}</Badge>
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
                  {mockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="text-sm">{order.renterName}</TableCell>
                      <TableCell className="font-semibold">฿{order.totalPrice}</TableCell>
                      <TableCell className={order.penalty > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>{order.penalty > 0 ? `฿${order.penalty}` : "—"}</TableCell>
                      <TableCell className="font-bold">฿{order.totalPrice + order.penalty}</TableCell>
                      <TableCell><Badge className={`${paymentStatusColors[order.paymentStatus]} border-0`}>{order.paymentStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {isError && <div className="text-sm text-destructive mt-4">โหลดข้อมูลคลังหนังสือไม่สำเร็จ</div>}
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
