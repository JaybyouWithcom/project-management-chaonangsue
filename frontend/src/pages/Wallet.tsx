import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Wallet as WalletIcon, 
  PlusCircle, 
  History, 
  CreditCard,
  Ticket, // เพิ่มไอคอน Ticket สำหรับคูปอง
  HelpCircle // เพิ่มไอคอนช่วยเหลือ
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface AuthUser {
  userId: number;
  balance: string;
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const WalletPage = () => {
  const token = getAuthToken();
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["wallet-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthUser }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const balance = Number(user?.balance);
  const balanceLabel = Number.isFinite(balance) ? currencyFormatter.format(balance) : "0.00";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 text-center md:text-left">วอลเล็ตของฉัน</h1>
            <p className="text-muted-foreground text-center md:text-left">จัดการยอดเงินและตรวจสอบความเคลื่อนไหว</p>
          </div>

          {!token ? (
            <Card className="border-dashed py-12 text-center">
              <CardContent className="space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary">
                  <WalletIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">เข้าสู่ระบบเพื่อใช้งานวอลเล็ต</h3>
                <Button asChild size="lg" className="px-8 mt-4"><Link to="/auth">เข้าสู่ระบบ</Link></Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="h-64 w-full bg-slate-200 animate-pulse rounded-[2rem]" />
          ) : (
            <div className="space-y-6">
              {/* Virtual Card */}
              <section className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-700 transition-all group-hover:scale-105 duration-500" />
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <WalletIcon className="w-40 h-40" />
                </div>
                
                <Card className="relative bg-transparent border-none text-white shadow-2xl shadow-primary/20 min-h-[220px] flex flex-col justify-between p-8 rounded-[2rem]">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-blue-100 text-sm font-medium tracking-wider uppercase opacity-80">ยอดเงินคงเหลือปัจจุบัน</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-light text-blue-200">฿</span>
                        <h2 className="text-5xl font-display font-bold tracking-tight">{balanceLabel}</h2>
                      </div>
                    </div>
                    <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t border-white/10 mt-6">
                    <div className="text-xs text-blue-200/80">
                      <p>ChaoNangsue Wallet</p>
                      <p className="font-mono mt-0.5">ID: {user?.userId.toString().padStart(6, '0')}</p>
                    </div>
                    <div className="text-sm font-semibold tracking-widest opacity-40 italic">ChaoNangsue</div>
                  </div>
                </Card>
              </section>

              {/* Action Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* ปุ่มหลัก: เติมเงิน (สีเขียว) */}
                <Button 
                  asChild 
                  variant="outline" 
                  className="h-28 rounded-2xl bg-white hover:bg-slate-50 border-slate-200 flex-col gap-2 shadow-sm transition-all hover:shadow-md hover:border-green-200 active:scale-95"
                >
                  <Link to="/wallet/topup">
                    <div className="p-2.5 bg-green-100 text-green-600 rounded-xl">
                      <PlusCircle className="h-7 w-7" />
                    </div>
                    <span className="font-bold text-slate-700">เติมเงิน</span>
                  </Link>
                </Button>
                
                {/* ปุ่มใหม่: แลกโค้ด/คูปอง (สีน้ำเงิน) */}
                <Button 
                  asChild
                  variant="outline" 
                  className="h-28 rounded-2xl bg-white hover:bg-slate-50 border-slate-200 flex-col gap-2 shadow-sm transition-all hover:shadow-md hover:border-blue-200 active:scale-95"
                >
                  <Link to="/wallet"> {/* หรือลิงก์ไปหน้าแลกโค้ดที่คุณมี */}
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                      <Ticket className="h-7 w-7" />
                    </div>
                    <span className="font-bold text-slate-700">แลกโค้ด / คูปอง</span>
                  </Link>
                </Button>
              </div>

              {/* Recent Transactions Table */}
              <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-white px-6">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <History className="h-5 w-5 text-primary" />
                    รายการล่าสุด
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                  <div className="py-12 text-center space-y-2">
                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <History className="h-6 w-6" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">ยังไม่มีความเคลื่อนไหว</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Info & Support Box */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex gap-4 items-start">
             <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
               <HelpCircle className="h-6 w-6" />
             </div>
             <div className="space-y-1">
               <p className="text-blue-900 font-bold text-sm">มีปัญหาเกี่ยวกับการเติมเงิน?</p>
               <p className="text-blue-800 text-xs md:text-sm leading-relaxed">
                 หากคุณพบปัญหาในการเติมเงิน หรือไม่ได้รับเงินมัดจำคืนตามกำหนด สามารถติดต่อสอบถามได้ที่เมนูช่วยเหลือหรือ Line: @chaonangsue
               </p>
             </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletPage;