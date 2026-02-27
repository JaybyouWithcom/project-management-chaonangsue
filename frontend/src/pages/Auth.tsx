import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
    setSubmitting(true);
    try {
      const result = await apiPost<AuthResponse>('/api/auth/register', registerForm);
      setAuthToken(result.data.token);
      toast({ title: `สมัครสมาชิกสำเร็จ (${result.data.user.username})` });
      navigate('/browse');
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
            <Input placeholder="Username หรือ Email" value={login} onChange={(e) => setLogin(e.target.value)} />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button onClick={handleLogin} disabled={submitting} className="w-full">เข้าสู่ระบบ</Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-3">
            <Input placeholder="ชื่อ" value={registerForm.firstname} onChange={(e) => setRegisterForm((p) => ({ ...p, firstname: e.target.value }))} />
            <Input placeholder="นามสกุล" value={registerForm.lastname} onChange={(e) => setRegisterForm((p) => ({ ...p, lastname: e.target.value }))} />
            <Input placeholder="Username" value={registerForm.username} onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))} />
            <Input placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="เบอร์โทร" value={registerForm.phoneNumber} onChange={(e) => setRegisterForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
            <Input type="password" placeholder="Password" value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} />
            <Button onClick={handleRegister} disabled={submitting} className="w-full">สมัครสมาชิก</Button>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;
