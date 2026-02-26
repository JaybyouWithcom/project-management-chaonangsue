# Project Structure (Enterprise)

โปรเจกต์ถูกปรับโครงสร้างเป็นแบบแยก Frontend/Backend เพื่อรองรับการพัฒนาระยะยาวและการทำงานหลายทีม

## โฟลเดอร์หลัก

- `frontend/` : แอปฝั่ง UI เดิมทั้งหมด (Vite + React)
- `backend/` : โครงสร้าง enterprise สำหรับ API/service

## แนวคิดสถาปัตยกรรม

- แยก deployment ได้อิสระ
- ลด coupling ระหว่าง UI กับ business logic
- Backend ใช้แนวคิด layered architecture + DDD/Clean Architecture
- รองรับการเพิ่มบริการร่วม เช่น queue, cache, observability ได้ง่าย

## คำสั่งใช้งานคร่าว ๆ

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```
