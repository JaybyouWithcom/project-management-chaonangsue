import { Link } from "react-router-dom";
import { Search, BookOpen, CreditCard, Truck, ArrowRight, Star, Shield, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockBooks } from "@/lib/mockData";
import BookCard from "@/components/BookCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-books.jpg";

const steps = [
  { icon: Search, title: "ค้นหาหนังสือ", desc: "เลือกหนังสือที่ชอบจากคลังกว่า 1,000 เล่ม" },
  { icon: BookOpen, title: "จองและกำหนดวัน", desc: "เลือกวันรับ-คืน ตามความสะดวก" },
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
  const featuredBooks = mockBooks.filter((b) => b.available).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Book reading nook" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground leading-tight animate-fade-up">
              เช่าหนังสือออนไลน์
              <span className="block text-gradient-gold mt-2">ประหยัด คุ้มค่า ใส่ใจโลก</span>
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/80 max-w-lg leading-relaxed">
              อ่านหนังสือดีๆ ในราคาเช่าเริ่มต้นเพียง ฿10/วัน ส่งถึงบ้าน พร้อมระบบติดตามและคืนง่ายๆ
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8">
                <Link to="/browse">
                  เริ่มค้นหาหนังสือ <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base">
                <Link to="/admin">สำหรับร้านค้า</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-b">
        <div className="container mx-auto px-4 py-8">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
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

      <Footer />
    </div>
  );
};

export default Index;
