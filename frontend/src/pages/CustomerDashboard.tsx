import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Package, BookOpen, AlertTriangle, CheckCircle, Calendar, Truck, RotateCcw, RotateCw, Check, Star } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiDelete, apiGet, apiPatch, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import thailandPostLogo from "@/assets/logistics/thailand-post.png";
import kerryLogo from "@/assets/logistics/kerry-express.png";
import flashLogo from "@/assets/logistics/flash-express.png";
import jtLogo from "@/assets/logistics/jt-express.png";
import thunderLogo from "@/assets/logistics/thunder-express.png";

const statusColors: Record<string, string> = {
  "รอยืนยัน": "bg-warning/20 text-warning border-warning/30",
  "กำลังจัดส่ง": "bg-info/20 text-info border-info/30",
  "กำลังยืม": "bg-primary/20 text-primary border-primary/30",
  "รอคืน": "bg-accent/20 text-accent border-accent/30",
  "คืนแล้ว": "bg-success/20 text-success border-success/30",
  "เลยกำหนด": "bg-destructive/20 text-destructive border-destructive/30",
};

const statusIcons: Record<string, React.ElementType> = {
  "รอยืนยัน": Clock,
  "กำลังจัดส่ง": Package,
  "กำลังยืม": BookOpen,
  "รอคืน": Calendar,
  "คืนแล้ว": CheckCircle,
  "เลยกำหนด": AlertTriangle,
};

const receiveSteps = ["ได้รับคำสั่งเช่า", "เตรียมของแล้ว", "จัดส่งแล้ว", "จัดส่งสำเร็จ"];
const returnSteps = ["ส่งคืนแล้ว", "ส่งคืนสำเร็จ"];
const carriers = ["ไปรษณีย์ไทย", "Kerry Express", "Flash Express", "J&T Express", "Thunder Express"];
const carrierLogos = [thailandPostLogo, kerryLogo, flashLogo, jtLogo, thunderLogo];

type RentalPlan = "15days" | "30days";

const planDaysMap: Record<RentalPlan, number> = {
  "15days": 15,
  "30days": 30,
};

const receiveTrackingStorageKey = "customer-receive-tracking-v1";
const returnTrackingStorageKey = "customer-return-tracking-v1";

const loadTrackingState = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const saveTrackingState = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const getDaysRemaining = (endDate: string, nowMs = Date.now()) => {
  const diff = new Date(endDate).getTime() - nowMs;
  return Math.ceil(diff / 86400000);
};

interface RentalOrder {
  rentalId: number;
  bookId: number;
  bookTitle: string;
  bookCover: string;
  bookAuthor: string;
  bookCondition: string | null;
  bookPrice: number;
  renterName: string;
  renterId: number;
  startDate: string | null;
  endDate: string | null;
  rentalPlan: RentalPlan;
  rentalPrice: number;
  depositPrice: number;
  status: "กำลังยืม" | "รอคืน" | "คืนแล้ว" | "เลยกำหนด";
  totalPrice: number;
  pastDueDays: number;
  conditionFineRate: number;
  conditionFineAmount: number;
  fineAmountDue: number;
  fineAmountTotal: number;
  finePaidAt: string | null;
  paymentStatus: "รอชำระ" | "ชำระแล้ว" | "ยกเลิก";
  returnRequestedAt: string | null;
  returnDeliverySentAt: string | null;
  returnDeliveryProofPath: string | null;
  reviewId: number | null;
  reviewRating: number | null;
  reviewComment: string | null;
}

const StepProgress = ({ steps, completedCount }: { steps: string[]; completedCount: number }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const completed = index < completedCount;
          const active = index === completedCount && completedCount < steps.length;
          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div
                className={[
                  "h-8 w-8 rounded-full border flex items-center justify-center shrink-0",
                  completed ? "bg-primary text-primary-foreground border-primary" : active ? "border-primary text-primary" : "border-muted text-muted-foreground",
                ].join(" ")}
              >
                {completed ? <Check className="h-4 w-4" /> : <span className="text-xs font-semibold">{index + 1}</span>}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-px mx-2 bg-muted">
                  <div className={completed ? "h-px bg-primary w-full" : "h-px bg-muted w-full"} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {steps.map((step, index) => (
          <div
            key={`${step}-label`}
            className={index < completedCount ? "text-primary font-medium" : "text-muted-foreground"}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomerDashboard = () => {

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = getAuthToken();
  const navigate = useNavigate();

  interface AuthMe {
    userId: number;
    role: "Customer" | "Admin" | "Banned";
  }

  const { data: me } = useQuery({
    queryKey: ["auth-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthMe }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  useEffect(() => {
    if (me?.role === "Admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [me, navigate]);

  type ReceiveTrackingState = Record<number, { step: number; activationSynced: boolean; forceResimulate?: boolean }>;

  const [receiveTrackingById, setReceiveTrackingById] = useState<ReceiveTrackingState>(() =>
    loadTrackingState<ReceiveTrackingState>(receiveTrackingStorageKey, {}),
  );
  const [returnStepById, setReturnStepById] = useState<Record<number, number>>(() =>
    loadTrackingState<Record<number, number>>(returnTrackingStorageKey, {}),
  );
  const [returningRentalId, setReturningRentalId] = useState<number | null>(null);
  const [returnCarrierById, setReturnCarrierById] = useState<Record<number, string>>({});
  const [returnTrackingById, setReturnTrackingById] = useState<Record<number, string>>({});
  const [pausedAtById, setPausedAtById] = useState<Record<number, number>>({});
  const [simulatedDaysById, setSimulatedDaysById] = useState<Record<number, number>>({});
  const activationInFlightRef = useRef<Record<number, boolean>>({});
  const [reviewingOrder, setReviewingOrder] = useState<RentalOrder | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const isEditingReview = Boolean(reviewingOrder?.reviewId);
  const openReviewDialog = (order: RentalOrder) => {
    setReviewingOrder(order);
    setReviewRating(order.reviewRating ?? 0);
    setReviewComment(order.reviewComment ?? "");
  };

  const handleSubmitReview = async () => {
    if (!token || !reviewingOrder) return;
    if (reviewRating < 1 || reviewRating > 5) {
      toast({ title: "ให้คะแนน 1-5 ดาว", variant: "destructive" });
      return;
    }

    setReviewSubmitting(true);
    try {
      if (reviewingOrder.reviewId) {
        await apiPatch(`/api/books/${reviewingOrder.bookId}/reviews/${reviewingOrder.reviewId}`, {
          rating: reviewRating,
          comment: reviewComment.trim() ? reviewComment.trim() : null,
        }, token);
        toast({ title: "อัปเดตรีวิวสำเร็จ" });
      } else {
        await apiPost(`/api/books/${reviewingOrder.bookId}/reviews`, {
          rentalId: reviewingOrder.rentalId,
          rating: reviewRating,
          comment: reviewComment.trim() ? reviewComment.trim() : null,
        }, token);
        toast({ title: "ขอบคุณสำหรับความคิดเห็นของคุณ!" });
      }

      setReviewingOrder(null);
      await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
    } catch (error) {
      toast({
        title: reviewingOrder.reviewId ? "อัปเดตรีวิวไม่สำเร็จ" : "ส่งรีวิวไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (order: RentalOrder) => {
    if (!token || !order.reviewId) return;
    const confirmed = window.confirm("ยืนยันการลบรีวิวของคุณ?");
    if (!confirmed) return;

    try {
      await apiDelete(`/api/books/${order.bookId}/reviews/${order.reviewId}`, token);
      toast({ title: "ลบรีวิวสำเร็จ" });
      if (reviewingOrder?.reviewId === order.reviewId) {
        setReviewingOrder(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
    } catch (error) {
      toast({
        title: "ลบรีวิวไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const { data: orders = [] } = useQuery({
    queryKey: ["my-rentals"],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiGet<{ rentals: RentalOrder[] }>("/api/books/rentals/me", token ?? undefined);
      return response.data.rentals;
    },
  });

  const activeOrders = useMemo(
    () => orders.filter((o) => !["คืนแล้ว"].includes(o.status)),
    [orders],
  );
  const historyOrders = useMemo(
    () => orders.filter((o) => o.status === "คืนแล้ว"),
    [orders],
  );
  const returningOrders = useMemo(
    () => activeOrders.filter((order) => returnStepById[order.rentalId] !== undefined),
    [activeOrders, returnStepById]
  );

  useEffect(() => {
    setReceiveTrackingById((prev) => {
      const next = { ...prev };
      const activeIds = new Set(activeOrders.map((order) => order.rentalId));
      for (const order of activeOrders) {
        const current = next[order.rentalId];
        if (current?.forceResimulate) {
          continue;
        }
        if (order.startDate) {
          next[order.rentalId] = {
            step: receiveSteps.length,
            activationSynced: true,
          };
          continue;
        }
        if (!current) {
          next[order.rentalId] = { step: 1, activationSynced: false };
        }
      }
      for (const key of Object.keys(next)) {
        if (!activeIds.has(Number(key))) {
          delete next[Number(key)];
        }
      }
      return next;
    });
  }, [activeOrders]);

  useEffect(() => {
    saveTrackingState(receiveTrackingStorageKey, receiveTrackingById);
  }, [receiveTrackingById]);

  useEffect(() => {
    saveTrackingState(returnTrackingStorageKey, returnStepById);
  }, [returnStepById]);

  useEffect(() => {
    if (activeOrders.length === 0) return;

    const interval = setInterval(() => {
      setReceiveTrackingById((prev) => {
        const next = { ...prev };
        for (const order of activeOrders) {
          const current = next[order.rentalId];
          if (!current) continue;
          if (current.step >= receiveSteps.length) continue;
          next[order.rentalId] = { ...current, step: current.step + 1 };
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrders]);

  useEffect(() => {
    if (!token) return;

    for (const order of activeOrders) {
      const tracking = receiveTrackingById[order.rentalId];
      if (!tracking) continue;
      const completed = tracking.step >= receiveSteps.length;
      if (!completed) continue;
      if (tracking.activationSynced) continue;
      if (order.startDate && !tracking.forceResimulate) continue;
      if (activationInFlightRef.current[order.rentalId]) continue;

      activationInFlightRef.current[order.rentalId] = true;
      void apiPost(
        `/api/books/rentals/${order.rentalId}/activate`,
        {},
        token,
      )
        .then(async () => {
          setReceiveTrackingById((prev) => ({
            ...prev,
            [order.rentalId]: {
              step: receiveSteps.length,
              activationSynced: true,
              forceResimulate: false,
            },
          }));
          await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
        })
        .catch((error) => {
          toast({
            title: "อัปเดตสถานะรับของไม่สำเร็จ",
            description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
            variant: "destructive",
          });
        })
        .finally(() => {
          delete activationInFlightRef.current[order.rentalId];
        });
    }
  }, [activeOrders, receiveTrackingById, token, queryClient, toast]);

  useEffect(() => {
    if (Object.keys(returnStepById).length === 0) return;
    const interval = setInterval(() => {
      setReturnStepById((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(prev)) {
          const current = value ?? 1;
          if (current < returnSteps.length) {
            next[Number(key)] = current + 1;
          }
        }
        return next;
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [returnStepById]);

  useEffect(() => {
    if (orders.length === 0) return;
    setPausedAtById((prev) => {
      const next = { ...prev };
      for (const order of orders) {
        if (order.status === "รอคืน" && !next[order.rentalId]) {
          next[order.rentalId] = Date.now();
        }
        if (order.status === "คืนแล้ว" && next[order.rentalId]) {
          delete next[order.rentalId];
        }
      }
      return next;
    });
  }, [orders]);

  const handlePayFine = async (rentalId: number) => {
    if (!token) {
      return;
    }

    try {
      const result = await apiPost<{
        rentalId: number;
        pastDueDays: number;
        fineAmount: number;
        balanceAfter: number;
      }>(`/api/books/rentals/${rentalId}/pay-fine`, {}, token);

      toast({
        title: "ชำระค่าปรับสำเร็จ",
        description: `ยอดค่าปรับ ฿${result.data.fineAmount} • ยอดคงเหลือ ฿${result.data.balanceAfter}`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-rentals"] }),
        queryClient.invalidateQueries({ queryKey: ["auth-me"] }),
      ]);
    } catch (error) {
      toast({
        title: "ชำระค่าปรับไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleRequestReturn = async (order: RentalOrder) => {
    const carrier = returnCarrierById[order.rentalId];
    const tracking = (returnTrackingById[order.rentalId] ?? "").trim();

    if (!carrier) {
      toast({ title: "กรุณาเลือกบริษัทขนส่ง", variant: "destructive" });
      return;
    }
    if (!tracking) {
      toast({
        title: "รหัสติดตามพัสดุไม่ถูกต้อง",
        description: "กรุณากรอกรหัสติดตามพัสดุ",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({ title: "กรุณาเข้าสู่ระบบก่อน", variant: "destructive" });
      return;
    }

    try {
      const simulatedOffsetDays = simulatedDaysById[order.rentalId] ?? 0;
      const simulatedNow = (pausedAtById[order.rentalId] ?? Date.now()) + simulatedOffsetDays * 86400000;
      const daysLeft = order.endDate ? getDaysRemaining(order.endDate, simulatedNow) : null;
      const simulatedOverdueDays = daysLeft !== null && daysLeft < 0 ? Math.min(7, Math.abs(daysLeft)) : 0;

      await apiPost(
        `/api/books/rentals/${order.rentalId}/return`,
        simulatedOverdueDays > 0 ? { simulatedOverdueDays } : {},
        token,
      );
      setReturnStepById((prev) => ({ ...prev, [order.rentalId]: 1 }));
      setPausedAtById((prev) => ({ ...prev, [order.rentalId]: Date.now() }));
      setReturningRentalId(null);
      toast({ title: "ส่งคำขอคืนหนังสือแล้ว" });
      await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
    } catch (error) {
      toast({
        title: "ส่งคำขอคืนไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleSimulateAutoComplete = async (rentalId: number) => {
    if (!token) {
      toast({ title: "กรุณาเข้าสู่ระบบก่อน", variant: "destructive" });
      return;
    }

    try {
      await apiPost(`/api/books/rentals/${rentalId}/simulate-auto-complete`, {}, token);
      toast({ title: "จำลอง auto-complete แล้ว" });
      await queryClient.invalidateQueries({ queryKey: ["my-rentals"] });
    } catch (error) {
      toast({
        title: "จำลอง auto-complete ไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleRefreshReceiveStep = (rentalId: number) => {
    setReceiveTrackingById((prev) => ({
      ...prev,
      [rentalId]: { step: 1, activationSynced: false, forceResimulate: true },
    }));
    setPausedAtById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
  };
  const incrementSimulatedDays = (rentalId: number, step = 1) => {
    setSimulatedDaysById((prev) => ({
      ...prev,
      [rentalId]: (prev[rentalId] ?? 0) + step,
    }));
  };

  const resetSimulatedDays = (rentalId: number) => {
    setSimulatedDaysById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
  };


  const handleCancelReturn = (rentalId: number) => {
    setReturningRentalId(null);
    // ล้างค่าบริษัทขนส่ง
    setReturnCarrierById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
    // ล้างค่าเลข Tracking
    setReturnTrackingById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1 space-y-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">แดชบอร์ดของฉัน</h1>
          <p className="text-muted-foreground">ติดตามสถานะการเช่าและการส่งคืนแบบเรียลไทม์</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "กำลังเช่า", value: activeOrders.filter(o => o.status === "กำลังยืม").length, icon: BookOpen, color: "text-primary" },
            { label: "รายการทั้งหมด", value: orders.length, icon: Clock, color: "text-warning" },
            { label: "เลยกำหนด", value: activeOrders.filter(o => o.status === "เลยกำหนด").length, icon: AlertTriangle, color: "text-destructive" },
            { label: "คืนแล้ว", value: historyOrders.length, icon: CheckCircle, color: "text-success" },
          ].map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </div>
              <span className="text-2xl font-display font-bold">{card.value}</span>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              ติดตามสถานะรับของ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeOrders.length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีคำสั่งเช่าที่ต้องติดตาม</p>
            ) : (
              activeOrders.map((order) => (
                <div key={`receive-${order.rentalId}`} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{order.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">RENT-{order.rentalId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRefreshReceiveStep(order.rentalId)}
                        aria-label="รีเฟรชสถานะรับของ"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Badge variant="secondary">
                        ขั้นตอน {Math.min(receiveTrackingById[order.rentalId]?.step ?? 1, receiveSteps.length)}/{receiveSteps.length}
                      </Badge>
                    </div>
                  </div>
                  <StepProgress
                    steps={receiveSteps}
                    completedCount={Math.min(receiveTrackingById[order.rentalId]?.step ?? 1, receiveSteps.length)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              คำสั่งเช่าปัจจุบัน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeOrders.length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีคำสั่งเช่าปัจจุบัน</p>
            ) : (
              activeOrders.map((order) => {
                const Icon = statusIcons[order.status];
                const tracking = receiveTrackingById[order.rentalId];
                const isResimulating = Boolean(tracking?.forceResimulate);
                const delivered = Boolean(order.startDate && order.endDate && !isResimulating);
                const pausedAt = pausedAtById[order.rentalId];
                const simulatedOffsetDays = simulatedDaysById[order.rentalId] ?? 0;
                const simulatedNow = (pausedAt ?? Date.now()) + simulatedOffsetDays * 86400000;
                const totalDays = planDaysMap[order.rentalPlan] ?? 15;
                const daysLeft = delivered && order.endDate
                  ? getDaysRemaining(order.endDate, simulatedNow)
                  : null;
                const isLowTime = daysLeft !== null && daysLeft <= 2;
                const remainingLabel = pausedAt
                  ? "หยุดจับเวลาแล้ว"
                  : daysLeft !== null
                    ? (daysLeft > 0 ? `${daysLeft} วัน` : daysLeft === 0 ? "0 วัน" : `เลยกำหนดแล้ว ${Math.abs(daysLeft)} วัน!`)
                    : "-";
                const progressValue = pausedAt
                  ? 100
                  : daysLeft !== null
                    ? Math.max(0, Math.min(100, (1 - daysLeft / totalDays) * 100))
                    : 0;

                const rawOverdueDays = daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : 0;
                const simulatedOverdueDays = Math.min(7, rawOverdueDays);
                const overdueDays = simulatedOverdueDays > 0
                  ? simulatedOverdueDays
                  : (order.status === "เลยกำหนด" ? Math.min(7, Math.max(order.pastDueDays, 1)) : 0);
                const overdueFine = Math.round(order.rentalPrice * 0.25 * overdueDays * 100) / 100;

                return (
                  <div key={order.rentalId} className="bg-card rounded-xl border p-4 md:p-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <img src={resolveImageUrl(order.bookCover)} alt={order.bookTitle} className="w-20 h-28 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display font-semibold text-lg">{order.bookTitle}</h3>
                            <p className="text-xs text-muted-foreground">RENT-{order.rentalId}</p>
                          </div>
                          <Badge className={`${statusColors[order.status]} border`}>
                            <Icon className="h-3 w-3 mr-1" /> {order.status}
                          </Badge>
                          {overdueDays > 0 && (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                              ค่าปรับล่าช้า
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>รับ: {delivered ? new Date(order.startDate!).toLocaleDateString() : "—"}</span>
                          <span>คืน: {delivered ? new Date(order.endDate!).toLocaleDateString() : "—"}</span>
                          <span className="font-semibold text-foreground">฿{order.totalPrice}</span>
                        </div>

                        {delivered ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">เหลือเวลาเช่า</span>
                              <span className={isLowTime ? "text-destructive font-semibold" : "text-primary font-semibold"}>
                                {remainingLabel}
                              </span>
                            </div>
                            <Progress value={progressValue} className="h-2" />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">ระบบจะเริ่มนับเวลาเช่าหลังจากที่คุณได้รับหนังสือแล้ว</p>
                        )}
                      </div>
                    </div>

                    {overdueDays > 0 && (
                      <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                        <span className="text-destructive font-semibold">ค่าปรับ: ฿{overdueFine.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-2">(เลยกำหนด {overdueDays} วัน)</span>
                        {order.status === "เลยกำหนด" ? (
                          order.finePaidAt ? (
                            <span className="ml-2 text-success">ชำระแล้ว</span>
                          ) : (
                            <Button
                              size="sm"
                              className="ml-3"
                              onClick={() => { void handlePayFine(order.rentalId); }}
                            >
                              ชำระค่าปรับ
                            </Button>
                          )
                        ) : null}
                      </div>
                    )}

                    
                      {returningRentalId !== order.rentalId ? (
                        order.status === "รอคืน" || returnStepById[order.rentalId] !== undefined ? (
                          <Button variant="secondary" size="sm" disabled>
                            ยืนยันคืนแล้ว
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReturningRentalId(order.rentalId)}
                            disabled={!delivered}
                          >
                            คืนหนังสือ
                          </Button>
                        )
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm font-medium mb-1">บริษัทขนส่ง</p>
                              <Select
                                value={returnCarrierById[order.rentalId] ?? ""}
                                onValueChange={(value) =>
                                  setReturnCarrierById((prev) => ({ ...prev, [order.rentalId]: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="เลือกบริษัทขนส่ง" />
                                </SelectTrigger>
                                <SelectContent>
                                  {carriers.map((carrier, index) => (
                                    <SelectItem key={carrier} value={carrier}>
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={carrierLogos[index]}
                                          alt={carrier}
                                          className="h-5 w-9 rounded object-fill bg-white"
                                        />
                                        <span>{carrier}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {returnCarrierById[order.rentalId] ? (
                              <div>
                                <p className="text-sm font-medium mb-1">รหัสติดตามพัสดุ</p>
                                <Input
                                  value={returnTrackingById[order.rentalId] ?? ""}
                                  onChange={(event) =>
                                    setReturnTrackingById((prev) => ({ ...prev, [order.rentalId]: event.target.value }))
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => { void handleRequestReturn(order); }}
                              disabled={!returnCarrierById[order.rentalId] || !(returnTrackingById[order.rentalId] ?? "").trim()}
                            >
                              ยืนยันการคืนหนังสือ
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCancelReturn(order.rentalId)}>
                              ยกเลิก
                            </Button>
                          </div>
                        </div>
                      )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => incrementSimulatedDays(order.rentalId, 15)}
                      >
                        +15 วัน
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => incrementSimulatedDays(order.rentalId, 7)}
                      >
                        +7 วัน
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => incrementSimulatedDays(order.rentalId)}
                      >
                        +1 วัน
                      </Button>
                      {rawOverdueDays > 7 ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { void handleSimulateAutoComplete(order.rentalId); }}
                        >
                          จำลอง auto-complete
                        </Button>
                      ) : null}
                      {simulatedOffsetDays > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetSimulatedDays(order.rentalId)}
                        >
                          Reset
                        </Button>
                      ) : null}
                      {simulatedOffsetDays > 0 ? (
                        <Badge variant="secondary">Sim +{simulatedOffsetDays}d</Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              ติดตามสถานะส่งคืน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {returningOrders.length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีรายการส่งคืน</p>
            ) : (
              returningOrders
                .filter((order) => returnStepById[order.rentalId] !== undefined)
                .map((order) => (
                  <div key={`return-${order.rentalId}`} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{order.bookTitle}</p>
                        <p className="text-xs text-muted-foreground">RENT-{order.rentalId}</p>
                      </div>
                      <Badge variant="secondary">
                        ขั้นตอน {Math.min(returnStepById[order.rentalId] ?? 1, returnSteps.length)}/{returnSteps.length}
                      </Badge>
                    </div>
                    <StepProgress
                      steps={returnSteps}
                      completedCount={Math.min(returnStepById[order.rentalId] ?? 1, returnSteps.length)}
                    />
                    <div className="text-sm text-muted-foreground">
                      {returnCarrierById[order.rentalId] ? `บริษัทขนส่ง: ${returnCarrierById[order.rentalId]}` : null}
                      {returnTrackingById[order.rentalId] ? ` • รหัสติดตามพัสดุ: ${returnTrackingById[order.rentalId]}` : null}
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              ประวัติการเช่า
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyOrders.length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีประวัติการเช่า</p>
            ) : (
              historyOrders.map((order) => {
              const overdueFineHistory = Math.round(order.rentalPrice * 0.25 * Math.min(7, Math.max(order.pastDueDays, 0)) * 100) / 100;
              const totalFineHistory = Math.max(0, order.fineAmountTotal ?? (overdueFineHistory + order.conditionFineAmount));
              const refundedDeposit = Math.max(0, order.depositPrice - totalFineHistory);
              const extraCharged = Math.max(0, totalFineHistory - order.depositPrice);

              return (
              <div key={order.rentalId} className="bg-card rounded-xl border p-4 md:p-6 flex flex-col md:flex-row gap-4 opacity-80">
                <img src={resolveImageUrl(order.bookCover)} alt={order.bookTitle} className="w-20 h-28 rounded-lg object-cover shrink-0" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold">{order.bookTitle}</h3>
                      <p className="text-xs text-muted-foreground">RENT-{order.rentalId}</p>
                    </div>
                    <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> คืนแล้ว</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                    <span>{new Date(order.startDate!).toLocaleDateString()} — {new Date(order.endDate!).toLocaleDateString()}</span>
                    <span>฿{order.totalPrice}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">มัดจำ: ฿{order.depositPrice.toLocaleString()}</span>
                      {totalFineHistory > 0 ? (
                        <span className="text-destructive font-medium">หักค่าปรับ: -฿{totalFineHistory.toLocaleString()}</span>
                      ) : (
                        <span className="text-success font-medium">ไม่มีค่าปรับ</span>
                      )}
                      <span className="text-success font-medium">คืนสุทธิ: ฿{refundedDeposit.toLocaleString()}</span>
                      {extraCharged > 0 ? (
                        <span className="text-destructive font-medium">ตัดบัญชี: ฿{extraCharged.toLocaleString()}</span>
                      ) : null}
                    </div>
                  </div>
                  {(order.pastDueDays > 0 || order.conditionFineAmount > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {order.pastDueDays > 0 && (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                          {"\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e31\u0e1a\u0e25\u0e48\u0e32\u0e0a\u0e49\u0e32"}
                        </Badge>
                      )}
                      {order.conditionFineAmount > 0 && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                          {"\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e31\u0e1a\u0e2a\u0e20\u0e32\u0e1e"}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/book/${order.bookId}`}>เช่าอีกครั้ง</Link>
                    </Button>
                    {order.reviewId ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => openReviewDialog(order)}>
                          แก้ไขรีวิว
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { void handleDeleteReview(order); }}>
                          ลบรีวิว
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openReviewDialog(order)}>
                        เขียนรีวิว
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
            })
          )}
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={Boolean(reviewingOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingOrder(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingReview ? "แก้ไขรีวิวของคุณ" : "การเช่าครั้งนี้เป็นยังไงบ้าง?"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">ชื่อหนังสือ: {reviewingOrder?.bookTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="rounded p-1"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={star <= reviewRating ? "h-5 w-5 text-accent fill-current" : "h-5 w-5 text-muted-foreground"}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{reviewRating > 0 ? `${reviewRating} ดาว` : "ให้คะแนนการเช่าครั้งนี้"}</span>
            </div>
            <div>
              <Textarea
                rows={4}
                placeholder="แบ่งปันความคิดเห็นของคุณซักหน่อย"
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewingOrder(null)} disabled={reviewSubmitting}>
                ยกเลิก
              </Button>
              <Button onClick={() => { void handleSubmitReview(); }} disabled={reviewSubmitting}>
                {reviewSubmitting ? "กำลังส่ง..." : isEditingReview ? "บันทึกการแก้ไข" : "ส่งรีวิว"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default CustomerDashboard;

