import { useMemo, useState } from "react";
import { Clock, Package, BookOpen, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiGet, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  "รอยืนยัน": "bg-warning/20 text-warning border-warning/30",
  "กำลังจัดส่ง": "bg-info/20 text-info border-info/30",
  "กำลังยืม": "bg-primary/20 text-primary border-primary/30",
  "รอคืน": "bg-accent/20 text-accent border-accent/30",
  "คืนแล้ว": "bg-success/20 text-success border-success/30",
  "เลยกำหนด": "bg-destructive/20 text-destructive border-destructive/30",
};

const statusIcons: Record<string, React.ElementType> = {
  "รอยืนยัน": Clock,
  "กำลังจัดส่ง": Package,
  "กำลังยืม": BookOpen,
  "รอคืน": Calendar,
  "คืนแล้ว": CheckCircle,
  "เลยกำหนด": AlertTriangle,
};

const getDaysRemaining = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

interface RentalOrder {
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

interface LibraryBook {
  bookId: number;
  title: string;
  author: string;
  imagePath: string;
}

type LibraryFilter = "all" | "rented" | "not-rented";

const CustomerDashboard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = getAuthToken();
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");

  const { data: orders = [] } = useQuery({
    queryKey: ["my-rentals"],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiGet<{ rentals: RentalOrder[] }>("/api/books/rentals/me", token ?? undefined);
      return response.data.rentals;
    },
  });
  const { data: availableBooks = [] } = useQuery({
    queryKey: ["library-available-books"],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiGet<{ books: LibraryBook[] }>("/api/books?limit=100");
      return response.data.books;
    },
  });

  const activeOrders = orders.filter((o) => !["คืนแล้ว"].includes(o.status));
  const historyOrders = orders.filter((o) => o.status === "คืนแล้ว");
  const libraryBooks = useMemo(() => {
    const rentedByBookId = new Map<number, RentalOrder>();
    for (const order of orders) {
      if (!rentedByBookId.has(order.bookId)) {
        rentedByBookId.set(order.bookId, order);
      }
    }

    const fromAvailable = availableBooks.map((book) => {
      const rentedOrder = rentedByBookId.get(book.bookId);
      return {
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        imagePath: book.imagePath,
        isRented: Boolean(rentedOrder),
        canOpenDetail: true,
      };
    });

    const fromRentedOnly = Array.from(rentedByBookId.values())
      .filter((order) => !availableBooks.some((book) => book.bookId === order.bookId))
      .map((order) => ({
        bookId: order.bookId,
        title: order.bookTitle,
        author: order.bookAuthor,
        imagePath: order.bookCover,
        isRented: true,
        canOpenDetail: true,
      }));

    return [...fromAvailable, ...fromRentedOnly];
  }, [availableBooks, orders]);

  const filteredLibraryBooks = useMemo(() => {
    if (libraryFilter === "rented") {
      return libraryBooks.filter((book) => book.isRented);
    }
    if (libraryFilter === "not-rented") {
      return libraryBooks.filter((book) => !book.isRented);
    }
    return libraryBooks;
  }, [libraryBooks, libraryFilter]);

  const handlePayFine = async (rentalId: number) => {
    if (!token) {
      return;
    }

    try {
      const result = await apiPost<{
        rentalId: number;
        pastDueDays: number;
        fineAmount: number;
        balanceAfter: number;
      }>(`/api/books/rentals/${rentalId}/pay-fine`, {}, token);

      toast({
        title: "ชำระค่าปรับสำเร็จ",
        description: `ยอดค่าปรับ ฿${result.data.fineAmount} • ยอดคงเหลือ ฿${result.data.balanceAfter}`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-rentals"] }),
        queryClient.invalidateQueries({ queryKey: ["auth-me"] }),
      ]);
    } catch (error) {
      toast({
        title: "ชำระค่าปรับไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">แดชบอร์ดของฉัน</h1>
        <p className="text-muted-foreground mb-8">ติดตามสถานะการเช่าและประวัติการใช้งาน</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "กำลังเช่า", value: activeOrders.filter(o => o.status === "กำลังยืม").length, icon: BookOpen, color: "text-primary" },
            { label: "รายการทั้งหมด", value: orders.length, icon: Clock, color: "text-warning" },
            { label: "เลยกำหนด", value: activeOrders.filter(o => o.status === "เลยกำหนด").length, icon: AlertTriangle, color: "text-destructive" },
            { label: "คืนแล้ว", value: historyOrders.length, icon: CheckCircle, color: "text-success" },
          ].map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </div>
              <span className="text-2xl font-display font-bold">{card.value}</span>
            </div>
          ))}
        </div>

        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active">คำสั่งเช่าปัจจุบัน ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="history">ประวัติ ({historyOrders.length})</TabsTrigger>
            <TabsTrigger value="library">คลังหนังสือ ({libraryBooks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.map((order) => {
              const Icon = statusIcons[order.status];
              const daysLeft = getDaysRemaining(order.endDate);
              return (
                <div key={order.rentalId} className="bg-card rounded-xl border p-4 md:p-6 flex flex-col md:flex-row gap-4">
                  <img src={resolveImageUrl(order.bookCover)} alt={order.bookTitle} className="w-20 h-28 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-semibold text-lg">{order.bookTitle}</h3>
                        <p className="text-xs text-muted-foreground">RENT-{order.rentalId}</p>
                      </div>
                      <Badge className={`${statusColors[order.status]} border`}>
                        <Icon className="h-3 w-3 mr-1" /> {order.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>รับ: {new Date(order.startDate).toLocaleDateString()}</span>
                      <span>คืน: {new Date(order.endDate).toLocaleDateString()}</span>
                      <span className="font-semibold text-foreground">฿{order.totalPrice}</span>
                    </div>
                    {order.status === "กำลังยืม" && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">เหลือเวลาอีก</span>
                          <span className={daysLeft <= 2 ? "text-destructive font-semibold" : "text-primary font-semibold"}>
                            {daysLeft > 0 ? `${daysLeft} วัน` : "เลยกำหนดแล้ว!"}
                          </span>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, (1 - daysLeft / 7) * 100))} className="h-2" />
                      </div>
                    )}
                    {order.status === "เลยกำหนด" && (
                      <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                        <span className="text-destructive font-semibold">ค่าปรับ: ฿{order.fineAmountDue}</span>
                        <span className="text-muted-foreground ml-2">(เลยกำหนด {order.pastDueDays} วัน)</span>
                        {order.finePaidAt ? (
                          <span className="ml-2 text-success">ชำระแล้ว</span>
                        ) : (
                          <Button
                            size="sm"
                            className="ml-3"
                            onClick={() => { void handlePayFine(order.rentalId); }}
                          >
                            ชำระค่าปรับ
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyOrders.map((order) => (
              <div key={order.rentalId} className="bg-card rounded-xl border p-4 md:p-6 flex flex-col md:flex-row gap-4 opacity-80">
                <img src={resolveImageUrl(order.bookCover)} alt={order.bookTitle} className="w-20 h-28 rounded-lg object-cover shrink-0" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold">{order.bookTitle}</h3>
                      <p className="text-xs text-muted-foreground">RENT-{order.rentalId}</p>
                    </div>
                    <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> คืนแล้ว</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                    <span>{new Date(order.startDate).toLocaleDateString()} — {new Date(order.endDate).toLocaleDateString()}</span>
                    <span>฿{order.totalPrice}</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">เช่าอีกครั้ง</Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <div className="flex justify-end">
              <Select value={libraryFilter} onValueChange={(value) => setLibraryFilter(value as LibraryFilter)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="กรองหนังสือ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                  <SelectItem value="rented">ถูกยืมแล้ว</SelectItem>
                  <SelectItem value="not-rented">ยังไม่ถูกยืม</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredLibraryBooks.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                ไม่พบหนังสือตามตัวกรองที่เลือก
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredLibraryBooks.map((book) => (
                  <div
                    key={book.bookId}
                    className={`rounded-xl overflow-hidden border bg-card transition-all duration-300 ${book.canOpenDetail ? "hover:shadow-lg hover:-translate-y-1" : "opacity-90"}`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={resolveImageUrl(book.imagePath)}
                        alt={book.title}
                        className={`w-full h-full object-cover ${book.canOpenDetail ? "transition-transform duration-500 hover:scale-105" : ""}`}
                        loading="lazy"
                      />
                      {book.isRented && (
                        <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground border-0">
                          ยืมแล้ว
                        </Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold line-clamp-1">{book.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                      {book.canOpenDetail ? (
                        <Link to={`/book/${book.bookId}`} className="mt-2 inline-block text-sm text-primary underline underline-offset-2">
                          ดูรายละเอียด
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default CustomerDashboard;
