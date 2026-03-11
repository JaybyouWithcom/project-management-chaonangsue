import { useEffect, useMemo, useState } from "react";
import { Clock, Package, BookOpen, AlertTriangle, CheckCircle, Calendar, Truck, RotateCcw, RotateCw, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiGet, apiPost, HttpError, resolveImageUrl } from "@/lib/api";
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
  startDate: string;
  endDate: string;
  rentalPrice: number;
  depositPrice: number;
  status: "กำลังยืม" | "รอคืน" | "คืนแล้ว" | "เลยกำหนด";
  totalPrice: number;
  pastDueDays: number;
  fineAmountDue: number;
  fineAmountTotal: number;
  finePaidAt: string | null;
  paymentStatus: "รอชำระ" | "ชำระแล้ว" | "ยกเลิก";
  returnRequestedAt: string | null;
  returnDeliverySentAt: string | null;
  returnDeliveryProofPath: string | null;
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

  const [receiveStepById, setReceiveStepById] = useState<Record<number, number>>({});
  const [returnStepById, setReturnStepById] = useState<Record<number, number>>({});
  const [returningRentalId, setReturningRentalId] = useState<number | null>(null);
  const [returnCarrierById, setReturnCarrierById] = useState<Record<number, string>>({});
  const [returnTrackingById, setReturnTrackingById] = useState<Record<number, string>>({});
  const [pausedAtById, setPausedAtById] = useState<Record<number, number>>({});
  const [startDateOverrideById, setStartDateOverrideById] = useState<Record<number, string>>({});
  const [endDateOverrideById, setEndDateOverrideById] = useState<Record<number, string>>({});

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

  useEffect(() => {
    if (activeOrders.length === 0) return;

    setReceiveStepById((prev) => {
      const next = { ...prev };
        for (const order of activeOrders) {
          if (next[order.rentalId] === undefined || next[order.rentalId] === 0) {
            next[order.rentalId] = 1;
          }
        }
      return next;
    });

    const interval = setInterval(() => {
      setReceiveStepById((prev) => {
        const next = { ...prev };
        for (const order of activeOrders) {
          const current = next[order.rentalId] ?? 1;
          if (current < receiveSteps.length) {
            next[order.rentalId] = current + 1;
          }
        }
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrders]);

  useEffect(() => {
    const deliveredIds = activeOrders
      .filter((order) => (receiveStepById[order.rentalId] ?? 0) >= receiveSteps.length)
      .map((order) => order.rentalId);

    if (deliveredIds.length === 0) return;

    setStartDateOverrideById((prev) => {
      const next = { ...prev };
      for (const order of activeOrders) {
        if (!deliveredIds.includes(order.rentalId)) continue;
        if (!next[order.rentalId]) {
          next[order.rentalId] = new Date().toISOString();
        }
      }
      return next;
    });

    setEndDateOverrideById((prev) => {
      const next = { ...prev };
      for (const order of activeOrders) {
        if (!deliveredIds.includes(order.rentalId)) continue;
        if (!next[order.rentalId]) {
          const durationMs = new Date(order.endDate).getTime() - new Date(order.startDate).getTime();
          const startOverride = startDateOverrideById[order.rentalId]
            ? new Date(startDateOverrideById[order.rentalId])
            : new Date();
          next[order.rentalId] = new Date(startOverride.getTime() + durationMs).toISOString();
        }
      }
      return next;
    });
  }, [activeOrders, receiveStepById, startDateOverrideById]);

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

  const handleRequestReturn = (order: RentalOrder) => {
    const carrier = returnCarrierById[order.rentalId];
    const tracking = (returnTrackingById[order.rentalId] ?? "").trim();

    if (!carrier) {
      toast({ title: "กรุณาเลือกบริษัทขนส่ง", variant: "destructive" });
      return;
    }
    if (!tracking) {
      toast({
        title: "Tracking Number ไม่ถูกต้อง",
        description: "กรุณากรอก Tracking Number",
        variant: "destructive",
      });
      return;
    }

    setReturnStepById((prev) => ({ ...prev, [order.rentalId]: 1 }));
    setPausedAtById((prev) => ({ ...prev, [order.rentalId]: Date.now() }));
    setReturningRentalId(null);
    toast({ title: "ส่งคำขอคืนหนังสือแล้ว" });
  };

  const handleRefreshReceiveStep = (rentalId: number) => {
    setReceiveStepById((prev) => ({ ...prev, [rentalId]: 1 }));
    setStartDateOverrideById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
    setEndDateOverrideById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
    setPausedAtById((prev) => {
      const next = { ...prev };
      delete next[rentalId];
      return next;
    });
  };

  const getEffectiveStartDate = (order: RentalOrder) =>
    startDateOverrideById[order.rentalId] ?? order.startDate;

  const getEffectiveEndDate = (order: RentalOrder) =>
    endDateOverrideById[order.rentalId] ?? order.endDate;

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
                        ขั้นตอน {Math.min(receiveStepById[order.rentalId] ?? 1, receiveSteps.length)}/{receiveSteps.length}
                      </Badge>
                    </div>
                  </div>
                  <StepProgress
                    steps={receiveSteps}
                    completedCount={Math.min(receiveStepById[order.rentalId] ?? 1, receiveSteps.length)}
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
                const effectiveStart = getEffectiveStartDate(order);
                const effectiveEnd = getEffectiveEndDate(order);
                const pausedAt = pausedAtById[order.rentalId];
                const daysLeft = getDaysRemaining(effectiveEnd, pausedAt ?? Date.now());
                const delivered = (receiveStepById[order.rentalId] ?? 0) >= receiveSteps.length;

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
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>รับ: {delivered ? new Date(effectiveStart).toLocaleDateString() : "—"}</span>
                          <span>คืน: {delivered ? new Date(effectiveEnd).toLocaleDateString() : "—"}</span>
                          <span className="font-semibold text-foreground">฿{order.totalPrice}</span>
                        </div>

                        {delivered ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">เหลือเวลาเช่า</span>
                              <span className={daysLeft <= 2 ? "text-destructive font-semibold" : "text-primary font-semibold"}>
                                {pausedAt ? "หยุดจับเวลาแล้ว" : (daysLeft > 0 ? `${daysLeft} วัน` : "เลยกำหนดแล้ว!")}
                              </span>
                            </div>
                            <Progress value={pausedAt ? 100 : Math.max(0, Math.min(100, (1 - daysLeft / 7) * 100))} className="h-2" />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">ระบบจะเริ่มนับเวลาเช่าหลังจากที่คุณได้รับหนังสือแล้ว</p>
                        )}
                      </div>
                    </div>

                    {order.status === "เลยกำหนด" && (
                      <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                        <span className="text-destructive font-semibold">ค่าปรับ: ฿{order.fineAmountDue}</span>
                        <span className="text-muted-foreground ml-2">(เลยกำหนด {order.pastDueDays} วัน)</span>
                        {order.finePaidAt ? (
                          <span className="ml-2 text-success">ชำระแล้ว</span>
                        ) : (
                          <Button
                            size="sm"
                            className="ml-3"
                            onClick={() => { void handlePayFine(order.rentalId); }}
                          >
                            ชำระค่าปรับ
                          </Button>
                        )}
                      </div>
                    )}

                    
                      {returningRentalId !== order.rentalId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturningRentalId(order.rentalId)}
                          disabled={!delivered}
                        >
                          คืนหนังสือ
                        </Button>
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
                                <p className="text-sm font-medium mb-1">Tracking Number</p>
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
                              onClick={() => handleRequestReturn(order)}
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
            {Object.keys(returnStepById).length === 0 ? (
              <p className="text-muted-foreground">ยังไม่มีรายการส่งคืน</p>
            ) : (
              activeOrders
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
                      {returnTrackingById[order.rentalId] ? ` • Tracking Number: ${returnTrackingById[order.rentalId]}` : null}
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
            {historyOrders.map((order) => (
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
                    <span>{new Date(order.startDate).toLocaleDateString()} — {new Date(order.endDate).toLocaleDateString()}</span>
                    <span>฿{order.totalPrice}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-success font-medium">คืนมัดจำแล้ว: ฿{order.depositPrice}</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">เช่าอีกครั้ง</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default CustomerDashboard;
