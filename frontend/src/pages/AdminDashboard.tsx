import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart3, BookOpen, Home, Loader2, RefreshCw, Shield, ShoppingCart, Users } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  activeRentals: number;
  completedRentals: number;
  overdueRentals: number;
  totalCommissionRevenue: number;
  totalUserBalance: number;
  averageUserBalance: number;
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

interface AdminShop {
  shopId: number;
  userId: number;
  shopName: string;
  ownerName: string;
  bookCount: number;
  createdAt: string;
}

interface AdminReport {
  reportId: number;
  reportType: "Book" | "Shop";
  reason: string;
  details: string | null;
  status: "Open" | "Resolved" | "Dismissed";
  adminNote: string | null;
  createdAt: string;
  handledAt: string | null;
  reporter: {
    userId: number;
    username: string;
  };
  target: {
    bookId: number | null;
    bookTitle: string | null;
    shopId: number | null;
    shopName: string | null;
  };
  handledBy: {
    userId: number;
    username: string;
  } | null;
}

interface AdminDashboardResponse {
  summary: AdminSummary;
  users: AdminUser[];
  books: AdminBook[];
  shops: AdminShop[];
  reports: AdminReport[];
}

const AdminDashboard = () => {
  const token = getAuthToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [suspendUntilByUserId, setSuspendUntilByUserId] = useState<Record<number, string>>({});
  const [shopSearchFilter, setShopSearchFilter] = useState("");
  const [userSearchFilter, setUserSearchFilter] = useState("");
  const [bookSearchFilter, setBookSearchFilter] = useState("");
  const [reportSearchFilter, setReportSearchFilter] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | "Open" | "Resolved" | "Dismissed">("all");

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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: Boolean(token) && isAdmin,
    queryFn: async () => {
      const response = await apiGet<AdminDashboardResponse>("/api/admin/dashboard", token ?? undefined);
      return response.data;
    },
  });

  const users = data?.users ?? [];
  const books = data?.books ?? [];
  const shops = data?.shops ?? [];
  const reports = data?.reports ?? [];
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

  const filteredUsers = useMemo(() => {
    if (!userSearchFilter.trim()) return users;
    const q = userSearchFilter.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.firstname.toLowerCase().includes(q) ||
        u.lastname.toLowerCase().includes(q)
    );
  }, [users, userSearchFilter]);

  const filteredBooks = useMemo(() => {
    if (!bookSearchFilter.trim()) return books;
    const q = bookSearchFilter.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q)
    );
  }, [books, bookSearchFilter]);

  const filteredShops = useMemo(() => {
    if (!shopSearchFilter.trim()) return shops;
    const q = shopSearchFilter.toLowerCase();
    return shops.filter(
      (s) =>
        s.shopName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q)
    );
  }, [shops, shopSearchFilter]);

  const filteredReports = useMemo(() => {
    let items = [...reports];
    if (reportStatusFilter !== "all") {
      items = items.filter((r) => r.status === reportStatusFilter);
    }
    if (!reportSearchFilter.trim()) return items;
    const q = reportSearchFilter.toLowerCase();
    return items.filter((r) =>
      r.reason.toLowerCase().includes(q) ||
      (r.details ?? "").toLowerCase().includes(q) ||
      r.reporter.username.toLowerCase().includes(q) ||
      (r.target.bookTitle ?? "").toLowerCase().includes(q) ||
      (r.target.shopName ?? "").toLowerCase().includes(q)
    );
  }, [reports, reportSearchFilter, reportStatusFilter]);

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
      toast({ title: "ลบหนังสือสำเร็จ" });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (error) {
      toast({
        title: "ลบหนังสือไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleReportAction = async (reportId: number, action: "RESOLVE" | "DISMISS" | "REOPEN") => {
    if (!token) return;

    try {
      await apiPatch(`/api/admin/reports/${reportId}`, { action }, token);
      toast({ title: "อัปเดตรายงานสำเร็จ" });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (error) {
      toast({
        title: "อัปเดตรายงานไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const currencyFormatter = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            แดชบอร์ดแอดมิน
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            โหลดใหม่
          </Button>
        </div>

        {!token && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-3">กรุณาเข้าสู่ระบบก่อน</p>
              <Button asChild><Link to="/auth">ไปหน้าเข้าสู่ระบบ</Link></Button>
            </CardContent>
          </Card>
        )}

        {token && me && !isAdmin && (
          <Card>
            <CardContent className="p-4 text-destructive">
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    ผู้ใช้งาน
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary?.totalUsers ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ปกติ {summary?.activeUsers} | ระงับ {summary?.suspendedUsers} | แบน {summary?.bannedUsers}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    หนังสือ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary?.totalBooks ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ทั้งหมดในระบบ
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                    การยืม
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary?.activeRentals ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ยืมอยู่ | เสร็จแล้ว {summary?.completedRentals}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    ค่าคอมมิชชัน
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">฿{currencyFormatter.format(summary?.totalCommissionRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    รายได้เว็บ
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Wallet & Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">สถานะกระเป๋า</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ยอดเงินรวมระบบ</span>
                    <span className="font-semibold">฿{currencyFormatter.format(summary?.totalUserBalance ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เฉลี่ยต่อคน</span>
                    <span className="font-semibold">฿{currencyFormatter.format(summary?.averageUserBalance ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">สถานะการส่งคืน</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ส่งคืนแล้ว</span>
                    <span className="font-semibold text-green-600">{summary?.completedRentals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เลยกำหนด</span>
                    <span className="font-semibold text-red-600">{summary?.overdueRentals}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Section */}
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    รายงาน ({reports.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <Input
                      placeholder="ค้นหาสาเหตุ, รายละเอียด, ผู้รายงาน..."
                      value={reportSearchFilter}
                      onChange={(e) => setReportSearchFilter(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select value={reportStatusFilter} onValueChange={(value) => setReportStatusFilter(value as typeof reportStatusFilter)}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="สถานะรายงาน" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="Open">ยังไม่จัดการ</SelectItem>
                        <SelectItem value="Resolved">แก้ไขแล้ว</SelectItem>
                        <SelectItem value="Dismissed">ปฏิเสธ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>ประเภท</TableHead>
                          <TableHead>เป้าหมาย</TableHead>
                          <TableHead>ผู้รายงาน</TableHead>
                          <TableHead>สาเหตุ</TableHead>
                          <TableHead>รายละเอียด</TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead>เวลารายงาน</TableHead>
                          <TableHead>จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground">
                              ยังไม่มีรายงานเข้ามา
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredReports.map((report) => (
                            <TableRow key={report.reportId}>
                              <TableCell className="text-sm">{report.reportId}</TableCell>
                              <TableCell className="text-sm">
                                {report.reportType === "Book" ? "Book" : "Shop"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {report.reportType === "Book" && report.target.bookId ? (
                                  <Link to={`/book/${report.target.bookId}`} className="underline underline-offset-2">
                                    {report.target.bookTitle ?? `Book #${report.target.bookId}`}
                                  </Link>
                                ) : report.target.shopId ? (
                                  <Link to={`/shop/${report.target.shopId}`} className="underline underline-offset-2">
                                    {report.target.shopName ?? `Shop #${report.target.shopId}`}
                                  </Link>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{report.reporter.username}</TableCell>
                              <TableCell className="text-sm">{report.reason}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[240px]">
                                {report.details ?? "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={report.status === "Open" ? "destructive" : report.status === "Resolved" ? "secondary" : "outline"}
                                >
                                  {report.status === "Open" ? "Open" : report.status === "Resolved" ? "Resolved" : "Dismissed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(report.createdAt).toLocaleString("th-TH")}
                              </TableCell>
                              <TableCell>
                                {report.status === "Open" ? (
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => void handleReportAction(report.reportId, "RESOLVE")}>
                                      Resolve
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => void handleReportAction(report.reportId, "DISMISS")}>
                                      Dismiss
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => void handleReportAction(report.reportId, "REOPEN")}>
                                    Reopen
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>

            {/* Shops Section */}
            {shops.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    ร้านค้า ({shops.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="ค้นหาชื่อร้าน, เจ้าของ..."
                    value={shopSearchFilter}
                    onChange={(e) => setShopSearchFilter(e.target.value)}
                    className="max-w-sm"
                  />
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>ชื่อร้าน</TableHead>
                          <TableHead>เจ้าของ</TableHead>
                          <TableHead>หนังสือ</TableHead>
                          <TableHead>สร้างเมื่อ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShops.map((shop) => (
                          <TableRow key={shop.shopId}>
                            <TableCell className="text-sm">{shop.shopId}</TableCell>
                            <TableCell className="font-medium">{shop.shopName}</TableCell>
                            <TableCell>{shop.ownerName}</TableCell>
                            <TableCell>{shop.bookCount}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(shop.createdAt).toLocaleDateString("th-TH")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users Management Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  จัดการผู้ใช้งาน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="ค้นหาชื่อผู้ใช้, อีเมล..."
                  value={userSearchFilter}
                  onChange={(e) => setUserSearchFilter(e.target.value)}
                  className="max-w-sm"
                />
                {isLoading ? (
                  <p className="text-muted-foreground">กำลังโหลด...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>ชื่อผู้ใช้</TableHead>
                          <TableHead>อีเมล</TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead>ยอดคงเหลือ</TableHead>
                          <TableHead>ระงับถึง</TableHead>
                          <TableHead>จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.userId}>
                            <TableCell className="text-sm">{user.userId}</TableCell>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={user.role === "Banned" ? "destructive" : user.role === "Admin" ? "secondary" : "outline"}
                              >
                                {user.role === "Admin" ? "ผู้ดูแล" : user.role === "Banned" ? "แบน" : "ลูกค้า"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">฿{currencyFormatter.format(user.balance)}</TableCell>
                            <TableCell className="text-sm">
                              {user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleString("th-TH") : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                {user.role !== "Admin" && (
                                  <>
                                    <Input
                                      type="datetime-local"
                                      size={1}
                                      className="h-9 text-xs w-auto"
                                      value={suspendUntilByUserId[user.userId] ?? ""}
                                      onChange={(event) =>
                                        setSuspendUntilByUserId((prev) => ({ ...prev, [user.userId]: event.target.value }))
                                      }
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => void handleUserAction(user.userId, "SUSPEND")}
                                    >
                                      ระงับ
                                    </Button>
                                  </>
                                )}
                                {user.role === "Banned" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleUserAction(user.userId, "UNBAN")}
                                  >
                                    ปลดแบน
                                  </Button>
                                ) : user.role !== "Admin" ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => void handleUserAction(user.userId, "BAN")}
                                  >
                                    แบนถาวร
                                  </Button>
                                ) : null}
                                {user.role !== "Admin" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleUserAction(user.userId, "UNSUSPEND")}
                                  >
                                    ยกเลิกระงับ
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Books Management Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  จัดการหนังสือ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="ค้นหาชื่อหนังสือ, ผู้เขียน, เจ้าของ..."
                  value={bookSearchFilter}
                  onChange={(e) => setBookSearchFilter(e.target.value)}
                  className="max-w-sm"
                />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ชื่อหนังสือ</TableHead>
                        <TableHead>ผู้เขียน</TableHead>
                        <TableHead>เจ้าของ</TableHead>
                        <TableHead>ร้าน</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBooks.map((book) => (
                        <TableRow key={book.bookId}>
                          <TableCell className="text-sm">{book.bookId}</TableCell>
                          <TableCell className="font-medium">{book.title}</TableCell>
                          <TableCell className="text-sm">{book.author}</TableCell>
                          <TableCell className="text-sm">{book.ownerName}</TableCell>
                          <TableCell className="text-sm">{book.shopName ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant={book.status === "Rented" ? "secondary" : "outline"}>
                              {book.status === "Rented" ? "ยืมอยู่" : "ว่าง"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDeleteBook(book.bookId)}
                            >
                              ลบ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
