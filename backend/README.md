# Backend (Enterprise Structure)

โครงสร้างนี้ออกแบบให้รองรับการขยายทีมและระบบขนาดใหญ่ โดยแยกความรับผิดชอบตามแนวคิด Clean Architecture / DDD

## โครงสร้างหลัก

- `src/api` ชั้นรับ request/response (HTTP layer)
  - `controllers` ประสานงาน use-case
  - `routes` กำหนดเส้นทาง API
  - `middlewares` จัดการ auth, validation, error handler
- `src/application` กฎการใช้งานระบบ (use-case)
  - `use-cases` business flow
  - `dto` data contract ระหว่างชั้น
  - `interfaces` ports สำหรับ infrastructure
- `src/domain` business core ที่ไม่ผูก framework
  - `entities`, `value-objects`, `services`, `repositories`, `events`
- `src/infrastructure` implementation ที่ผูกกับเทคโนโลยี
  - `database`, `cache`, `queue`, `storage`, `http`, `logger`, `config`
- `src/shared` ของใช้ร่วม เช่น error, type, constants, utilities
- `tests` แยก `unit`, `integration`, `e2e`
- `scripts` งาน automation เช่น seed/migrate
- `docs` เอกสารสถาปัตยกรรม และ ADR

## แนวทางเริ่มต้น

1. กำหนด domain model ใน `src/domain`
2. เขียน use-case ใน `src/application/use-cases`
3. ทำ controller + route ใน `src/api`
4. ค่อยเติม implementation DB/Cache ใน `src/infrastructure`
5. เพิ่ม test ตามระดับที่เหมาะสม

## Auth ที่เพิ่มแล้ว

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (ต้องส่ง `Authorization: Bearer <token>`)

หมายเหตุ: ผู้ใช้ใหม่จะเป็น `Customer` เสมอ (ตัด role `Lender` ออกแล้ว)

ตัวอย่าง `.env`:

```bash
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chaonangsue
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
```


## API v1 (MVP สำหรับ Frontend)

Response มาตรฐาน:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 100 }
}
```

Error มาตรฐาน:

```json
{
  "success": false,
  "error": { "message": "..." }
}
```

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (ต้องส่ง Bearer token)

### Books

- `GET /api/books` (ค้นหา + filter + pagination)
  - query: `q`, `genre`, `minPrice`, `maxPrice`, `page`, `limit`
- `GET /api/books/:bookId` (รายละเอียดหนังสือที่พร้อมให้เช่า)
- `GET /api/books/:bookId/quote?plan=7days|14days|30days`
  - คำนวณ `dueDate` โดยอิง Asia/Bangkok
  - คำนวณยอดจ่ายเริ่มต้นแบบ mock: `rental_price + deposit_price`
- `POST /api/books` (ลงหนังสือในร้าน, ต้อง login)
  - body ต้องส่ง `imageBase64` (data URL) เพื่อให้ server บันทึกรูปและเก็บ path ให้อัตโนมัติ
  - แนะนำให้ frontend รับไฟล์จาก `<input type="file">` แล้วแปลงเป็น base64 ก่อนส่ง API

## Database Scripts

- สร้างตารางผู้ใช้: `scripts/create-users-table.sql`
- สร้างตารางร้านค้า (1 user มีหลายร้าน): `scripts/create-shops-table.sql`
- migrate บทบาทเก่า `Lender` -> `Customer`: `scripts/migrate-merge-lender-role.sql`
- เพิ่ม soft delete ให้ users: `scripts/migrate-add-user-soft-delete.sql`
- เพิ่ม soft delete ให้ shops: `scripts/migrate-add-shop-soft-delete.sql`
- เปลี่ยน FK shops.user_id ให้ไม่ cascade delete: `scripts/migrate-shops-fk-restrict.sql`
- ตัวอย่าง soft delete user: `scripts/soft-delete-user.sql`
- ตัวอย่าง hard delete user (ใช้เฉพาะ admin flow): `scripts/hard-delete-user.sql`
- ตัวอย่าง soft delete shop: `scripts/soft-delete-shop.sql`
- ตัวอย่าง restore shop: `scripts/restore-shop.sql`
- ตัวอย่าง hard delete shop (ใช้เฉพาะ admin flow): `scripts/hard-delete-shop.sql`
- ลบ trigger ที่บล็อก hard delete (ถ้าเคยเปิด): `scripts/remove-prevent-hard-delete-users-trigger.sql`

หมายเหตุ:
- auth/query หลักจะอ่านเฉพาะผู้ใช้ที่ `deleted_at IS NULL`
- shop query หลักควรอ่านเฉพาะร้านที่ `deleted_at IS NULL`
- แนวทางที่แนะนำคือ soft delete เป็นค่าเริ่มต้น และ hard delete ผ่าน admin flow เท่านั้น
