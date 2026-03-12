import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiPost, HttpError } from "@/lib/api";
import { setAuthToken } from "@/lib/auth";

type VerificationMethod = "email" | "phone";

interface VerifyState {
  pendingSignupId?: number;
  email?: string;
  phoneNumber?: string | null;
}

interface VerifyResponse {
  user: {
    userId: number;
    username: string;
    role: string;
  };
  token: string;
}

const VERIFY_STATE_STORAGE_KEY = "verify-account-state";

const readStoredVerifyState = (): VerifyState => {
  try {
    const raw = sessionStorage.getItem(VERIFY_STATE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as VerifyState;
    if (!parsed || typeof parsed.pendingSignupId !== "number") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
};

const VerifyAccountPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const routeState = (location.state as VerifyState | null) ?? {};
  const storedState = readStoredVerifyState();
  const state = routeState.pendingSignupId ? routeState : storedState;
  const [method, setMethod] = useState<VerificationMethod>("email");
  const [otp, setOtp] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const hasPhone = useMemo(() => Boolean(state.phoneNumber), [state.phoneNumber]);

  const handleRequestOtp = async () => {
    if (!state.pendingSignupId) {
      toast({ title: "ไม่พบข้อมูลผู้ใช้", description: "กรุณาสมัครใหม่อีกครั้ง", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (method === "phone" && !hasPhone) {
      toast({ title: "บัญชีนี้ไม่มีเบอร์โทร", variant: "destructive" });
      return;
    }

    setRequesting(true);
    try {
      await apiPost("/api/auth/verification/request-otp", {
        pendingSignupId: state.pendingSignupId,
        method,
      });
      toast({
        title: method === "email" ? "ส่ง OTP ทางอีเมลแล้ว" : "ส่ง OTP ทางโทรศัพท์แล้ว (mock)",
        description: method === "phone" ? "สำหรับ mock ให้ใช้รหัสจาก OTP_SECRET ในไฟล์ .env ของ backend" : undefined,
      });
    } catch (error) {
      toast({
        title: "ส่ง OTP ไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!state.pendingSignupId) {
      toast({ title: "ไม่พบข้อมูลผู้ใช้", description: "กรุณาสมัครใหม่อีกครั้ง", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!otp.trim()) {
      toast({ title: "กรุณากรอก OTP", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const result = await apiPost<VerifyResponse>("/api/auth/verification/verify-otp", {
        pendingSignupId: state.pendingSignupId,
        method,
        otp: otp.trim(),
      });
      setAuthToken(result.data.token);
      sessionStorage.removeItem(VERIFY_STATE_STORAGE_KEY);
      toast({ title: "สมัครสมาชิกสำเร็จ" });
      navigate("/browse");
    } catch (error) {
      toast({
        title: "OTP ไม่ถูกต้อง หรือหมดอายุ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-10 flex-1 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>ยืนยันตัวตนหลังสมัครสมาชิก</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกช่องทางยืนยัน</Label>
              <div className="flex gap-2">
                <Button type="button" variant={method === "email" ? "default" : "outline"} onClick={() => setMethod("email")}>
                  อีเมล
                </Button>
                <Button
                  type="button"
                  variant={method === "phone" ? "default" : "outline"}
                  disabled={!hasPhone}
                  onClick={() => setMethod("phone")}
                >
                  เบอร์โทร
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {method === "email"
                  ? `จะส่ง OTP ไปที่ ${state.email ?? "-"}`
                  : "โหมดทดสอบ: OTP คือค่าจาก OTP_SECRET ใน backend/.env"}
              </p>
            </div>

            <Button type="button" onClick={() => { void handleRequestOtp(); }} disabled={requesting}>
              {requesting ? "กำลังส่ง OTP..." : "ส่ง OTP"}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="otp">รหัส OTP</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="กรอก OTP 6 หลัก"
              />
            </div>

            <Button className="w-full" type="button" onClick={() => { void handleVerifyOtp(); }} disabled={verifying}>
              {verifying ? "กำลังตรวจสอบ..." : "ยืนยัน OTP"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default VerifyAccountPage;
