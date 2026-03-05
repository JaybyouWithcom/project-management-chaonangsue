import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Calendar, Shield, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { normalizeConditionLabel } from "@/lib/bookCondition";

type Plan = "15days" | "30days";

interface BookDetailData {
  bookId: number;
  ownerId: number;
  shopId: number | null;
  shopName: string | null;
  imagePath: string;
  title: string;
  genre: string | null;
  bookCondition: string | null;
  author: string;
  isbn: string | null;
  description: string | null;
  bookPrice: string;
  status: "Available" | "Rented";
  ownerName: string;
}

interface QuoteData {
  rentalPlan: Plan;
  dueDate: string;
  rentalPrice: number;
  depositPrice: number;
  totalAmount: number;
}

const planLabels: Record<Plan, string> = {
  "15days": "15 วัน",
  "30days": "30 วัน",
};

// เพิ่มฟังก์ชันสำหรับแปลงรูปแบบวันที่เป็นแบบไทย
const formatThaiDate = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    }).format(date);
  } catch (error) {
    return dateString; // ถ้าแปลงไม่สำเร็จให้คืนค่าเดิมกลับไป
  }
};

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["book", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiGet<{ book: BookDetailData }>(`/api/books/${id}`);
      return response.data.book;
    },
  });

  const quoteQuery = useQuery({
    queryKey: ["book-quote", id, selectedPlan],
    enabled: Boolean(id && selectedPlan),
    queryFn: async () => {
      const response = await apiGet<QuoteData>(`/api/books/${id}/quote?plan=${selectedPlan}`);
      return response.data;
    },
  });

  const meQuery = useQuery({
    queryKey: ["book-detail-me"],
    enabled: Boolean(getAuthToken()),
    retry: false,
    queryFn: async () => {
      const token = getAuthToken();
      const response = await apiGet<{ user: { userId: number } }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const handleBooking = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      toast({ title: "กรุณา login ก่อนเช่าหนังสือ" });
      navigate('/auth');
      return;
    }

    if (!selectedPlan || !quoteQuery.data) {
      toast({ title: "กรุณาเลือกแผนการเช่า", variant: "destructive" });
      return;
    }
    if (detailQuery.data && meQuery.data?.userId === detailQuery.data.ownerId) {
      toast({ title: "ไม่สามารถเช่าหนังสือของร้านตัวเองได้", variant: "destructive" });
      return;
    }
    if (!id) {
      toast({ title: "ไม่พบรหัสหนังสือ", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost<{
        bookId: number;
        rentalPlan: Plan;
        dueDate: string;
        totalAmount: number;
        balanceAfter: number;
      }>(
        `/api/books/${id}/rent`,
        { plan: selectedPlan },
        token,
      );

      toast({
        title: "เช่าหนังสือสำเร็จ",
        description: `ยอดตัด ฿${result.data.totalAmount} • ยอดคงเหลือ ฿${result.data.balanceAfter}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-transactions", token] });
      navigate("/browse");
    } catch (error) {
      toast({
        title: "เช่าไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (detailQuery.isLoading) {
    return <div className="min-h-screen"><Navbar /><div className="container mx-auto px-4 py-10">กำลังโหลด...</div></div>;
  }

  if (detailQuery.error || !detailQuery.data) {
    const message = detailQuery.error instanceof HttpError ? detailQuery.error.message : "ไม่พบหนังสือเล่มนี้";
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">{message}</p>
            <Button asChild variant="ghost" className="mt-4">
              <Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> กลับไปค้นหา</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const book = detailQuery.data;
  const isOwnBook = Boolean(meQuery.data?.userId && meQuery.data.userId === book.ownerId);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <Button asChild variant="ghost" className="mb-6 text-muted-foreground">
          <Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> กลับ</Link>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="rounded-xl overflow-hidden border bg-muted aspect-[3/4] max-h-[600px]">
            <img src={resolveImageUrl(book.imagePath)} alt={book.title} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{book.genre ?? 'อื่นๆ'}</Badge>
                <Badge className="bg-accent text-accent-foreground border-0">{normalizeConditionLabel(book.bookCondition)}</Badge>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">{book.title}</h1>
              <p className="text-muted-foreground mt-1">
                ผู้เขียน {book.author} • ร้าน{" "}
                {book.shopId && book.shopName ? (
                  <Link to={`/shop/${book.shopId}`} className="underline underline-offset-2 hover:text-primary">
                    {book.shopName}
                  </Link>
                ) : (
                  book.ownerName
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ISBN: {book.isbn ?? '-'}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-accent">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-lg font-bold">4.5</span>
              </div>
              <span className="text-sm text-muted-foreground">สถานะ: {book.status === 'Available' ? 'พร้อมให้เช่า' : 'ไม่พร้อม'}</span>
            </div>

            <p className="text-foreground/80 leading-relaxed">{book.description ?? 'ไม่มีคำอธิบายเพิ่มเติม'}</p>

            <div className={`bg-card rounded-xl border p-5 space-y-5 ${isOwnBook ? "opacity-60" : ""}`}>
              <div>
                <h3 className="text-lg font-bold mb-1">เลือกแผนการเช่า</h3>
                <p className="text-sm text-muted-foreground">ราคาหนังสือ: ฿{book.bookPrice}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["15days", "30days"] as Plan[]).map((plan) => (
                  <Button
                    key={plan}
                    variant={selectedPlan === plan ? "default" : "outline"}
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isOwnBook || book.status !== "Available"}
                    className="h-auto py-4 flex flex-col items-center"
                  >
                    <span className="font-semibold">{planLabels[plan]}</span>
                    <span className="text-xs mt-1 opacity-80">คำนวณตามอัตรา</span>
                  </Button>
                ))}
              </div>

              {quoteQuery.data && selectedPlan && (
                <div className="space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">ค่าเช่า ({planLabels[selectedPlan]})</span><span>฿{quoteQuery.data.rentalPrice}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ค่ามัดจำ</span><span>฿{quoteQuery.data.depositPrice}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">กำหนดคืน</span><span>{formatThaiDate(quoteQuery.data.dueDate)}</span></div>
                  <div className="flex justify-between text-base font-bold border-t pt-2"><span>รวมที่ต้องชำระ</span><span className="text-primary">฿{quoteQuery.data.totalAmount}</span></div>
                </div>
              )}

              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={() => { void handleBooking(); }}
                disabled={!book.status || book.status !== 'Available' || submitting || isOwnBook}
              >
                {submitting ? "กำลังทำรายการ..." : "จองและชำระเงิน"}
              </Button>
              {isOwnBook && (
                <p className="text-sm text-center text-muted-foreground">
                  นี่คือหนังสือของร้านคุณเอง จึงไม่สามารถเช่าได้
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center">* ดูหนังสือได้โดยไม่ต้อง login แต่ต้อง login ก่อนทำรายการเช่า</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /> จัดส่งภายใน 1-2 วัน</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /> ระบบมัดจำปลอดภัย</div>
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> ยืนยันสภาพก่อน-หลังเช่า</div>
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> คืนง่าย มีแจ้งเตือน</div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookDetail;
