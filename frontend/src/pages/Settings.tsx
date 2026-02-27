import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleUserRound, Mail, Phone, ShieldCheck, Wallet } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface AuthUser {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: "Customer" | "Admin" | "Banned";
  balance: string;
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const roleLabel: Record<AuthUser["role"], string> = {
  Customer: "ลูกค้า",
  Admin: "ผู้ดูแลร้าน",
  Banned: "ถูกระงับ",
};

const Settings = () => {
  const token = getAuthToken();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["settings-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthUser }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold">การตั้งค่า</h1>

          {!token ? (
            <Card>
              <CardHeader>
                <CardTitle>กรุณาเข้าสู่ระบบ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">คุณต้องเข้าสู่ระบบก่อนเพื่อดูข้อมูลบัญชีและการตั้งค่า</p>
                <Button asChild>
                  <Link to="/auth">ไปหน้าเข้าสู่ระบบ</Link>
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-10 text-muted-foreground">กำลังโหลดข้อมูลการตั้งค่า...</CardContent>
            </Card>
          ) : isError || !user ? (
            <Card>
              <CardContent className="py-10 text-destructive">โหลดข้อมูลการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleUserRound className="h-5 w-5 text-primary" />
                    ข้อมูลบัญชี
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">ชื่อ - นามสกุล</p>
                    <p className="font-medium">{user.firstname} {user.lastname}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Username</p>
                    <p className="font-medium">{user.username}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">อีเมล</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">เบอร์โทร</p>
                      <p className="font-medium">{user.phoneNumber}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    กระเป๋าเงิน
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-sm">ยอดเงินคงเหลือปัจจุบัน</p>
                    <p className="text-2xl font-display font-bold text-primary">
                      ฿{currencyFormatter.format(Number(user.balance) || 0)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel[user.role]}
                  </Badge>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
