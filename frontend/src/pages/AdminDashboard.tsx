import { useState } from "react";
import {
  BookOpen, Package, DollarSign, AlertTriangle, Plus, Edit, Trash2,
  TrendingUp, BarChart3, Users, Search
} from "lucide-react";
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
import { mockBooks, mockOrders, genres } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

const paymentStatusColors: Record<string, string> = {
  "รอชำระ": "bg-warning/20 text-warning",
  "ชำระแล้ว": "bg-success/20 text-success",
  "ยกเลิก": "bg-destructive/20 text-destructive",
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [bookSearch, setBookSearch] = useState("");

  const totalRevenue = mockOrders.filter(o => o.paymentStatus === "ชำระแล้ว").reduce((s, o) => s + o.totalPrice, 0);
  const totalPenalty = mockOrders.reduce((s, o) => s + o.penalty, 0);
  const activeRentals = mockOrders.filter(o => !["คืนแล้ว", "ยกเลิก"].includes(o.status)).length;
  const overdueCount = mockOrders.filter(o => o.status === "เลยกำหนด").length;

  const filteredBooks = mockBooks.filter(b =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.author.toLowerCase().includes(bookSearch.toLowerCase())
  );

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
                <div><Label>ชื่อหนังสือ</Label><Input placeholder="ชื่อหนังสือ" /></div>
                <div><Label>ผู้เขียน</Label><Input placeholder="ผู้เขียน" /></div>
                <div><Label>ISBN</Label><Input placeholder="978-xxx-xxx" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>หมวดหมู่</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
                      <SelectContent>
                        {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>ราคาเช่า/วัน</Label><Input type="number" placeholder="0" /></div>
                </div>
                <div><Label>มัดจำ</Label><Input type="number" placeholder="0" /></div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => toast({ title: "เพิ่มหนังสือสำเร็จ! 📚" })}>
                  บันทึก
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "รายได้รวม", value: `฿${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-primary", sub: "เดือนนี้" },
            { label: "ค่าปรับรวม", value: `฿${totalPenalty.toLocaleString()}`, icon: AlertTriangle, color: "text-destructive", sub: `${overdueCount} รายการเลยกำหนด` },
            { label: "กำลังเช่า", value: activeRentals, icon: Package, color: "text-info", sub: "รายการ" },
            { label: "หนังสือในระบบ", value: mockBooks.length, icon: BookOpen, color: "text-accent", sub: `${mockBooks.filter(b => b.available).length} ว่างอยู่` },
          ].map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-display font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
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

          {/* Inventory */}
          <TabsContent value="inventory">
            <div className="bg-card rounded-xl border">
              <div className="p-4 border-b">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="ค้นหาหนังสือ..." className="pl-10" value={bookSearch} onChange={e => setBookSearch(e.target.value)} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>หนังสือ</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>สภาพ</TableHead>
                      <TableHead>ราคา/วัน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>เช่าแล้ว</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooks.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img src={book.cover} alt={book.title} className="w-10 h-14 rounded object-cover" />
                            <div>
                              <div className="font-medium text-sm">{book.title}</div>
                              <div className="text-xs text-muted-foreground">{book.author}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{book.genre}</Badge></TableCell>
                        <TableCell className="text-sm">{book.condition}</TableCell>
                        <TableCell className="font-semibold">฿{book.pricePerDay}</TableCell>
                        <TableCell>
                          <Badge className={book.available ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
                            {book.available ? "ว่าง" : "ถูกเช่า"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{book.totalRentals} ครั้ง</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <div className="bg-card rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>หนังสือ</TableHead>
                    <TableHead>ผู้เช่า</TableHead>
                    <TableHead>วันรับ-คืน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ค่าเช่า</TableHead>
                    <TableHead>ค่าปรับ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="font-medium text-sm">{order.bookTitle}</TableCell>
                      <TableCell className="text-sm">{order.renterName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{order.startDate} → {order.endDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{order.status}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">฿{order.totalPrice}</TableCell>
                      <TableCell className={order.penalty > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {order.penalty > 0 ? `฿${order.penalty}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> สรุปรายได้
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-muted-foreground">รายได้จากค่าเช่า</span>
                    <span className="font-bold text-lg">฿{totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-muted-foreground">รายได้จากค่าปรับ</span>
                    <span className="font-bold text-lg text-destructive">฿{totalPenalty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-semibold">รวมทั้งหมด</span>
                    <span className="font-bold text-2xl text-primary">฿{(totalRevenue + totalPenalty).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" /> หนังสือยอดนิยม
                </h3>
                <div className="space-y-3">
                  {[...mockBooks].sort((a, b) => b.totalRentals - a.totalRentals).slice(0, 5).map((book, i) => (
                    <div key={book.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <img src={book.cover} alt={book.title} className="w-8 h-11 rounded object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.totalRentals} ครั้ง</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">฿{book.totalRentals * book.pricePerDay * 5}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border p-6 md:col-span-2">
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-info" /> สถิติผู้ใช้งาน
                </h3>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-display font-bold text-primary">5,234</div>
                    <div className="text-sm text-muted-foreground">ผู้ใช้ทั้งหมด</div>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-bold text-accent">1,892</div>
                    <div className="text-sm text-muted-foreground">ผู้ใช้งานเดือนนี้</div>
                  </div>
                  <div>
                    <div className="text-3xl font-display font-bold text-info">312</div>
                    <div className="text-sm text-muted-foreground">ผู้ใช้ใหม่</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <div className="bg-card rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสคำสั่ง</TableHead>
                    <TableHead>ผู้เช่า</TableHead>
                    <TableHead>ค่าเช่า</TableHead>
                    <TableHead>ค่าปรับ</TableHead>
                    <TableHead>รวม</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell className="text-sm">{order.renterName}</TableCell>
                      <TableCell className="font-semibold">฿{order.totalPrice}</TableCell>
                      <TableCell className={order.penalty > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        {order.penalty > 0 ? `฿${order.penalty}` : "—"}
                      </TableCell>
                      <TableCell className="font-bold">฿{order.totalPrice + order.penalty}</TableCell>
                      <TableCell>
                        <Badge className={`${paymentStatusColors[order.paymentStatus]} border-0`}>
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
