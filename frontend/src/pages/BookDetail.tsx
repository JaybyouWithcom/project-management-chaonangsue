import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Calendar, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockBooks } from "@/lib/mockData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// กำหนด Interface สำหรับข้อมูลหนังสือ (หากมี Interface นี้ใน mockData อยู่แล้ว สามารถ import มาใช้แทนได้)
export interface Book {
  id: string;
  cover: string;
  title: string;
  genre: string;
  condition: string;
  author: string;
  isbn: string;
  rating: number;
  totalRentals: number;
  description: string;
  deposit: number;
  available: boolean;
}

const BookDetail = () => {
  // กำหนด Type ให้พารามิเตอร์ที่ได้จาก URL
  const { id } = useParams<{ id: string }>();
  
  // ค้นหาหนังสือและระบุ Type
  const book = mockBooks.find((b: Book) => b.id === id) as Book | undefined;
  
  const { toast } = useToast();
  
  // กำหนด Type ของ State ให้รับค่าแค่ 15, 30 หรือ null เท่านั้น
  const [selectedPlan, setSelectedPlan] = useState<15 | 30 | null>(null);

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

  // ระบุ Type ของพารามิเตอร์และค่า Return ของฟังก์ชัน
  const calculateRent = (days: 15 | 30): number => {
    if (days === 15) return (book.deposit * 2) * 0.3;
    if (days === 30) return book.deposit;
    return 0;
  };

  const rentPrice: number = selectedPlan ? calculateRent(selectedPlan) : 0;
  const totalPrice: number = rentPrice + book.deposit;

  const handleBooking = (): void => {
    if (!selectedPlan) {
      toast({ title: "กรุณาเลือกแผนการเช่า", variant: "destructive" });
      return;
    }
    toast({
      title: "จองสำเร็จ! 🎉",
      description: `${book.title} — เช่า ${selectedPlan} วัน รวม ฿${totalPrice} (รวมมัดจำแล้ว)`,
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

            {/* Pricing & Plan Selection */}
            <div className="bg-card rounded-xl border p-5 space-y-5">
              
              <div>
                <h3 className="text-lg font-bold mb-1">เลือกแผนการเช่า</h3>
                <p className="text-sm text-muted-foreground">
                  ค่ามัดจำ: ฿{book.deposit} <span className="text-xs">(ได้รับคืนเมื่อส่งคืนหนังสือในสภาพเดิม)</span>
                </p>
              </div>

              {/* Plan Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* 15 Days Card */}
                <div 
                  onClick={() => setSelectedPlan(15)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 15 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {selectedPlan === 15 && (
                    <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                  )}
                  <h4 className="font-bold text-lg mb-1">15 วัน</h4>
                  <p className="text-sm text-muted-foreground">
                    ค่าเช่า ฿{calculateRent(15)}
                  </p>
                </div>

                {/* 30 Days Card */}
                <div 
                  onClick={() => setSelectedPlan(30)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPlan === 30 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {selectedPlan === 30 && (
                    <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                  )}
                  <h4 className="font-bold text-lg mb-1">30 วัน</h4>
                  <p className="text-sm text-muted-foreground">
                    ค่าเช่า ฿{calculateRent(30)}
                  </p>
                </div>
              </div>

              {/* Summary */}
              {selectedPlan && (
                <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ค่าเช่า ({selectedPlan} วัน)</span>
                    <span>฿{rentPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">มัดจำ</span>
                    <span>฿{book.deposit}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span>ยอดชำระสุทธิ</span>
                    <span className="text-primary">฿{totalPrice}</span>
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