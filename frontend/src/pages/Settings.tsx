import { Link } from "react-router-dom";
import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound, Mail, Phone, ShieldCheck, Wallet } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPatch, HttpError } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface AuthUser {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string | null;
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    phoneNumber: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["settings-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthUser }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      firstname: user.firstname,
      lastname: user.lastname,
      phoneNumber: user.phoneNumber ?? "",
    });
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSaving(true);
    try {
      await apiPatch<{ user: AuthUser }>(
        "/api/auth/me",
        {
          firstname: form.firstname,
          lastname: form.lastname,
          phoneNumber: form.phoneNumber.trim() ? form.phoneNumber : undefined,
        },
        token,
      );
      await queryClient.invalidateQueries({ queryKey: ["settings-me", token] });
      toast({ title: "บันทึกข้อมูลสำเร็จ" });
    } catch (error) {
      toast({
        title: "บันทึกข้อมูลไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
                <CardContent className="space-y-4">
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" onSubmit={(event) => { void handleSubmit(event); }}>
                    <div>
                      <Label htmlFor="firstname">ชื่อ</Label>
                      <Input
                        id="firstname"
                        value={form.firstname}
                        onChange={(event) => setForm((prev) => ({ ...prev, firstname: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastname">นามสกุล</Label>
                      <Input
                        id="lastname"
                        value={form.lastname}
                        onChange={(event) => setForm((prev) => ({ ...prev, lastname: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">เบอร์โทร</Label>
                      <Input
                        id="phone"
                        value={form.phoneNumber}
                        onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                        placeholder="ไม่บังคับ"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                      </Button>
                    </div>
                  </form>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                      <p className="font-medium">{user.phoneNumber ?? "-"}</p>
                    </div>
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
