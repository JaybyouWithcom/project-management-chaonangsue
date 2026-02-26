import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-primary text-primary-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6" />
            <span className="font-display text-lg font-bold">ChaoNangsue.com</span>
          </div>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            แพลตฟอร์มเช่าหนังสือออนไลน์ ลดค่าใช้จ่าย เพิ่มโอกาสเข้าถึงความรู้ สนับสนุนเศรษฐกิจแบ่งปัน
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-4">เมนูลัด</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link to="/browse" className="hover:text-primary-foreground transition-colors">ค้นหาหนังสือ</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary-foreground transition-colors">แดชบอร์ดของฉัน</Link></li>
            <li><Link to="/admin" className="hover:text-primary-foreground transition-colors">จัดการระบบ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-4">ติดต่อเรา</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li>อีเมล: support@chaonang sue.com</li>
            <li>โทร: 02-xxx-xxxx</li>
            <li>Line: @chaonang sue</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-xs text-primary-foreground/50">
        © 2026 ChaoNangsue.com — Sharing Economy for Books
      </div>
    </div>
  </footer>
);

export default Footer;
