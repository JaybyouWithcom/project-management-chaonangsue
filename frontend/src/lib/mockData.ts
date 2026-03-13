export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  cover: string;
  condition: "ใหม่เอี่ยม ✨" | "สภาพดี" | "มีตำหนิเล็กน้อย" | "ชำรุดหนัก" | "อ่านได้ก็บุญแล้ว";
  minRentalPrice: number; // เปลี่ยนจาก pricePerDay เป็น minRentalPrice (ค่าเช่าขั้นต่ำ 15 วัน)
  deposit: number;
  description: string;
  available: boolean;
  rating: number;
  totalRentals: number;
}

export interface RentalOrder {
  id: string;
  bookId: string;
  bookTitle: string;
  bookCover: string;
  renterName: string;
  startDate: string;
  endDate: string;
  status: "รอยืนยัน" | "กำลังจัดส่ง" | "กำลังยืม" | "รอคืน" | "คืนแล้ว" | "เลยกำหนด";
  totalPrice: number;
  penalty: number;
  paymentStatus: "รอชำระ" | "ชำระแล้ว" | "ยกเลิก";
}

export const genres = [
  "นิยาย", "การ์ตูน", "หนังสือเรียน", "หนังสือเด็ก", "นิตยสาร", "การเงินการลงทุน", "พัฒนาตัวเอง", "จิตวิทยา",
  "ประวัติศาสตร์", "ไลฟ์สไตล์"
];

export const conditions = [
  "ใหม่เอี่ยม ✨",
  "สภาพดี",
  "มีตำหนิเล็กน้อย",
  "ชำรุดหนัก",
  "อ่านได้ก็บุญแล้ว",
];

export const mockBooks: Book[] = [
  {
    id: "1", title: "เพราะเราคู่กัน", author: "JittiRain", isbn: "978-616-xxx-001",
    genre: "นิยาย", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop",
    condition: "ใหม่เอี่ยม ✨", minRentalPrice: 90, deposit: 150, description: "นิยายรักโรแมนติกขายดีอันดับ 1", // (150 * 2) * 0.3 = 90
    available: true, rating: 4.8, totalRentals: 128
  },
  {
    id: "2", title: "Atomic Habits", author: "James Clear", isbn: "978-616-xxx-002",
    genre: "พัฒนาตัวเอง", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop",
    condition: "สภาพดี", minRentalPrice: 78, deposit: 130, description: "เปลี่ยนนิสัยเล็กๆ สร้างผลลัพธ์มหาศาล", // (130 * 2) * 0.3 = 78
    available: true, rating: 4.9, totalRentals: 256
  },
  {
    id: "3", title: "Sapiens", author: "Yuval Noah Harari", isbn: "978-616-xxx-003",
    genre: "วิทยาศาสตร์", cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop",
    condition: "มีตำหนิเล็กน้อย", minRentalPrice: 126, deposit: 210, description: "ประวัติศาสตร์โดยย่อของมนุษยชาติ", // (210 * 2) * 0.3 = 126
    available: false, rating: 4.7, totalRentals: 198
  },
  {
    id: "4", title: "คิดเป็น รวยเป็น", author: "Napoleon Hill", isbn: "978-616-xxx-004",
    genre: "ธุรกิจ", cover: "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=300&h=400&fit=crop",
    condition: "สภาพดี", minRentalPrice: 45, deposit: 75, description: "หนังสือธุรกิจคลาสสิกที่ทุกคนควรอ่าน", // (75 * 2) * 0.3 = 45
    available: true, rating: 4.5, totalRentals: 89
  },
  {
    id: "5", title: "เมื่อวานนี้ ฉันได้ตาย", author: "พศิน อินทรวงค์", isbn: "978-616-xxx-005",
    genre: "จิตวิทยา", cover: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=300&h=400&fit=crop",
    condition: "ใหม่เอี่ยม ✨", minRentalPrice: 36, deposit: 60, description: "การเดินทางค้นหาตัวเองผ่านประสบการณ์ใกล้ตาย", // (60 * 2) * 0.3 = 36
    available: true, rating: 4.6, totalRentals: 145
  },
  {
    id: "6", title: "The Art of War", author: "Sun Tzu", isbn: "978-616-xxx-006",
    genre: "ประวัติศาสตร์", cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
    condition: "ชำรุดหนัก", minRentalPrice: 96, deposit: 160, description: "ตำราพิชัยสงครามอมตะ", // (160 * 2) * 0.3 = 96
    available: true, rating: 4.4, totalRentals: 67
  },
  {
    id: "7", title: "Harry Potter เล่ม 1", author: "J.K. Rowling", isbn: "978-616-xxx-007",
    genre: "นิยาย", cover: "https://images.unsplash.com/photo-1618666012174-83b441c0bc76?w=300&h=400&fit=crop",
    condition: "อ่านได้ก็บุญแล้ว", minRentalPrice: 120, deposit: 200, description: "เด็กชายผู้รอดชีวิตจากศาสตร์มืด", // (200 * 2) * 0.3 = 120
    available: true, rating: 4.9, totalRentals: 312
  },
  {
    id: "8", title: "แด่เธอผู้ไม่ยอมแพ้", author: "วิลาศ มณีวัต", isbn: "978-616-xxx-008",
    genre: "พัฒนาตัวเอง", cover: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&h=400&fit=crop",
    condition: "สภาพดี", minRentalPrice: 78, deposit: 130, description: "แรงบันดาลใจสำหรับวันที่ท้อแท้", // (130 * 2) * 0.3 = 78
    available: true, rating: 4.3, totalRentals: 91
  },
];

export const mockOrders: RentalOrder[] = [
  {
    id: "ORD-001", bookId: "1", bookTitle: "เพราะเราคู่กัน", bookCover: mockBooks[0].cover,
    renterName: "สมชาย ใจดี", startDate: "2026-02-15", endDate: "2026-02-22",
    status: "กำลังยืม", totalPrice: 105, penalty: 0, paymentStatus: "ชำระแล้ว"
  },
  {
    id: "ORD-002", bookId: "2", bookTitle: "Atomic Habits", bookCover: mockBooks[1].cover,
    renterName: "สมหญิง รักดี", startDate: "2026-02-10", endDate: "2026-02-17",
    status: "เลยกำหนด", totalPrice: 140, penalty: 60, paymentStatus: "รอชำระ"
  },
  {
    id: "ORD-003", bookId: "4", bookTitle: "คิดเป็น รวยเป็น", bookCover: mockBooks[3].cover,
    renterName: "วิชัย สุขสันต์", startDate: "2026-02-18", endDate: "2026-02-25",
    status: "รอยืนยัน", totalPrice: 84, penalty: 0, paymentStatus: "รอชำระ"
  },
  {
    id: "ORD-004", bookId: "7", bookTitle: "Harry Potter เล่ม 1", bookCover: mockBooks[6].cover,
    renterName: "น้องแนน", startDate: "2026-02-01", endDate: "2026-02-08",
    status: "คืนแล้ว", totalPrice: 105, penalty: 0, paymentStatus: "ชำระแล้ว"
  },
  {
    id: "ORD-005", bookId: "5", bookTitle: "เมื่อวานนี้ ฉันได้ตาย", bookCover: mockBooks[4].cover,
    renterName: "กานต์ เก่งกล้า", startDate: "2026-02-19", endDate: "2026-02-26",
    status: "กำลังจัดส่ง", totalPrice: 105, penalty: 0, paymentStatus: "ชำระแล้ว"
  },
];
