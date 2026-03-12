import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiPost, HttpError } from '@/lib/api';
import { setAuthToken } from '@/lib/auth';

interface AuthResponse {
  user: {
    userId: number;
    username: string;
    role: string;
  };
  token: string;
}

interface RegisterResponse {
  pendingSignupId: number;
  email: string;
  phoneNumber: string | null;
  requiresVerification: true;
}

const VERIFY_STATE_STORAGE_KEY = 'verify-account-state';
const TERMS_ACCEPTED_STORAGE_KEY = 'verify-account-terms-accepted';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const thaiPhoneRegex = /^0\d{9}$/;

const normalizeThaiPhone = (value: string): string => value.replace(/[^0-9]/g, '');

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [registerForm, setRegisterForm] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const result = await apiPost<AuthResponse>('/api/auth/login', { login, password });
      setAuthToken(result.data.token);
      toast({ title: `ยินดีต้อนรับ ${result.data.user.username}` });
      navigate('/browse');
    } catch (error) {
      toast({
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        description: error instanceof HttpError ? error.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const normalizedEmail = registerForm.email.trim();
    const normalizedPhone = normalizeThaiPhone(registerForm.phoneNumber);

    if (!emailRegex.test(normalizedEmail)) {
      toast({
        title: 'อีเมลไม่ถูกต้อง',
        description: 'กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น user@example.com',
        variant: 'destructive',
      });
      return;
    }

    if (normalizedPhone && !thaiPhoneRegex.test(normalizedPhone)) {
      toast({
        title: 'เบอร์โทรไม่ถูกต้อง',
        description: 'เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0812345678) (ใส่ขีดได้ ระบบลบให้อัตโนมัติ)',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost<RegisterResponse>('/api/auth/register', {
        ...registerForm,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
      });
      const verifyState = {
        pendingSignupId: result.data.pendingSignupId,
        email: result.data.email,
        phoneNumber: result.data.phoneNumber,
      };
      sessionStorage.setItem(VERIFY_STATE_STORAGE_KEY, JSON.stringify(verifyState));
      sessionStorage.removeItem(TERMS_ACCEPTED_STORAGE_KEY);
      navigate('/auth/terms', { state: verifyState });
    } catch (error) {
      toast({
        title: 'สมัครสมาชิกไม่สำเร็จ',
        description: error instanceof HttpError ? error.message : 'เกิดข้อผิดพลาด',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-10 flex-1 max-w-xl">
        <h1 className="font-display text-3xl font-bold mb-6">เข้าสู่ระบบ / สมัครสมาชิก</h1>
        <Tabs defaultValue="login">
          <TabsList className="mb-6">
            <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
            <TabsTrigger value="register">สมัครสมาชิก</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <Input placeholder="ชื่อผู้ใช้ หรือ อีเมล" value={login} onChange={(e) => setLogin(e.target.value)} />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="text-right">
                <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">เข้าสู่ระบบ</Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-3">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRegister();
              }}
            >
              <Input placeholder="ชื่อ" value={registerForm.firstname} onChange={(e) => setRegisterForm((p) => ({ ...p, firstname: e.target.value }))} />
              <Input placeholder="นามสกุล" value={registerForm.lastname} onChange={(e) => setRegisterForm((p) => ({ ...p, lastname: e.target.value }))} />
              <Input placeholder="ชื่อผู้ใช้" value={registerForm.username} onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))} />
              <Input placeholder="อีเมล" value={registerForm.email} onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} />
              <Input
                placeholder="เบอร์โทร (เช่น 0123456789)"
                value={registerForm.phoneNumber}
                onChange={(e) => setRegisterForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                maxLength={12}
              />
              <Input type="password" placeholder="Password" value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} />
              <Button type="submit" disabled={submitting} className="w-full">สมัครสมาชิก</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;
