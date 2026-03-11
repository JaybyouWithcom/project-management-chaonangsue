import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiGet, apiPatch, HttpError } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface AuthMe {
  userId: number;
  role: "Customer" | "Admin" | "Banned";
}

interface AdminSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  totalBooks: number;
  totalCommissionRevenue: number;
}

interface AdminUser {
  userId: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  role: "Customer" | "Admin" | "Banned";
  balance: number;
  suspendedUntil: string | null;
}

interface AdminBook {
  bookId: number;
  title: string;
  author: string;
  status: "Available" | "Rented";
  ownerName: string;
  shopName: string | null;
}

interface AdminDashboardResponse {
  summary: AdminSummary;
  users: AdminUser[];
  books: AdminBook[];
}

const AdminDashboard = () => {
  const token = getAuthToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [suspendUntilByUserId, setSuspendUntilByUserId] = useState<Record<number, string>>({});

  const { data: me } = useQuery({
    queryKey: ["auth-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthMe }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const isAdmin = me?.role === "Admin";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: Boolean(token) && isAdmin,
    queryFn: async () => {
      const response = await apiGet<AdminDashboardResponse>("/api/admin/dashboard", token ?? undefined);
      return response.data;
    },
  });

  const users = data?.users ?? [];
  const books = data?.books ?? [];
  const summary = data?.summary;

  const suspendDefault = useMemo(() => {
    const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, "0");
    const dd = String(next.getDate()).padStart(2, "0");
    const hh = String(next.getHours()).padStart(2, "0");
    const min = String(next.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }, []);

  const handleUserAction = async (
    userId: number,
    action: "BAN" | "UNBAN" | "SUSPEND" | "UNSUSPEND",
  ) => {
    if (!token) return;

    try {
      const payload: Record<string, unknown> = { action };
      if (action === "SUSPEND") {
        payload.suspendUntil = new Date(suspendUntilByUserId[userId] || suspendDefault).toISOString();
      }
      await apiPatch(`/api/admin/users/${userId}/status`, payload, token);
      toast({ title: "อัปเดตสถานะผู้ใช้สำเร็จ" });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (error) {
      toast({
        title: "อัปเดตสถานะผู้ใช้ไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!token) return;

    try {
      await apiDelete(`/api/admin/books/${bookId}`, token);
      toast({ title: "ลบหนังสือสำเร็จ (delete)" });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (error) {
      toast({
        title: "ลบหนังสือไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1 space-y-6">
        <h1 className="text-3xl font-bold">แดชบอร์ดแอดมิน</h1>

        {!token && (
          <div className="rounded-lg border p-4">
            <p className="mb-3">กรุณาเข้าสู่ระบบก่อน</p>
            <Button asChild><Link to="/auth">ไปหน้าเข้าสู่ระบบ</Link></Button>
          </div>
        )}

        {token && me && !isAdmin && (
          <div className="rounded-lg border p-4">
            <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">รายได้เว็บ (Commission)</p>
                <p className="text-2xl font-bold">฿{summary?.totalCommissionRevenue.toLocaleString() ?? 0}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">ผู้ใช้งานทั้งหมด</p>
                <p className="text-2xl font-bold">{summary?.totalUsers ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  ปกติ {summary?.activeUsers ?? 0} | ระงับชั่วคราว {summary?.suspendedUsers ?? 0} | แบน {summary?.bannedUsers ?? 0}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">หนังสือในระบบ</p>
                <p className="text-2xl font-bold">{summary?.totalBooks ?? 0}</p>
              </div>
            </div>

            <section className="rounded-xl border p-4 space-y-3">
              <h2 className="text-xl font-semibold">จัดการผู้ใช้งาน</h2>
              {isLoading ? <p>กำลังโหลด...</p> : null}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>ชื่อผู้ใช้</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>ระงับถึง</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>{user.userId}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "Banned" ? "destructive" : "secondary"}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleString() : "-"}</TableCell>
                        <TableCell className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {user.role === "Banned" ? (
                              <Button size="sm" variant="outline" onClick={() => void handleUserAction(user.userId, "UNBAN")}>
                                ปลดแบน
                              </Button>
                            ) : (
                              <Button size="sm" variant="destructive" onClick={() => void handleUserAction(user.userId, "BAN")}>
                                แบนถาวร
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => void handleUserAction(user.userId, "UNSUSPEND")}>
                              ยกเลิกระงับ
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="datetime-local"
                              value={suspendUntilByUserId[user.userId] ?? ""}
                              onChange={(event) =>
                                setSuspendUntilByUserId((prev) => ({ ...prev, [user.userId]: event.target.value }))
                              }
                            />
                            <Button size="sm" onClick={() => void handleUserAction(user.userId, "SUSPEND")}>
                              ระงับชั่วคราว
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="rounded-xl border p-4 space-y-3">
              <h2 className="text-xl font-semibold">จัดการหนังสือ</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>ชื่อหนังสือ</TableHead>
                      <TableHead>เจ้าของ</TableHead>
                      <TableHead>ร้าน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books.map((book) => (
                      <TableRow key={book.bookId}>
                        <TableCell>{book.bookId}</TableCell>
                        <TableCell>{book.title}</TableCell>
                        <TableCell>{book.ownerName}</TableCell>
                        <TableCell>{book.shopName ?? "-"}</TableCell>
                        <TableCell>{book.status}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => void handleDeleteBook(book.bookId)}>
                            ลบหนังสือ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
