import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Calendar, Shield, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockBooks } from "@/lib/mockData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const BookDetail = () => {
  const { id } = useParams();
  const book = mockBooks.find((b) => b.id === id);
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">ไม่พบหนังสือเล่มนี้</p>
            <Button asChild variant="ghost" className="mt-4">
              <Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> กลับไปค้นหา</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
    : 0;
  const totalPrice = days * book.pricePerDay;

  const handleBooking = () => {
    if (!startDate || !endDate) {
      toast({ title: "กรุณาเลือกวันรับ-คืน", variant: "destructive" });
      return;
    }
    toast({
      title: "จองสำเร็จ! 🎉",
      description: `${book.title} — ${days} วัน รวม ฿${totalPrice + book.deposit} (รวมมัดจำ)`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <Button asChild variant="ghost" className="mb-6 text-muted-foreground">
          <Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> กลับ</Link>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="rounded-xl overflow-hidden border bg-muted aspect-[3/4] max-h-[600px]">
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{book.genre}</Badge>
                <Badge className="bg-accent text-accent-foreground border-0">{book.condition}</Badge>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">{book.title}</h1>
              <p className="text-muted-foreground mt-1">โดย {book.author}</p>
              <p className="text-xs text-muted-foreground mt-1">ISBN: {book.isbn}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-accent">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-lg font-bold">{book.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">เช่าแล้ว {book.totalRentals} ครั้ง</span>
            </div>

            <p className="text-foreground/80 leading-relaxed">{book.description}</p>

            {/* Pricing */}
            <div className="bg-card rounded-xl border p-5 space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-primary">฿{book.pricePerDay}</span>
                <span className="text-muted-foreground">/ วัน</span>
              </div>
              <p className="text-sm text-muted-foreground">มัดจำ: ฿{book.deposit} (ได้คืนเมื่อคืนหนังสือ)</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">วันรับหนังสือ</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">วันคืนหนังสือ</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {days > 0 && (
                <div className="bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>ค่าเช่า ({days} วัน)</span><span>฿{totalPrice}</span></div>
                  <div className="flex justify-between"><span>มัดจำ</span><span>฿{book.deposit}</span></div>
                  <div className="flex justify-between font-bold text-primary border-t pt-1 mt-1">
                    <span>รวมทั้งหมด</span><span>฿{totalPrice + book.deposit}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                size="lg"
                disabled={!book.available}
                onClick={handleBooking}
              >
                {book.available ? (
                  <><Calendar className="mr-2 h-4 w-4" /> จองเลย</>
                ) : (
                  "หนังสือถูกเช่าแล้ว"
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              ระบบถ่ายรูปยืนยันสภาพก่อน-หลังเช่า ป้องกันข้อพิพาท
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookDetail;
