import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet as WalletIcon, PlusCircle } from "lucide-react";

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
  minimumFractionDigits: 0,
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
  const balanceLabel = Number.isFinite(balance) ? `฿${currencyFormatter.format(balance)}` : "฿-";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold">วอลเล็ตของฉัน</h1>

          {!token ? (
            <Card>
              <CardHeader>
                <CardTitle>กรุณาเข้าสู่ระบบ</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/auth">ไปหน้าเข้าสู่ระบบ</Link>
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-10 text-muted-foreground">กำลังโหลดข้อมูลวอลเล็ต...</CardContent>
            </Card>
          ) : isError || !user ? (
            <Card>
              <CardContent className="py-10 text-destructive">โหลดข้อมูลวอลเล็ตไม่สำเร็จ</CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลวอลเล็ต</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <WalletIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ยอดเงินคงเหลือ</p>
                    <p className="text-2xl font-display font-bold text-primary">{balanceLabel}</p>
                  </div>
                </div>
                <Button className="shrink-0">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  เติมเงิน
                </Button>
              </CardContent>
            </Card>
          )}

          <p className="text-muted-foreground text-sm">
            เติมวอลเล็ตได้หลากหลายช่องทางวันนี้ พร้อมเช่าหนังสือเล่มโปรดได้ทันทีทุกเวลา
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WalletPage;
