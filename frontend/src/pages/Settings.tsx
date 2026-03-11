import { Link } from "react-router-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CircleUserRound, 
  Home,
  Lock,
  Mail, 
  Phone, 
  User, 
  Tag, 
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPatch, HttpError } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Address, createAddress, deleteAddress, formatAddressLine, listAddresses, updateAddress } from "@/lib/addresses";

// ... (Interface และ Formatter คงเดิม) ...
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

const normalizeThaiPhone = (value: string): string => value.replace(/[^0-9]/g, '');

const emptyAddressForm = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  addressLine: "",
  subDistrict: "",
  district: "",
  province: "",
  postalCode: "",
  isDefault: false,
};

const getNextAutoLabel = (addresses: Address[], excludeId?: number | null): string => {
  let maxIndex = 0;
  for (const address of addresses) {
    if (excludeId && address.addressId === excludeId) continue;
    const label = address.label ?? "";
    const match = label.match(/^ที่อยู่\s*(\d+)$/);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      maxIndex = Math.max(maxIndex, value);
    }
  }
  return `ที่อยู่ ${maxIndex + 1}`;
};

const Settings = () => {
  const token = getAuthToken();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    phoneNumber: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["settings-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthUser }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      if (!token) return [];
      return listAddresses(token);
    },
  });

  const addresses = addressesQuery.data ?? [];

  useEffect(() => {
    if (!user) return;
    setForm({
      firstname: user.firstname,
      lastname: user.lastname,
      phoneNumber: user.phoneNumber ?? "",
      email: user.email,
    });
  }, [user]);

  const isEditingAddress = useMemo(() => Boolean(editingAddressId), [editingAddressId]);

  const resetAddressForm = () => {
    setAddressForm(emptyAddressForm);
    setEditingAddressId(null);
  };

  const handleSaveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    if (
      !addressForm.recipientName.trim() ||
      !addressForm.phoneNumber.trim() ||
      !addressForm.addressLine.trim() ||
      !addressForm.subDistrict.trim() ||
      !addressForm.district.trim() ||
      !addressForm.province.trim() ||
      !addressForm.postalCode.trim()
    ) {
      toast({ title: "กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน", variant: "destructive" });
      return;
    }

    if (!token) return;
    const normalizedPhone = normalizeThaiPhone(addressForm.phoneNumber);
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      toast({
        title: "เบอร์โทรไม่ถูกต้อง",
        description: "เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0812345678)",
        variant: "destructive",
      });
      return;
    }
    setSavingAddress(true);
    const resolvedLabel = addressForm.label.trim()
      ? addressForm.label.trim()
      : getNextAutoLabel(addresses, editingAddressId);
    const payload = {
      label: resolvedLabel,
      receiverName: addressForm.recipientName.trim(),
      phoneNumber: normalizedPhone,
      addressDetail: addressForm.addressLine.trim(),
      subDistrict: addressForm.subDistrict.trim(),
      district: addressForm.district.trim(),
      province: addressForm.province.trim(),
      postalCode: addressForm.postalCode.trim(),
      isDefault: addressForm.isDefault,
    };

    try {
      if (editingAddressId) {
        await updateAddress(token, editingAddressId, payload);
      } else {
        await createAddress(token, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["addresses", token] });
      resetAddressForm();
      toast({ title: "บันทึกที่อยู่สำเร็จ" });
    } catch (error) {
      const errorMessage = error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด";
      toast({ title: "บันทึกที่อยู่ไม่สำเร็จ", description: errorMessage, variant: "destructive" });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddressId(address.addressId);
    setAddressForm({
      label: address.label ?? "",
      recipientName: address.receiverName,
      phoneNumber: address.phoneNumber,
      addressLine: address.addressDetail,
      subDistrict: address.subDistrict,
      district: address.district,
      province: address.province,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
  };

  const handleDeleteAddress = (addressId: number) => {
    if (!user) return;
    const confirmed = window.confirm("ลบที่อยู่นี้ใช่หรือไม่?");
    if (!confirmed) return;
    if (!token) return;
    void (async () => {
      try {
        await deleteAddress(token, addressId);
        await queryClient.invalidateQueries({ queryKey: ["addresses", token] });
        if (editingAddressId === addressId) {
          resetAddressForm();
        }
        toast({ title: "ลบที่อยู่แล้ว" });
      } catch (error) {
        const errorMessage = error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด";
        toast({ title: "ลบที่อยู่ไม่สำเร็จ", description: errorMessage, variant: "destructive" });
      }
    })();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    // Validation แบบรวบยอด (ตรวจสอบที่หลังบ้านเป็นหลักตามที่คุยกัน)
    if (!form.firstname.trim() || !form.lastname.trim() || !form.email.trim()) {
      toast({ title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await apiPatch<{ user: AuthUser }>(
        "/api/auth/me",
        {
          firstname: form.firstname,
          lastname: form.lastname,
          phoneNumber: form.phoneNumber.trim() ? normalizeThaiPhone(form.phoneNumber) : undefined,
          email: form.email,
        },
        token,
      );
      await queryClient.invalidateQueries({ queryKey: ["settings-me", token] });
      toast({ title: "บันทึกข้อมูลสำเร็จ" });
    } catch (error) {
      const errorMessage = error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด";
      toast({ title: "บันทึกข้อมูลไม่สำเร็จ", description: errorMessage, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    if (!passwordForm.currentPassword.trim()) {
      toast({ title: "กรุณากรอกรหัสผ่านปัจจุบัน", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "รหัสผ่านใหม่สั้นเกินไป",
        description: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร",
        variant: "destructive",
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast({
        title: "รหัสผ่านใหม่ไม่ตรงกัน",
        description: "กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่านให้ตรงกัน",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      await apiPatch(
        "/api/auth/me/password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token,
      );
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      toast({ title: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (error) {
      const errorMessage = error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด";
      toast({ title: "เปลี่ยนรหัสผ่านไม่สำเร็จ", description: errorMessage, variant: "destructive" });
    } finally {
      setChangingPassword(false);
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
              <CardHeader><CardTitle>กรุณาเข้าสู่ระบบ</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button asChild><Link to="/auth">ไปหน้าเข้าสู่ระบบ</Link></Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card><CardContent className="py-10 text-muted-foreground">กำลังโหลด...</CardContent></Card>
          ) : isError || !user ? (
            <Card><CardContent className="py-10 text-destructive">โหลดข้อมูลไม่สำเร็จ</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircleUserRound className="h-5 w-5 text-primary" />
                    ข้อมูลบัญชี
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Form แก้ไขข้อมูล */}
                  <form className="space-y-4 pb-6" onSubmit={(event) => { void handleSubmit(event); }} noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label htmlFor="firstname" className="flex items-center gap-2 mb-1.5">
                          <User className="h-4 w-4 text-muted-foreground" /> ชื่อ
                        </Label>
                        <Input
                          id="firstname"
                          value={form.firstname}
                          onChange={(event) => setForm((prev) => ({ ...prev, firstname: event.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastname" className="flex items-center gap-2 mb-1.5">
                          <User className="h-4 w-4 text-muted-foreground" /> นามสกุล
                        </Label>
                        <Input
                          id="lastname"
                          value={form.lastname}
                          onChange={(event) => setForm((prev) => ({ ...prev, lastname: event.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="flex items-center gap-2 mb-1.5">
                          <Mail className="h-4 w-4 text-muted-foreground" /> อีเมล
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="flex items-center gap-2 mb-1.5">
                          <Phone className="h-4 w-4 text-muted-foreground" /> เบอร์โทร
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={form.phoneNumber}
                          onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                          placeholder="ไม่บังคับ"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                      </Button>
                    </div>
                      {/* ส่วนแสดงผลข้อมูล */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">ชื่อ - นามสกุล</p>
                          <p className="font-medium">{user.firstname} {user.lastname}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">ชื่อผู้ใช้</p>
                          <p className="font-medium">{user.username}</p>
                        </div>
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
                  </form>

                  <div className="border-t pt-6 space-y-5">
                    <CardHeader className="px-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          ที่อยู่จัดส่ง
                        </CardTitle>
                        <Button type="button" variant="outline" onClick={resetAddressForm}>
                          เพิ่มที่อยู่
                        </Button>
                      </div>
                    </CardHeader>

                    {addresses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">ยังไม่มีที่อยู่จัดส่ง เพิ่มได้มากกว่า 1 ที่อยู่</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {addresses.map((address) => (
                          <Card key={address.addressId} className="border">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold flex items-center gap-2">
                                  {address.label ?? "Home"}
                                  {address.isDefault && <Badge variant="secondary">ที่อยู่หลัก</Badge>}
                                </p>
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={() => handleEditAddress(address)}>
                                    แก้ไข
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => handleDeleteAddress(address.addressId)}>
                                    ลบ
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{address.receiverName} • {address.phoneNumber}</p>
                              <p className="text-sm">{formatAddressLine(address)}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    <form className="space-y-4 rounded-lg border p-4" onSubmit={handleSaveAddress} noValidate>
                      <h4 className="font-semibold">{isEditingAddress ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่"}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="address-label" className="mb-1.5 block">ชื่อที่อยู่</Label>
                          <Input
                            id="address-label"
                            value={addressForm.label}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))}
                            placeholder="เช่น บ้าน / ที่ทำงาน"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-recipient" className="mb-1.5 block">ผู้รับ</Label>
                          <Input
                            id="address-recipient"
                            value={addressForm.recipientName}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, recipientName: event.target.value }))}
                            placeholder="ชื่อผู้รับ"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-phone" className="mb-1.5 block">เบอร์โทร</Label>
                          <Input
                            id="address-phone"
                            value={addressForm.phoneNumber}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                            placeholder="เช่น 0123456789"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-postal" className="mb-1.5 block">รหัสไปรษณีย์</Label>
                          <Input
                            id="address-postal"
                            value={addressForm.postalCode}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="address-line" className="mb-1.5 block">ที่อยู่</Label>
                          <Input
                            id="address-line"
                            value={addressForm.addressLine}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, addressLine: event.target.value }))}
                            placeholder="บ้านเลขที่ ถนน อาคาร ฯลฯ"
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-subdistrict" className="mb-1.5 block">แขวง/ตำบล</Label>
                          <Input
                            id="address-subdistrict"
                            value={addressForm.subDistrict}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, subDistrict: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-district" className="mb-1.5 block">เขต/อำเภอ</Label>
                          <Input
                            id="address-district"
                            value={addressForm.district}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, district: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address-province" className="mb-1.5 block">จังหวัด</Label>
                          <Input
                            id="address-province"
                            value={addressForm.province}
                            onChange={(event) => setAddressForm((prev) => ({ ...prev, province: event.target.value }))}
                          />
                        </div>
                      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">ตั้งเป็นที่อยู่หลัก</p>
                          <p className="text-xs text-muted-foreground">ใช้เป็นค่าเริ่มต้นในการจัดส่ง</p>
                        </div>
                        <Switch
                          checked={addressForm.isDefault}
                          onCheckedChange={(value) => setAddressForm((prev) => ({ ...prev, isDefault: value }))}
                        />
                      </div>
</div>
                      <div className="flex justify-end gap-2">
                        {isEditingAddress && (
                          <Button type="button" variant="outline" onClick={resetAddressForm}>
                            ยกเลิก
                          </Button>
                        )}
                        <Button type="submit" disabled={savingAddress}>
                          {savingAddress ? "กำลังบันทึก..." : "บันทึกที่อยู่"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  <form className="space-y-4 border-t pt-6" onSubmit={(event) => { void handleChangePassword(event); }} noValidate>
                    <CardHeader className="px-0">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        เปลี่ยนรหัสผ่าน
                      </CardTitle>
                    </CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="current-password" className="mb-1.5 block">รหัสผ่านปัจจุบัน</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password" className="mb-1.5 block">รหัสผ่านใหม่</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-new-password" className="mb-1.5 block">ยืนยันรหัสผ่านใหม่</Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          value={passwordForm.confirmNewPassword}
                          onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={changingPassword}>
                        {changingPassword ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
                      </Button>
                    </div>
                  </form>
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
