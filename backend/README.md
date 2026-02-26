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
