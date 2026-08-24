# GymBro — Context

## เป้าหมายโปรเจกต์
LINE bot + LIFF app สำหรับออกกำลังกาย ทำหน้าที่เป็น to-do list วางตารางกิจกรรม
บันทึกผลการออกกำลังกาย แจ้งเตือนผ่าน LINE และดูสรุป/กราฟความคืบหน้า เก็บข้อมูลบน cloud

ก่อนเริ่มมี Messaging API channel และ LIFF app ใน LINE Developers Console อยู่แล้ว

## Stack ที่เลือก
- **Backend:** Node.js + Express บน Firebase Cloud Functions (Gen 2)
- **Database:** Firebase Firestore
- **Frontend (LIFF):** เริ่มจาก Vite + vanilla JS แล้วเปลี่ยนเป็น **React** ตามคำขอภายหลัง
- **Hosting:** Firebase Hosting

เหตุผลที่เลือก Firebase: ตั้งค่าเร็ว เข้ากับ LIFF ได้ดี ไม่ต้องดูแล server เอง

## MVP scope (ตกลงกันตอนเริ่ม)
1. To-do list ตารางออกกำลังกาย
2. บันทึกผลการออกกำลังกาย (น้ำหนัก, เซ็ต/เรพ, ระยะเวลา)
3. แจ้งเตือนผ่าน LINE ตามเวลาที่ตั้ง
4. สรุป/กราฟความคืบหน้า (streak, จำนวนครั้ง, นาทีรวม)

ที่ตั้งใจเว้นไว้ไม่ทำใน MVP: recurring todos แบบ auto-clone รายวัน/สัปดาห์, rich menu

## โครงสร้างโปรเจกต์
```
functions/               Cloud Functions
  src/line/                LINE Messaging API client, webhook handler, ข้อความ
  src/routes/               /api/todos, /api/logs, /api/summary (auth ผ่าน LIFF ID token)
  src/services/             Firestore access
  src/scheduler/            ส่ง push แจ้งเตือนทุก 15 นาที (Cloud Scheduler)
liff/                     LIFF frontend (Vite + React)
  src/pages/                Today.jsx, Log.jsx, Summary.jsx (3 แท็บ: วันนี้/บันทึกผล/สรุป)
  src/api/client.js         fetch wrapper แนบ LIFF ID token เป็น Bearer token
  src/hooks/useLoad.js      hook โหลดข้อมูล + error state
firestore.rules           client เขียน Firestore ตรงไม่ได้ ต้องผ่าน API เท่านั้น
firestore.indexes.json    composite indexes สำหรับ query todos/reminders
firebase.json             hosting rewrite /api/** → function api (asia-southeast1)
```

## Data model (Firestore)
```
users/{lineUserId}
users/{lineUserId}/todos/{todoId}   title, exerciseType, scheduledDate, scheduledTime,
                                      recurring, reminderEnabled, status
users/{lineUserId}/logs/{logId}     exerciseType, date, durationMin, sets, reps, weightKg, note
```

## Secrets / config
- `functions/.env` — ค่า deploy จริง (เฉพาะ non-secret เช่น `LIFF_URL`)
- `functions/.env.local` — ค่าจริงทั้งหมดสำหรับรัน emulator เท่านั้น (ไม่ deploy, gitignored)
- `liff/.env` — มีแค่ `VITE_LIFF_ID` (ไม่ใช่ความลับ ต้องฝังใน client bundle อยู่แล้ว)
- Production secrets จริง (`LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LIFF_CHANNEL_ID`)
  ตั้งผ่าน **Firebase Secret Manager** (`firebase functions:secrets:set <NAME>`) ผูกกับ function
  ผ่าน `defineSecret` ใน `functions/src/index.js` — ไม่ deploy ผ่าน `.env` ตรง ๆ

## Deploy
- Firebase project: `gym-bro-ea758`
- Hosting URL: https://gym-bro-ea758.web.app
- Webhook: `https://asia-southeast1-gym-bro-ea758.cloudfunctions.net/webhook`
- ตั้งใน LINE Developers Console: Webhook URL (Messaging API channel) และ LIFF Endpoint URL
  ให้ชี้มาที่ URL ทั้งสองนี้
- Plan: Blaze (จำเป็นสำหรับเรียก LINE API ออกจาก function และใช้ Cloud Scheduler)
- Repo: https://github.com/kikzlie-kode/gymbro (push ขึ้น GitHub แล้ว แต่ไม่ auto-deploy —
  ต้อง `firebase deploy` แยกทุกครั้งที่แก้โค้ด)
