import { Link } from "react-router-dom";
import { Search, BookOpen, CreditCard, Truck, ArrowRight, Star, Shield, Leaf } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-books.jpg";
import { apiGet } from "@/lib/api";
import { type ApiBook, toUiBook } from "@/lib/books";

const steps = [
  { icon: Search, title: "ค้นหาหนังสือ", desc: "เลือกหนังสือที่ชอบจากคลังกว่า 1,000 เล่ม" },
  { icon: BookOpen, title: "เลือกแผนการเช่า", desc: "15 วัน หรือ 30 วัน ตามความสะดวก" },
  { icon: CreditCard, title: "ชำระเงินง่ายๆ", desc: "QR PromptPay, บัตรเครดิต หรือ e-Wallet" },
  { icon: Truck, title: "รับหนังสือถึงมือ", desc: "จัดส่งถึงบ้าน พร้อมติดตามสถานะ" },
];

const stats = [
  { value: "1,200+", label: "เล่มในระบบ" },
  { value: "5,000+", label: "ผู้ใช้งาน" },
  { value: "15,000+", label: "ครั้งที่ถูกเช่า" },
  { value: "4.8", label: "คะแนนเฉลี่ย" },
];

const Index = () => {
  const { data: featuredBooks = [], isLoading, isError } = useQuery({
    queryKey: ["featured-books"],
    queryFn: async () => {
      const response = await apiGet<{ books: ApiBook[] }>("/api/books?limit=4");
      return response.data.books.map(toUiBook);
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Book reading nook" className="w-full h-full object-cover" />
          {/* ปรับ Gradient ให้คลุมเท่าๆ กันเพื่อให้ข้อความตรงกลางอ่านง่ายขึ้น */}
          <div className="absolute inset-0 bg-primary/70 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/50 to-primary/90" />
        </div>
        {/* จัดให้อยู่กึ่งกลางด้วย flex, items-center และ text-center */}
        <div className="relative container mx-auto px-4 py-24 md:py-36 flex flex-col items-center text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground leading-tight animate-fade-up">
              เช่าหนังสือออนไลน์
              <span className="block text-gradient-gold mt-2">ประหยัด คุ้มค่า ปลอดภัย</span>
            </h1>
            <p className="mt-6 mx-auto text-lg text-primary-foreground/80 max-w-lg leading-relaxed">
              อ่านหนังสือดีๆ ในราคาเช่าเริ่มต้นเพียง ฿10/วัน ส่งถึงบ้าน พร้อมระบบติดตามและคืนง่ายๆ
            </p>
            {/* ใช้ justify-center เพื่อให้ปุ่มอยู่ตรงกลาง */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8">
                <Link to="/browse">
                  เริ่มค้นหาหนังสือ <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">ขั้นตอนง่ายๆ</h2>
            <p className="text-muted-foreground mt-3">เช่าหนังสือได้ใน 4 ขั้นตอน</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="relative bg-card rounded-xl border p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="absolute top-4 left-4 w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <h3 className="font-display font-semibold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold">หนังสือแนะนำ</h2>
            <Button asChild variant="ghost" className="text-primary font-semibold">
              <Link to="/browse">ดูทั้งหมด <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          {isLoading ? (
            <p className="text-muted-foreground">กำลังโหลดหนังสือแนะนำ...</p>
          ) : isError ? (
            <p className="text-destructive">โหลดข้อมูลหนังสือแนะนำไม่สำเร็จ</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* USP */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "ปลอดภัย มั่นใจ", desc: "ระบบ E-KYC ยืนยันตัวตน ถ่ายรูปสภาพหนังสือก่อน-หลัง ป้องกันข้อพิพาท" },
              { icon: Star, title: "คุณภาพคัดสรร", desc: "หนังสือทุกเล่มผ่านการตรวจสอบสภาพ พร้อมรีวิวจากผู้เช่าจริง" },
              { icon: Leaf, title: "รักษ์สิ่งแวดล้อม", desc: "ลดการผลิตกระดาษ หมุนเวียนทรัพยากร สนับสนุน Sharing Economy" },
            ].map((usp) => (
              <div key={usp.title} className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <usp.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg">{usp.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{usp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-b">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-display font-bold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
