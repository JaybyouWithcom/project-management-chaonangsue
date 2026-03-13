import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Calendar, Shield, CheckCircle2, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiGet, apiPatch, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { normalizeConditionLabel } from "@/lib/bookCondition";
import { Address, formatAddressLine, listAddresses } from "@/lib/addresses";

type Plan = "15days" | "30days";

interface BookDetailData {
  bookId: number;
  ownerId: number;
  shopId: number | null;
  shopName: string | null;
  imagePath: string;
  title: string;
  genre: string | null;
  bookCondition: string | null;
  author: string;
  isbn: string | null;
  description: string | null;
  bookPrice: string;
  status: "Available" | "Rented";
  ownerName: string;
  ratingAverage: number;
  reviewCount: number;
}

interface BookReview {
  reviewId: number;
  bookId: number;
  userId: number;
  username: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
}

interface QuoteData {
  rentalPlan: Plan;
  dueDate: string;
  rentalPrice: number;
  depositPrice: number;
  totalAmount: number;
}

const planLabels: Record<Plan, string> = {
  "15days": "15 วัน",
  "30days": "30 วัน",
};

// เพิ่มฟังก์ชันสำหรับแปลงรูปแบบวันที่เป็นแบบไทย
const formatThaiDate = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    }).format(date);
  } catch (error) {
    return dateString; // ถ้าแปลงไม่สำเร็จให้คืนค่าเดิมกลับไป
  }
};

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = getAuthToken();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isAllReviewsOpen, setIsAllReviewsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [editingReview, setEditingReview] = useState<BookReview | null>(null);
  const [editingRating, setEditingRating] = useState<number>(0);
  const [editingComment, setEditingComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const reportReasons = [
    "สภาพหนังสือไม่ตรงตามที่ระบุไว้",
    "ได้รับหนังสือผิด",
    "หนังสือละเมิดลิขสิทธิ์",
    "หนังสือที่ไม่เหมาะสม",
    "อื่นๆ (ระบุรายละเอียด)",
  ];

  const detailQuery = useQuery({
    queryKey: ["book", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiGet<{ book: BookDetailData }>(`/api/books/${id}`);
      return response.data.book;
    },
  });

  const quoteQuery = useQuery({
    queryKey: ["book-quote", id, selectedPlan],
    enabled: Boolean(id && selectedPlan),
    queryFn: async () => {
      const response = await apiGet<QuoteData>(`/api/books/${id}/quote?plan=${selectedPlan}`);
      return response.data;
    },
  });

  const meQuery = useQuery({
    queryKey: ["book-detail-me"],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: { userId: number } }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      if (!token) return [] as Address[];
      return listAddresses(token);
    },
  });

  const addresses = addressesQuery.data ?? [];

  const reviewsPreviewQuery = useQuery({
    queryKey: ["book-reviews", id, "preview"],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiGet<{ reviews: BookReview[]; summary: ReviewSummary }>(`/api/books/${id}/reviews?limit=3`);
      return response.data;
    },
  });

  const reviewsAllQuery = useQuery({
    queryKey: ["book-reviews", id, "all"],
    enabled: Boolean(id && isAllReviewsOpen),
    queryFn: async () => {
      const response = await apiGet<{ reviews: BookReview[]; summary: ReviewSummary }>(`/api/books/${id}/reviews?limit=50`);
      return response.data;
    },
  });

  const openEditReview = (review: BookReview) => {
    setEditingReview(review);
    setEditingRating(review.rating);
    setEditingComment(review.comment ?? "");
  };

  const handleUpdateReview = async () => {
    if (!token || !id || !editingReview) return;
    if (editingRating < 1 || editingRating > 5) {
      toast({ title: "ให้คะแนน 1-5 ดาว", variant: "destructive" });
      return;
    }

    setReviewSubmitting(true);
    try {
      await apiPatch(
        `/api/books/${id}/reviews/${editingReview.reviewId}`,
        {
          rating: editingRating,
          comment: editingComment.trim() ? editingComment.trim() : null,
        },
        token,
      );
      toast({ title: "อัปเดตรีวิวสำเร็จ" });
      setEditingReview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["book-reviews", id, "preview"] }),
        queryClient.invalidateQueries({ queryKey: ["book-reviews", id, "all"] }),
        queryClient.invalidateQueries({ queryKey: ["book", id] }),
      ]);
    } catch (error) {
      toast({
        title: "อัปเดตรีวิวไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (review: BookReview) => {
    if (!token || !id) return;
    const confirmed = window.confirm("ยืนยันการลบรีวิวของคุณ?");
    if (!confirmed) return;

    try {
      await apiDelete(`/api/books/${id}/reviews/${review.reviewId}`, token);
      toast({ title: "ลบรีวิวสำเร็จ" });
      if (editingReview?.reviewId === review.reviewId) {
        setEditingReview(null);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["book-reviews", id, "preview"] }),
        queryClient.invalidateQueries({ queryKey: ["book-reviews", id, "all"] }),
        queryClient.invalidateQueries({ queryKey: ["book", id] }),
      ]);
    } catch (error) {
      toast({
        title: "ลบรีวิวไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedAddressId("");
      return;
    }
    const fallback = addresses.find((item) => item.isDefault) ?? addresses[0];
    setSelectedAddressId((prev) =>
      addresses.some((item) => String(item.addressId) === prev) ? prev : String(fallback.addressId),
    );
  }, [addresses]);

  const handleBooking = async (): Promise<void> => {
    if (!token) {
      toast({ title: "กรุณาเข้าสู่ระบบก่อนเช่าหนังสือ" });
      navigate('/auth');
      return;
    }

    if (!selectedPlan || !quoteQuery.data) {
      toast({ title: "กรุณาเลือกแผนการเช่า", variant: "destructive" });
      return;
    }
    if (!selectedAddressId) {
      toast({ title: "กรุณาเลือกที่อยู่จัดส่ง", variant: "destructive" });
      return;
    }

    if (detailQuery.data && meQuery.data?.userId === detailQuery.data.ownerId) {
      toast({ title: "ไม่สามารถเช่าหนังสือของร้านตัวเองได้", variant: "destructive" });
      return;
    }
    if (!id) {
      toast({ title: "ไม่พบรหัสหนังสือ", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost<{
        bookId: number;
        rentalPlan: Plan;
        dueDate: string;
        totalAmount: number;
        balanceAfter: number;
      }>(
        `/api/books/${id}/rent`,
        { plan: selectedPlan },
        token,
      );

      toast({
        title: "เช่าหนังสือสำเร็จ",
        description: `ยอดชำระ ฿${result.data.totalAmount} • ยอดคงเหลือ ฿${result.data.balanceAfter}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-transactions", token] });
      navigate("/browse");
    } catch (error) {
      toast({
        title: "เช่าหนังสือไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetReportForm = () => {
    setReportReason("");
    setReportDetails("");
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      toast({ title: "กรุณาเลือกสาเหตุที่ต้องการรายงาน", variant: "destructive" });
      return;
    }
    if (reportReason === "อื่นๆ (ระบุรายละเอียด)" && !reportDetails.trim()) {
      toast({ title: "กรุณาระบุรายละเอียดเพิ่มเติม", variant: "destructive" });
      return;
    }

    if (!token) {
      toast({ title: "กรุณาเข้าสู่ระบบก่อนส่งรายงาน", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!id) {
      toast({ title: "ไม่พบรหัสหนังสือ", variant: "destructive" });
      return;
    }

    try {
      await apiPost(`/api/books/${id}/report`, {
        reason: reportReason,
        details: reportDetails.trim() ? reportDetails.trim() : null,
      }, token);
      toast({ title: "ส่งรายงานแล้ว" });
      setIsReportOpen(false);
      resetReportForm();
    } catch (error) {
      toast({
        title: "ส่งรายงานไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  if (detailQuery.isLoading) {
    return <div className="min-h-screen"><Navbar /><div className="container mx-auto px-4 py-10">กำลังโหลด...</div></div>;
  }

  if (detailQuery.error || !detailQuery.data) {
    const message = detailQuery.error instanceof HttpError ? detailQuery.error.message : "ไม่พบหนังสือเล่มนี้";
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">{message}</p>
            <Button asChild variant="ghost" className="mt-4">
              <Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> กลับไปค้นหา</Link>
            </Button>
          </div>
        </div>
        <Dialog open={isAllReviewsOpen} onOpenChange={setIsAllReviewsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รีวิวทั้งหมด</DialogTitle>
          </DialogHeader>
          {reviewsAllQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลดรีวิว...</p>
          ) : (reviewsAllQuery.data?.reviews ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีรีวิวสำหรับหนังสือเล่มนี้</p>
          ) : (
            <div className="space-y-3">
              {(reviewsAllQuery.data?.reviews ?? []).map((review) => (
                <div key={review.reviewId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{review.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-accent">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-semibold">{review.rating}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{review.comment}</p>
                  )}
                  {token && currentUserId === review.userId && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditReview(review)}>
                        แก้ไขรีวิว
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { void handleDeleteReview(review); }}>
                        ลบรีวิว
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
      </div>
    );
  }

  const book = detailQuery.data;
  const currentUserId = meQuery.data?.userId ?? null;
  const isOwnBook = Boolean(meQuery.data?.userId && meQuery.data.userId === book.ownerId);
  const isRented = book.status !== "Available";
  const averageRating = Number(book.ratingAverage ?? 0);
  const reviewCount = Number(book.reviewCount ?? 0);
  const previewReviews = reviewsPreviewQuery.data?.reviews ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <Button asChild variant="ghost" className="mb-6 text-muted-foreground">
          <Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> กลับ</Link>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative rounded-xl overflow-hidden border bg-muted aspect-[3/4] max-h-[600px]">
            <img src={resolveImageUrl(book.imagePath)} alt={book.title} className="w-full h-full object-cover" />
            {isRented && (
              <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center">
                <span className="bg-white text-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow">
                  ถูกเช่าอยู่
                </span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="relative pr-24">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-0 top-0"
                onClick={() => setIsReportOpen(true)}
                disabled={isRented}
              >
                <Flag className="mr-2 h-4 w-4" />
                รายงาน
              </Button>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{book.genre ?? 'อื่นๆ'}</Badge>
                <Badge className="bg-accent text-accent-foreground border-0">{normalizeConditionLabel(book.bookCondition)}</Badge>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">{book.title}</h1>
              <p className="text-muted-foreground mt-1">
                ผู้เขียน {book.author} • ร้าน{" "}
                {book.shopId && book.shopName ? (
                  <Link to={`/shop/${book.shopId}`} className="underline underline-offset-2 hover:text-primary">
                    {book.shopName}
                  </Link>
                ) : (
                  book.ownerName
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ISBN: {book.isbn ?? '-'}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-accent">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-lg font-bold">{reviewCount > 0 ? averageRating.toFixed(1) : "0.0"}</span>
              </div>
              <span className="text-sm text-muted-foreground">สถานะ: {book.status === 'Available' ? 'พร้อมให้เช่า' : 'ไม่พร้อมให้เช่า'}</span>
            </div>

            <p className="text-foreground/80 leading-relaxed">{book.description ?? 'ไม่มีคำอธิบายเพิ่มเติม'}</p>

            <div className={`bg-card rounded-xl border p-5 space-y-5 ${isOwnBook || isRented ? "opacity-60" : ""}`}>
              <div>
                <h3 className="text-lg font-bold mb-1">เลือกแผนการเช่า</h3>
                <p className="text-sm text-muted-foreground">ราคาหนังสือ: ฿{book.bookPrice}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["15days", "30days"] as Plan[]).map((plan) => (
                  <Button
                    key={plan}
                    variant={selectedPlan === plan ? "default" : "outline"}
                    onClick={() => setSelectedPlan(plan)}
                    disabled={isRented || isOwnBook}
                    className="h-auto py-4 flex flex-col items-center"
                  >
                    <span className="font-semibold">{planLabels[plan]}</span>
                    <span className="text-xs mt-1 opacity-80">คำนวณตามอัตรา</span>
                  </Button>
                ))}
              </div>

              {quoteQuery.data && selectedPlan && (
                <div className="space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">ค่าเช่า ({planLabels[selectedPlan]})</span><span>฿{quoteQuery.data.rentalPrice}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ค่ามัดจำ</span><span>฿{quoteQuery.data.depositPrice}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">กำหนดคืน</span><span>{formatThaiDate(quoteQuery.data.dueDate)}</span></div>
                  <div className="flex justify-between text-base font-bold border-t pt-2"><span>รวมที่ต้องชำระ</span><span className="text-primary">฿{quoteQuery.data.totalAmount}</span></div>
                </div>
              )}


              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>ที่อยู่จัดส่ง</Label>
                  {token && (
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate("/settings")} disabled={isRented}>
                      เพิ่มที่อยู่
                    </Button>
                  )}
                </div>
                {!token ? (
                  <p className="text-sm text-muted-foreground">กรุณาเข้าสู่ระบบเพื่อเพิ่มที่อยู่จัดส่ง</p>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ยังไม่มีที่อยู่จัดส่ง กรุณาเพิ่มที่หน้าการตั้งค่า หรือ กดปุ่มเพิ่มที่อยู่ </p>
                ) : (
                  <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="เลือกที่อยู่จัดส่ง" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((address) => (
                        <SelectItem key={address.addressId} value={String(address.addressId)}>
                          {(address.label ?? "Home")} • {formatAddressLine(address)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={() => { void handleBooking(); }}
                disabled={isRented || submitting || isOwnBook || !selectedPlan || !selectedAddressId || !token}
              >
                {submitting ? "กำลังทำรายการ..." : "เช่าและชำระเงิน"}
              </Button>
              {isOwnBook && (
                <p className="text-sm text-center text-foreground">
                  ไม่สามารถเช่าหนังสือของร้านตัวเองได้
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center">* ดูรายละเอียดและราคาหนังสือได้โดยไม่ต้องเข้าสู่ระบบ แต่ต้องเข้าสู่ระบบก่อนทำรายการเช่า</p>
            </div>

            <div className="bg-card rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">คนอื่น ๆ ว่ายังไงบ้าง?</h3>
                  <p className="text-sm text-muted-foreground">
                    {reviewCount > 0 ? `คะแนนเฉลี่ย ${averageRating.toFixed(1)} จาก ${reviewCount} รีวิว` : "ยังไม่มีคะแนนสำหรับหนังสือเล่มนี้"}
                  </p>
                </div>
                {reviewCount > previewReviews.length && (
                  <Button variant="outline" size="sm" onClick={() => setIsAllReviewsOpen(true)} disabled={isRented}>
                    ดูทั้งหมด
                  </Button>
                )}
              </div>

              {reviewsPreviewQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">กำลังโหลดรีวิว...</p>
              ) : previewReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีรีวิวสำหรับหนังสือเล่มนี้</p>
              ) : (
                <div className="space-y-3">
                  {previewReviews.map((review) => (
                    <div key={review.reviewId} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{review.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("th-TH")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-accent">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-semibold">{review.rating}</span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{review.comment}</p>
                      )}
                      {token && currentUserId === review.userId && (
                        <div className="mt-3 flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEditReview(review)} disabled={isRented}>
                            แก้ไขรีวิว
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { void handleDeleteReview(review); }} disabled={isRented}>
                            ลบรีวิว
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /> จัดส่งภายใน 1-2 วัน</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /> ระบบมัดจำปลอดภัย</div>
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> ยืนยันสภาพก่อน-หลังเช่า</div>
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> คืนง่าย มีแจ้งเตือน</div>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={isReportOpen}
        onOpenChange={(open) => {
          setIsReportOpen(open);
          if (!open) resetReportForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รายงานหนังสือ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>สาเหตุที่รายงาน</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="เลือกสาเหตุ" />
                </SelectTrigger>
                <SelectContent>
                  {reportReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="report-details">รายละเอียดเพิ่มเติม</Label>
              <Textarea
                id="report-details"
                rows={4}
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                placeholder="อธิบายเพิ่มเติมเพื่อช่วยให้ทีมงานตรวจสอบได้เร็วขึ้น"
                className="mt-2"
              />
              {reportReason === "อื่นๆ (ระบุรายละเอียด)" && (
                <p className="text-xs text-muted-foreground mt-2">กรุณาระบุรายละเอียดเพิ่มเติมเมื่อเลือก "อื่นๆ"</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsReportOpen(false)} disabled={isRented}>
                ยกเลิก
              </Button>
              <Button onClick={handleSubmitReport} disabled={isRented}>ส่งรายงาน</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingReview)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReview(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขรีวิวของคุณ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditingRating(star)}
                    className="rounded p-1"
                    aria-label={`Rate ${star} stars`}
                    disabled={isRented || reviewSubmitting}
                  >
                    <Star
                      className={star <= editingRating ? "h-5 w-5 text-accent fill-current" : "h-5 w-5 text-muted-foreground"}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {editingRating > 0 ? `${editingRating} ดาว` : "ให้คะแนนรีวิวนี้"}
              </span>
            </div>
            <div>
              <Textarea
                rows={4}
                placeholder="แก้ไขความคิดเห็นของคุณ"
                value={editingComment}
                onChange={(event) => setEditingComment(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingReview(null)} disabled={isRented || reviewSubmitting}>
                ยกเลิก
              </Button>
              <Button onClick={() => { void handleUpdateReview(); }} disabled={isRented || reviewSubmitting}>
                {reviewSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAllReviewsOpen} onOpenChange={setIsAllReviewsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รีวิวทั้งหมด</DialogTitle>
          </DialogHeader>
          {reviewsAllQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลดรีวิว...</p>
          ) : (reviewsAllQuery.data?.reviews ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีรีวิวสำหรับหนังสือเล่มนี้</p>
          ) : (
            <div className="space-y-3">
              {(reviewsAllQuery.data?.reviews ?? []).map((review) => (
                <div key={review.reviewId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{review.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-accent">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-semibold">{review.rating}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default BookDetail;



