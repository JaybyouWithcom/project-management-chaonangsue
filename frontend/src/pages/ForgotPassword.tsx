import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiPost, HttpError } from "@/lib/api";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      toast({
        title: "อีเมลไม่ถูกต้อง",
        description: "กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น user@example.com",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/auth/password/forgot", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setOtpRequested(true);
      toast({
        title: "ส่ง OTP แล้ว",
        description: "หากอีเมลนี้มีบัญชี ระบบจะส่ง OTP สำหรับรีเซ็ตรหัสผ่านภายในไม่กี่นาที",
      });
    } catch (error) {
      toast({
        title: "ส่ง OTP ไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      toast({ title: "กรุณากรอก OTP", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "รหัสผ่านใหม่สั้นเกินไป",
        description: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณากรอกรหัสผ่านใหม่ให้ตรงกันทั้งสองช่อง",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/auth/password/reset", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });
      toast({ title: "รีเซ็ตรหัสผ่านสำเร็จ", description: "กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "รีเซ็ตรหัสผ่านไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-10 flex-1 max-w-xl">
        <h1 className="font-display text-3xl font-bold mb-2">ลืมรหัสผ่าน</h1>
        <p className="text-muted-foreground mb-6">กรอกอีเมลเพื่อรับ OTP และตั้งรหัสผ่านใหม่</p>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (otpRequested) {
              void handleResetPassword();
              return;
            }
            void handleRequestOtp();
          }}
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            disabled={otpRequested}
            onChange={(event) => setEmail(event.target.value)}
          />

          {otpRequested && (
            <>
              <Input
                inputMode="numeric"
                placeholder="OTP 6 หลัก"
                value={otp}
                maxLength={6}
                onChange={(event) => setOtp(event.target.value)}
              />
              <Input
                type="password"
                placeholder="รหัสผ่านใหม่"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <Input
                type="password"
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {otpRequested ? "ยืนยันการรีเซ็ตรหัสผ่าน" : "ส่ง OTP"}
          </Button>

          {otpRequested && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={submitting}
              onClick={() => {
                void handleRequestOtp();
              }}
            >
              ส่ง OTP อีกครั้ง
            </Button>
          )}
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPasswordPage;
