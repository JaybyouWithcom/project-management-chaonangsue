import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState, type ElementType } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  Landmark,
  Smartphone,
  CreditCard,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { apiGet, apiPost, HttpError } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import qrPromptPayLogo from "@/assets/payment-gateway/QRPromptPay.png";
import visaLogo from "@/assets/payment-gateway/Visa.png";
import mastercardLogo from "@/assets/payment-gateway/Mastercard.png";
import jcbLogo from "@/assets/payment-gateway/JCB.png";
import unionPayLogo from "@/assets/payment-gateway/UnionPay.png";
import amexLogo from "@/assets/payment-gateway/AmericanExpress.png";
import trueMoneyLogo from "@/assets/payment-gateway/TrueMoney.png";
import applePayLogo from "@/assets/payment-gateway/ApplePay.png";
import googlePayLogo from "@/assets/payment-gateway/GooglePay.png";
import shopeePayLogo from "@/assets/payment-gateway/ShopeePay.png";
import linePayLogo from "@/assets/payment-gateway/LinePay.png";
import kplusLogo from "@/assets/payment-gateway/mobile-banking/KPLUS.png";
import scbEasyLogo from "@/assets/payment-gateway/mobile-banking/SCBEASY.png";
import krungthaiNextLogo from "@/assets/payment-gateway/mobile-banking/KrungthaiNEXT.png";
import krungsriMobileLogo from "@/assets/payment-gateway/mobile-banking/Krungsri.png";
import bangkokBankMobileLogo from "@/assets/payment-gateway/mobile-banking/BangkokBank.png";
import kbankLogo from "@/assets/payment-gateway/direct-debit/KBANK.png";
import scbLogo from "@/assets/payment-gateway/direct-debit/SCB.png";
import ktbLogo from "@/assets/payment-gateway/direct-debit/KTB.png";
import bayLogo from "@/assets/payment-gateway/direct-debit/BAY.png";
import bblLogo from "@/assets/payment-gateway/direct-debit/BBL.png";

interface AuthUser {
  userId: number;
  balance: string;
}

interface TopUpResponse {
  user: AuthUser;
  amount: number;
  method: string;
}

interface PaymentMethod {
  id: string;
  label: string;
  description: string;
  icon?: ElementType;
  imageSrc?: string;
  subOptions?: string[];
  brands?: string[];
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const paymentMethods: PaymentMethod[] = [
  {
    id: "promptpay",
    label: "QR PromptPay",
    description: "สแกนจ่ายได้ทันที",
    imageSrc: qrPromptPayLogo,
  },
  {
    id: "mobile-banking",
    label: "Mobile Banking",
    description: "เลือกแอปธนาคารบนมือถือ",
    icon: Smartphone,
    subOptions: ["K PLUS", "SCB EASY", "Krungthai NEXT", "Krungsri Mobile App", "Bangkok Bank Mobile Banking"],
  },
  {
    id: "bank-account",
    label: "ตัดบัญชีธนาคาร",
    description: "หักเงินจากบัญชีธนาคาร",
    icon: Landmark,
    subOptions: ["ธนาคารกสิกรไทย", "ธนาคารไทยพาณิชย์", "ธนาคารกรุงไทย", "ธนาคารกรุงศรีอยุธยา", "ธนาคารกรุงเทพ"],
  },
  {
    id: "credit-debit",
    label: "บัตรเครดิต/เดบิต",
    description: "รองรับบัตรหลัก",
    icon: CreditCard,
    brands: ["Visa", "Mastercard", "JCB", "UnionPay", "AMEX"],
  },
  {
    id: "truemoney",
    label: "TrueMoney",
    description: "เติมผ่าน TrueMoney Wallet",
    imageSrc: trueMoneyLogo,
  },
  {
    id: "apple-pay",
    label: "Apple Pay",
    description: "ชำระผ่าน Apple Pay",
    imageSrc: applePayLogo,
  },
  {
    id: "google-pay",
    label: "Google Pay",
    description: "ชำระผ่าน Google Pay",
    imageSrc: googlePayLogo,
  },
  {
    id: "shopeepay",
    label: "ShopeePay",
    description: "เติมด้วย ShopeePay",
    imageSrc: shopeePayLogo,
  },
  {
    id: "line-pay",
    label: "LINE Pay",
    description: "เติมด้วย LINE Pay",
    imageSrc: linePayLogo,
  },
];

const brandLogoMap: Record<string, string> = {
  Visa: visaLogo,
  Mastercard: mastercardLogo,
  JCB: jcbLogo,
  UnionPay: unionPayLogo,
  AMEX: amexLogo,
};

const subOptionLogosByMethodId: Record<string, string[]> = {
  "mobile-banking": [kplusLogo, scbEasyLogo, krungthaiNextLogo, krungsriMobileLogo, bangkokBankMobileLogo],
  "bank-account": [kbankLogo, scbLogo, ktbLogo, bayLogo, bblLogo],
};

const WalletTopupPage = () => {
  const token = getAuthToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [amountInput, setAmountInput] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  const { data: user, isLoading } = useQuery({
    queryKey: ["wallet-topup-me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await apiGet<{ user: AuthUser }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const amount = Number(amountInput);
  const isAmountValid = Number.isFinite(amount) && amount > 0;

  const selectedMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedMethodId) ?? null,
    [selectedMethodId],
  );

  const resolvedMethodLabel = selectedMethod
    ? selectedMethod.subOptions
      ? selectedSubOption
        ? `${selectedMethod.label} - ${selectedSubOption}`
        : ""
      : selectedMethod.label
    : "";

  const canConfirm = Boolean(isAmountValid && selectedMethod && resolvedMethodLabel);
  const confirmLabel = isAmountValid
    ? `ยืนยันการเติมเงิน (${amount.toFixed(2)} บาท)`
    : "ยืนยันการเติมเงิน";
  const balance = Number(user?.balance);
  const balanceLabel = Number.isFinite(balance) ? `฿${currencyFormatter.format(balance)}` : "฿-";

  const handleSelectMethod = (method: PaymentMethod) => {
    if (!isAmountValid) {
      return;
    }
    setSelectedMethodId(method.id);
    setSelectedSubOption(null);
  };

  const handleConfirmTopup = async () => {
    if (!token || !canConfirm) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost<TopUpResponse>(
        "/api/auth/wallet/topup",
        {
          amount,
          method: resolvedMethodLabel,
        },
        token,
      );

      setSuccessAmount(response.data.amount);
      setSuccessOpen(true);
      setAmountInput("");
      setSelectedMethodId(null);
      setSelectedSubOption(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["auth-me"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-me"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions", token] }),
        queryClient.invalidateQueries({ queryKey: ["wallet-topup-me", token] }),
        queryClient.invalidateQueries({ queryKey: ["settings-me", token] }),
      ]);
    } catch (error) {
      toast({
        title: "เติมเงินไม่สำเร็จ",
        description: error instanceof HttpError ? error.message : "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-3xl md:text-4xl font-bold">เติมเงินวอลเล็ต</h1>
            <Button variant="outline" asChild>
              <Link to="/wallet">
                <ChevronLeft className="h-4 w-4 mr-1" />
                กลับหน้าวอลเล็ต
              </Link>
            </Button>
          </div>

          {!token ? (
            <Card>
              <CardHeader>
                <CardTitle>กรุณาเข้าสู่ระบบ</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/auth">ไปหน้าเข้าสู่ระบบ</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="text-sm text-muted-foreground">ยอดเงินคงเหลือปัจจุบัน</div>
                  <div className="text-2xl font-display font-bold text-primary">
                    {isLoading ? "กำลังโหลด..." : balanceLabel}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="topup-amount" className="text-sm font-medium">
                      จำนวนเงิน (บาท)
                    </label>
                    <Input
                      id="topup-amount"
                      type="number"
                      min={1}
                      step="0.01"
                      value={amountInput}
                      onChange={(event) => setAmountInput(event.target.value)}
                      placeholder="กรอกจำนวนเงินที่ต้องการเติม"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleSelectMethod(method)}
                      disabled={!isAmountValid}
                      className={cn(
                        "text-left rounded-xl border bg-card p-4 transition-colors min-h-32",
                        !isAmountValid && "opacity-45 saturate-0 cursor-not-allowed",
                        isAmountValid && "hover:border-primary/50",
                        isSelected && "border-primary ring-1 ring-primary/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{method.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
                        </div>
                        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                          {method.imageSrc ? (
                            <img src={method.imageSrc} alt={method.label} className="h-9 w-9 rounded object-contain" />
                          ) : (
                            Icon && <Icon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                      {method.brands && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {method.brands.map((brand) => (
                            <span key={brand} className="h-8 px-2 rounded-lg border flex items-center">
                              <img src={brandLogoMap[brand]} alt={brand} className="h-5 rounded object-contain" />
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedMethod?.subOptions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">เลือกช่องทางย่อย: {selectedMethod.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectedMethod.subOptions.map((option, index) => {
                      const logoSrc = subOptionLogosByMethodId[selectedMethod.id]?.[index];
                      const logoRoundedClass = selectedMethod.id === "mobile-banking" ? "rounded-md" : "rounded-full";

                      return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedSubOption(option)}
                        className={cn(
                          "text-sm rounded-md border px-3 py-2 text-left hover:border-primary/60 transition-colors",
                          selectedSubOption === option && "bg-primary text-primary-foreground border-primary",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {logoSrc && (
                            <img
                              src={logoSrc}
                              alt={option}
                              className={cn("h-6 w-6 object-cover shrink-0", logoRoundedClass)}
                            />
                          )}
                          <span>{option}</span>
                        </span>
                      </button>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={() => void handleConfirmTopup()} disabled={!canConfirm || submitting} size="lg">
                  {submitting ? "กำลังยืนยัน..." : confirmLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />

      <Dialog
        open={successOpen}
        onOpenChange={(open) => {
          setSuccessOpen(open);
          if (!open) {
            navigate("/wallet");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <CheckCircle2 className="h-14 w-14 text-green-600" />
            <DialogTitle>เติมเงินสำเร็จ</DialogTitle>
            <DialogDescription>
              เติมเงินจำนวน ฿{currencyFormatter.format(successAmount)} เรียบร้อยแล้ว
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setSuccessOpen(false);
                navigate("/wallet");
              }}
            >
              กลับสู่วอลเล็ต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletTopupPage;
