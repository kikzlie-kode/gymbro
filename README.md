# GymBro

LINE bot + LIFF app สำหรับวางตารางออกกำลังกาย (to-do list), บันทึกผล, แจ้งเตือน และดูสรุปความคืบหน้า
เก็บข้อมูลบน Firebase (Firestore), รันหลังบ้านด้วย Cloud Functions (Node.js/Express)

## โครงสร้างโปรเจกต์

```
functions/        Cloud Functions: LINE webhook + REST API สำหรับ LIFF + ตัวส่งแจ้งเตือน
  src/line/        LINE Messaging API client, webhook handler, ข้อความ
  src/routes/      /api/todos, /api/logs, /api/summary (auth ผ่าน LIFF ID token)
  src/services/    Firestore access
  src/scheduler/   Cloud Scheduler function ส่ง push แจ้งเตือนทุก 15 นาที
liff/              LIFF frontend (Vite + React), 3 แท็บ: วันนี้ / บันทึกผล / สรุป
```

## Data model (Firestore)

```
users/{lineUserId}
users/{lineUserId}/todos/{todoId}    title, exerciseType, scheduledDate, scheduledTime,
                                       recurring, reminderEnabled, status
users/{lineUserId}/logs/{logId}      exerciseType, date, durationMin, sets, reps, weightKg, note
```

Client (LIFF) ไม่เขียน Firestore ตรง ๆ — ทุกอย่างผ่าน Cloud Functions API ที่ตรวจสอบ
LIFF ID token ก่อน (`firestore.rules` เลย deny ทุกอย่างจาก client)

## Setup

1. **LINE Developers Console**
   - Messaging API channel: คัดลอก Channel access token, Channel secret
   - LIFF app (สร้างใน channel เดียวกันหรือ LINE Login channel): คัดลอก LIFF ID, ตั้ง Endpoint URL
     เป็น URL ของ Firebase Hosting ที่จะ deploy (เช่น `https://your-project.web.app`)
   - ตั้ง Webhook URL ของ Messaging API เป็น `https://asia-southeast1-your-project.cloudfunctions.net/webhook`

2. **Firebase**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add   # เลือก/สร้างโปรเจกต์ แล้วแก้ .firebaserc ให้ตรง
   ```
   เปิดใช้ Firestore (native mode) และ Blaze plan (จำเป็นสำหรับ outbound calls ไป LINE API และ scheduled functions)

3. **Backend config** — token/secret ทั้งหมดอยู่ใน `functions/.env` เท่านั้น (ไม่ใช่ `liff/`)
   ```bash
   cd functions
   npm install
   cp .env.example .env   # ใส่ค่าจริง — ใช้รัน emulator เท่านั้น, ห้าม commit
   ```
   สำหรับ production ให้ตั้ง `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LIFF_CHANNEL_ID`
   ผ่าน Firebase secrets แทนการ deploy `.env` ตรง ๆ (โค้ดใน `src/index.js` และ
   `src/scheduler/reminders.js` ผูก secret เหล่านี้ไว้กับแต่ละ function แล้ว ผ่าน `defineSecret`):
   ```bash
   firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN
   firebase functions:secrets:set LINE_CHANNEL_SECRET
   firebase functions:secrets:set LIFF_CHANNEL_ID
   ```
   ส่วน `LIFF_URL` ไม่ใช่ความลับ เก็บใน `functions/.env` ตามปกติได้ (deploy ไปพร้อม function)

4. **Frontend config** — มีแค่ค่า public เท่านั้น ห้ามใส่ token ใด ๆ ลงในนี้
   (โค้ดที่ build แล้วรันในเบราว์เซอร์ผู้ใช้ ใครก็เปิดดูได้)
   ```bash
   cd liff
   npm install
   cp .env.example .env   # ใส่ VITE_LIFF_ID (LIFF ID ไม่ใช่ความลับ)
   ```

## รันทดสอบ (local)

```bash
# terminal 1 — Functions + Firestore emulator
firebase emulators:start --only functions,firestore

# terminal 2 — LIFF dev server
cd liff && npm run dev
```

LIFF ต้องเปิดผ่าน LINE app หรือ LIFF inspector เพื่อทดสอบ login จริง (localhost เปิดตรงจะ liff.init ไม่ผ่าน login flow ปกติ — ใช้ LINE's "LIFF playground" หรือ ngrok เพื่อทดสอบผ่าน mobile)

## Deploy

```bash
cd liff && npm run build && cd ..
firebase deploy
```

## สิ่งที่ยังไม่ได้ทำ (ต่อยอดได้)

- Recurring todos (daily/weekly) ตอนนี้เก็บ field `recurring` ไว้แล้วแต่ยังไม่มี logic สร้างรายการซ้ำอัตโนมัติ
  — ต้องเพิ่ม scheduled function ที่ clone todo ทุกเที่ยงคืนตาม pattern
- Rich menu / LINE flex menu สำหรับ quick access ไปแต่ละหน้าของ LIFF
- Unit tests
