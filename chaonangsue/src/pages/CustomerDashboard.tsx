import { Clock, Package, BookOpen, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockOrders } from "@/lib/mockData";

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

const getDaysRemaining = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
};

const CustomerDashboard = () => {
  const activeOrders = mockOrders.filter((o) => !["คืนแล้ว"].includes(o.status));
  const historyOrders = mockOrders.filter((o) => o.status === "คืนแล้ว");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">แดชบอร์ดของฉัน</h1>
        <p className="text-muted-foreground mb-8">ติดตามสถานะการเช่าและประวัติการใช้งาน</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "กำลังเช่า", value: activeOrders.filter(o => o.status === "กำลังยืม").length, icon: BookOpen, color: "text-primary" },
            { label: "รอยืนยัน", value: activeOrders.filter(o => o.status === "รอยืนยัน").length, icon: Clock, color: "text-warning" },
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

        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active">คำสั่งเช่าปัจจุบัน ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="history">ประวัติ ({historyOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.map((order) => {
              const Icon = statusIcons[order.status];
              const daysLeft = getDaysRemaining(order.endDate);
              return (
                <div key={order.id} className="bg-card rounded-xl border p-4 md:p-6 flex flex-col md:flex-row gap-4">
                  <img src={order.bookCover} alt={order.bookTitle} className="w-20 h-28 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-semibold text-lg">{order.bookTitle}</h3>
                        <p className="text-xs text-muted-foreground">{order.id}</p>
                      </div>
                      <Badge className={`${statusColors[order.status]} border`}>
                        <Icon className="h-3 w-3 mr-1" /> {order.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>รับ: {order.startDate}</span>
                      <span>คืน: {order.endDate}</span>
                      <span className="font-semibold text-foreground">฿{order.totalPrice}</span>
                    </div>
                    {order.status === "กำลังยืม" && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">เหลือเวลาอีก</span>
                          <span className={daysLeft <= 2 ? "text-destructive font-semibold" : "text-primary font-semibold"}>
                            {daysLeft > 0 ? `${daysLeft} วัน` : "เลยกำหนดแล้ว!"}
                          </span>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, (1 - daysLeft / 7) * 100))} className="h-2" />
                      </div>
                    )}
                    {order.status === "เลยกำหนด" && (
                      <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                        <span className="text-destructive font-semibold">ค่าปรับ: ฿{order.penalty}</span>
                        <span className="text-muted-foreground ml-2">(เลยกำหนด {Math.abs(daysLeft)} วัน)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyOrders.map((order) => (
              <div key={order.id} className="bg-card rounded-xl border p-4 md:p-6 flex flex-col md:flex-row gap-4 opacity-80">
                <img src={order.bookCover} alt={order.bookTitle} className="w-20 h-28 rounded-lg object-cover shrink-0" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold">{order.bookTitle}</h3>
                      <p className="text-xs text-muted-foreground">{order.id}</p>
                    </div>
                    <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> คืนแล้ว</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                    <span>{order.startDate} — {order.endDate}</span>
                    <span>฿{order.totalPrice}</span>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">เช่าอีกครั้ง</Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default CustomerDashboard;
