import { Link, useLocation } from "react-router-dom";
import { BookOpen, Search, User, LayoutDashboard, Menu, X, Settings, Wallet, Store } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "หน้าแรก", icon: BookOpen },
    { to: "/browse", label: "ค้นหาหนังสือ", icon: Search },
    { to: "/dashboard", label: "แดชบอร์ดของฉัน", icon: User },
    { to: "/admin", label: "ร้านของฉัน", icon: Store },
    { to: "/settings", label: "การตั้งค่า", icon: Settings },
  ];

  const balance = 500;

  return (
    <nav className="sticky top-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4 h-16 flex items-center">
        
        {/* ฝั่งซ้าย: Logo (ให้พื้นที่ flex-1 เพื่อดันส่วนกลางให้อยู่ตรงกลาง) */}
        <div className="flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-primary">
              ChaoNangsue
            </span>
            <span className="text-xs text-accent font-semibold">.com</span>
          </Link>
        </div>

        {/* ตรงกลาง: Desktop nav */}
        <div className="hidden md:flex flex-none items-center gap-1">
          {navLinks.map((link) => (
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

        {/* ฝั่งขวา: Balance & Mobile Toggle (ให้พื้นที่ flex-1 เพื่อสมดุลกับฝั่งซ้าย) */}
        <div className="flex-1 flex justify-end items-center gap-4">
          {/* Desktop Balance */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border rounded-full text-sm">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="font-medium text-muted-foreground">ยอดเงินคงเหลือ:</span>
            <span className="font-bold text-primary">฿{balance}</span>
          </div>

          {/* Mobile toggle */}
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

      {/* Mobile nav (ยังคงรูปแบบเดิม) */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-card px-4 pb-4 pt-2 space-y-3">
          <div className="flex items-center justify-between px-3 py-3 bg-secondary/30 rounded-lg text-sm border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">ยอดเงินคงเหลือ</span>
            </div>
            <span className="font-bold text-primary">฿{balance}</span>
          </div>

          <div className="space-y-1">
            {navLinks.map((link) => (
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
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
