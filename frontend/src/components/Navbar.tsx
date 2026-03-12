import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Search, User, Menu, X, Settings, Wallet, Store, LogIn, LogOut, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { clearAuthToken, getAuthToken } from "@/lib/auth";
import { apiGet } from "@/lib/api";

import myLogo from "@/assets/logo.png";

interface AuthUser {
  userId: number;
  balance: string;
  role: "Customer" | "Admin" | "Banned";
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(Boolean(getAuthToken()));

  useEffect(() => {
    setLoggedIn(Boolean(getAuthToken()));
  }, [location.pathname]);

  const { data: me } = useQuery({
    queryKey: ["auth-me", loggedIn],
    enabled: loggedIn,
    retry: false,
    queryFn: async () => {
      const token = getAuthToken();
      const response = await apiGet<{ user: AuthUser }>("/api/auth/me", token ?? undefined);
      return response.data.user;
    },
  });

  const balanceLabel = useMemo(() => {
    if (!me) return "฿-";
    const balance = Number(me.balance);
    if (!Number.isFinite(balance)) return "฿-";
    return `฿${currencyFormatter.format(balance)}`;
  }, [me]);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "หน้าแรก", icon: BookOpen },
    { to: "/browse", label: "ค้นหาหนังสือ", icon: Search },
    { to: "/dashboard", label: "แดชบอร์ดของฉัน", icon: User },
    { to: "/store", label: "ร้านของฉัน", icon: Store },
    { to: "/settings", label: "การตั้งค่า", icon: Settings },
    { to: "/admin/dashboard", label: "แดชบอร์ดแอดมิน", icon: Shield },
  ];

  const navLinksToHideWhenLoggedOut = new Set(["/dashboard", "/store", "/settings", "/admin/dashboard"]);
  const visibleNavLinks = loggedIn
    ? navLinks.filter((link) => {
        if (link.to === "/admin/dashboard") return me?.role === "Admin";
        if (link.to === "/dashboard") return me?.role !== "Admin";
        if (link.to === "/store") return me?.role !== "Admin";
        return true;
      })
    : navLinks.filter((link) => !navLinksToHideWhenLoggedOut.has(link.to));

  return (
    <nav className="sticky top-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4 h-16 flex items-center">
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-2">
            <img src={myLogo} alt="ChaoNangsue Logo" className="h-11 w-11 object-contain" />
            <span className="font-display text-xl font-bold text-primary">ChaoNangsue</span>
            <span className="text-xs text-accent font-semibold">.com</span>
          </Link>
        </div>

        <div className="hidden md:flex flex-none items-center gap-1">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
          {/* ซ่อนยอดเงินคงเหลือบนจอใหญ่เมื่อยังไม่ล็อกอิน */}
          {loggedIn && (
            <Link
              to="/wallet"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border rounded-full text-sm hover:bg-secondary/70 transition-colors"
            >
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium text-muted-foreground">ยอดเงินคงเหลือ:</span>
              <span className="font-bold text-primary">{balanceLabel}</span>
            </Link>
          )}

          {loggedIn ? (
            <Button
              variant="outline"
              className="hidden md:inline-flex"
              onClick={() => {
                clearAuthToken();
                setLoggedIn(false);
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> ออกจากระบบ
            </Button>
          ) : (
            <Button asChild className="hidden md:inline-flex">
              <Link to="/auth"><LogIn className="h-4 w-4 mr-1" /> เข้าสู่ระบบ</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-card px-4 pb-4 pt-2 space-y-3">
          {/* ซ่อนยอดเงินคงเหลือบนมือถือเมื่อยังไม่ล็อกอิน */}
          {loggedIn && (
            <Link
              to="/wallet"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-3 py-3 bg-secondary/30 rounded-lg text-sm border hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="font-medium">ยอดเงินคงเหลือ</span>
              </div>
              <span className="font-bold text-primary">{balanceLabel}</span>
            </Link>
          )}

          <div className="space-y-1">
            {visibleNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-muted"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            {loggedIn ? (
              <button
                className="w-full text-left flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted"
                onClick={() => {
                  clearAuthToken();
                  setLoggedIn(false);
                  setMobileOpen(false);
                  navigate("/");
                }}
              >
                <LogOut className="h-4 w-4" /> ออกจากระบบ
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted"
              >
                <LogIn className="h-4 w-4" /> เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
