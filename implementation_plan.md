# WhatsApp Gateway SaaS — Implementation Plan Final
**Produk:** NueraDigital WhatsApp Gateway
**Domain:** wa.nueradigital.my.id
**Versi:** 1.0 (SaaS publik, target awal 50 user / 50 device)

---

## Keputusan Arsitektur (Hasil Diskusi)

| Aspek | Keputusan | Alasan |
|-------|-----------|--------|
| Deployment | **Full VPS** (bukan STB) | Lebih simpel, mudah scale |
| Server | Oracle Cloud 24GB RAM Ubuntu | Gratis, kuat untuk awal |
| Low-spec ready | Ya | Desain ringan, Docker resource limit |
| Database | **MySQL via Prisma ORM** | Familiar + ready migrasi ke PostgreSQL |
| Deploy method | **Docker Compose** | 1 perintah, tidak perlu paham server |
| Payment | **Midtrans** (sandbox → production) | Lokal Indonesia, webhook support |
| AI Auto-reply | **Multi-provider per user** (token sendiri) | Fleksibel, + opsi internal dari admin |
| AI provider | OpenAI, OpenRouter, Gemini Free | User pilih sendiri |
| Dashboard bahasa | **Indonesia default + toggle English** | Bilingual via i18n |
| Email | **Nodemailer** (SMTP dari hosting) | Config via admin panel, tidak hardcode |
| Role | SuperAdmin / Admin / User | 3 level akses |
| Paket harga | **Diatur SuperAdmin di dashboard** | Tidak hardcode, fleksibel |
| Anti-halusinasi | Bangun bertahap, verifikasi tiap tahap | Satu fitur selesai sebelum lanjut |

---

## Arsitektur Sistem

```
Internet (wa.nueradigital.my.id)
            │
     [Cloudflare / DNS]
            │
     [Nginx — Port 80/443]
      ┌─────┴──────────┐
      │                │
 [Dashboard]      [API Server]
  Next.js 14       Express.js
  Port 3000        Port 5000
                       │
         ┌─────────────┼──────────────┐
         │             │              │
      [MySQL]       [Redis]     [Baileys Sessions]
     Port 3306     Port 6379    (per device, in-process)
     (Prisma)      (BullMQ)
```

> **Catatan Skalabilitas:** Saat ini semua dalam 1 VPS. Nanti untuk ribuan device, Baileys worker bisa dipindah ke VPS terpisah — arsitektur sudah didesain untuk itu (komunikasi via REST internal).

---

## Struktur Folder Project

```
NueraDigital-WhatsApp-Gateway/
├── apps/
│   ├── api-server/              # Backend API
│   │   ├── src/
│   │   │   ├── index.js         # Entry point Express
│   │   │   ├── middleware/      # auth, rbac, rateLimit, validate
│   │   │   ├── routes/          # auth, devices, messages, billing, admin...
│   │   │   ├── services/        # whatsapp, billing, ai, webhook, email...
│   │   │   ├── queue/           # BullMQ workers (broadcast, webhook)
│   │   │   └── lib/             # prisma client, redis, logger
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── dashboard/               # Frontend Next.js
│       ├── app/                 # Next.js App Router
│       │   ├── (auth)/          # login, register
│       │   ├── (dashboard)/     # semua halaman user
│       │   └── (admin)/         # panel superadmin
│       ├── components/          # QRModal, DeviceCard, BroadcastWizard...
│       ├── lib/                 # i18n, api client, auth
│       ├── locales/
│       │   ├── id.json          # Bahasa Indonesia
│       │   └── en.json          # English
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml           # Jalankan semua service
├── nginx/
│   └── nginx.conf               # Reverse proxy config
├── .env.example                 # Template environment variables
├── scripts/
│   └── setup-vps.sh             # Install otomatis di VPS baru
├── docs/
│   ├── API.md                   # Referensi endpoint + cURL
│   ├── WEBHOOKS.md              # Event types + payload
│   └── ARCHITECTURE.md          # Diagram sistem
└── README.md                    # Panduan lengkap step-by-step
```

---

## Komponen yang Akan Dibangun

---

### 1️⃣ Database Schema (Prisma + MySQL)

**Tabel utama:**

| Tabel | Isi |
|-------|-----|
| `users` | id, name, email, password (hash), status, createdAt |
| `roles` | id, name (superadmin/admin/user) |
| `user_roles` | userId, roleId |
| `api_keys` | id, userId, key, lastUsed |
| `devices` | id, userId, name, phone, status, sessionPath |
| `messages` | id, deviceId, to, type, content, status, sentAt |
| `contacts` | id, userId, name, phone, notes |
| `groups` | id, deviceId, jid, name, memberCount |
| `auto_reply_rules` | id, userId, keyword, response, isAI, schedule |
| `ai_configs` | id, userId, provider, apiKey (encrypted), model |
| `broadcast_jobs` | id, userId, name, status, sentCount, failCount |
| `broadcast_recipients` | id, jobId, phone, status, sentAt |
| `webhooks` | id, userId, url, events (JSON), secret |
| `webhook_logs` | id, webhookId, event, payload, statusCode, createdAt |
| `plans` | id, name, price, deviceLimit, msgLimit, features (JSON) |
| `subscriptions` | id, userId, planId, startAt, expiredAt, status |
| `transactions` | id, userId, planId, amount, status, midtransOrderId |
| `invoices` | id, transactionId, pdfUrl, paidAt |
| `usage_logs` | id, userId, deviceId, msgCount, date |
| `system_configs` | id, key, value, description |

---

### 2️⃣ API Server (Express.js)

**Middleware stack:**
- `helmet` — security headers
- `cors` — izinkan akses dari domain dashboard
- `morgan` — logging request
- `express-rate-limit` — limit per IP
- `auth.js` — verifikasi JWT atau API Key
- `rbac.js` — cek role user
- `validate.js` — validasi body request via Zod

**Endpoint lengkap:**

```
AUTH
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me

DEVICES
  GET    /api/devices                    → List device milik user
  POST   /api/devices                    → Tambah device baru
  DELETE /api/devices/:id                → Hapus device
  GET    /api/devices/:id/qr             → QR Code (WebSocket)
  POST   /api/devices/:id/disconnect     → Disconnect device
  GET    /api/devices/:id/status         → Status device

MESSAGING
  POST   /api/messages/send              → Kirim teks
  POST   /api/messages/send-media        → Kirim gambar/video/dokumen
  POST   /api/messages/send-group        → Kirim ke grup
  POST   /api/messages/status-update     → Update Story/Status WA

BROADCAST
  GET    /api/broadcast                  → List campaign
  POST   /api/broadcast                  → Buat campaign baru
  POST   /api/broadcast/:id/start        → Mulai kirim
  POST   /api/broadcast/:id/stop         → Hentikan
  GET    /api/broadcast/:id/stats        → Statistik pengiriman

CONTACTS
  GET    /api/contacts
  POST   /api/contacts
  PUT    /api/contacts/:id
  DELETE /api/contacts/:id
  POST   /api/contacts/import            → Import CSV

GROUPS
  GET    /api/groups                     → Semua grup per device
  GET    /api/groups/:jid/members        → Anggota grup

AUTO REPLY
  GET    /api/auto-reply
  POST   /api/auto-reply
  PUT    /api/auto-reply/:id
  DELETE /api/auto-reply/:id

AI CONFIG
  GET    /api/ai-config                  → Config AI user
  PUT    /api/ai-config                  → Update provider + token + model

WEBHOOKS
  GET    /api/webhooks
  POST   /api/webhooks
  PUT    /api/webhooks/:id
  DELETE /api/webhooks/:id
  POST   /api/webhooks/:id/test          → Kirim test payload
  GET    /api/webhooks/:id/logs          → Log pengiriman

BILLING
  GET    /api/plans                      → List paket (publik)
  GET    /api/subscription               → Status langganan user
  POST   /api/subscription/subscribe     → Subscribe paket
  GET    /api/invoices                   → List invoice user

PAYMENT (Midtrans)
  POST   /api/payment/create             → Buat transaksi → dapat URL Snap
  POST   /api/payment/webhook            → Terima notifikasi Midtrans

USAGE
  GET    /api/usage                      → Usage bulan ini user

ADMIN (Superadmin/Admin only)
  GET    /api/admin/users                → Semua user
  PUT    /api/admin/users/:id/suspend    → Suspend user
  PUT    /api/admin/users/:id/role       → Ubah role
  GET    /api/admin/devices              → Monitor semua device
  GET    /api/admin/transactions         → Semua transaksi
  GET    /api/admin/stats                → Statistik sistem

SUPERADMIN only
  GET    /api/admin/plans                → CRUD paket harga
  POST   /api/admin/plans
  PUT    /api/admin/plans/:id
  DELETE /api/admin/plans/:id
  GET    /api/admin/system-config        → Konfigurasi sistem
  PUT    /api/admin/system-config        → Update SMTP, AI internal, dll
```

---

### 3️⃣ WhatsApp Engine (Baileys — terintegrasi di API Server)

- **Session Manager** — buat/restore session per device
- **Auth persistence** — simpan creds ke file (`./sessions/{deviceId}/`)
- **Auto-reconnect** — exponential backoff (1s, 2s, 4s, 8s...)
- **QR broadcast** — kirim QR ke dashboard via WebSocket
- **Message sender** — text, image, video, document, status
- **Group utils** — fetch list grup, metadata, anggota
- **Event listener** — tangkap pesan masuk → trigger auto-reply → kirim webhook

**Anti-ban (WAJIB):**
- Delay random 2–10 detik antar pesan broadcast
- Queue sistem (BullMQ) — tidak kirim serentak
- Rate limit per device
- Simulasi typing indicator
- Warm-up nomor baru (batasi di awal)

---

### 4️⃣ AI Auto-Reply

**Provider yang didukung (per user, pakai token sendiri):**
- OpenAI (GPT-4o, GPT-3.5)
- OpenRouter (akses 100+ model, ada free tier)
- Google Gemini (ada free tier — cocok untuk trial)

**Opsi Internal (SuperAdmin):**
- Admin bisa isi token sendiri → user bisa pilih "Gunakan AI Internal" tanpa isi token

**Alur:**
```
Pesan masuk → cek auto-reply rules (keyword match dulu)
           → jika tidak ada match + AI aktif → kirim ke LLM → balas otomatis
           → log semua balasan
```

---

### 5️⃣ Broadcast System

```
User upload CSV / input manual
        ↓
Buat broadcast_job di DB
        ↓
Worker BullMQ ambil satu per satu
        ↓
Delay random 2–10 detik per pesan
        ↓
Kirim via Baileys → update status per recipient
        ↓
Jika gagal → retry (max 3x)
        ↓
Update statistik job (sent, failed, total)
```

---

### 6️⃣ Billing (Midtrans)

**Flow pembayaran:**
```
User pilih paket → POST /payment/create
                 → Buat transaction di DB
                 → Midtrans Snap token dibuat
                 → Frontend redirect ke halaman bayar Midtrans
                 → User bayar (transfer, QRIS, dll)
                 → Midtrans kirim webhook ke POST /payment/webhook
                 → Verifikasi signature Midtrans
                 → Update subscription aktif + kirim email invoice
```

**Model paket:**
- Dibuat oleh SuperAdmin dari dashboard (nama, harga, device limit, msg limit, fitur JSON)
- Tidak hardcode — semua dari tabel `plans` di database

---

### 7️⃣ Email (Nodemailer)

Config disimpan di tabel `system_configs` (SMTP host, port, user, password, from name).
SuperAdmin bisa update dari panel tanpa restart server.

**Email yang dikirim:**
- Registrasi berhasil (welcome)
- Invoice pembayaran
- Langganan hampir habis (3 hari sebelum expired)
- Langganan sudah expired (notifikasi + CTA upgrade)

---

### 8️⃣ Dashboard (Next.js 14)

**Halaman:**

| Halaman | Akses | Fitur Utama |
|---------|-------|-------------|
| `/login`, `/register` | Publik | JWT auth |
| `/pricing` | Publik | Paket harga dinamis dari DB |
| `/dashboard` | User | Statistik pesan, device, usage |
| `/devices` | User | QR scan modal, status real-time |
| `/send` | User | Form kirim pesan + pilih device |
| `/broadcast` | User | Wizard upload CSV + monitoring |
| `/contacts` | User | CRUD + import CSV |
| `/groups` | User | List grup per device |
| `/auto-reply` | User | Rule editor + toggle AI |
| `/settings/ai` | User | Input token AI provider |
| `/logs` | User | Tabel log + filter |
| `/webhooks` | User | Endpoint manager + tester |
| `/billing` | User | Status langganan + usage meter |
| `/invoices` | User | Riwayat bayar |
| `/admin/users` | Admin+ | Kelola semua user |
| `/admin/devices` | Admin+ | Monitor semua device |
| `/admin/transactions` | Admin+ | Semua transaksi |
| `/admin/plans` | SuperAdmin | CRUD paket harga |
| `/admin/system` | SuperAdmin | Config SMTP, AI, maintenance |

**Bilingual:**
- Default: Bahasa Indonesia
- Toggle di navbar: ID 🇮🇩 / EN 🇺🇸
- Implementasi via `next-intl` atau `i18next`

---

### 9️⃣ Docker Compose

```yaml
Services:
  mysql:      → Port 3306, data persisted di volume
  redis:      → Port 6379 (untuk BullMQ)
  api-server: → Port 5000, depends on mysql + redis
  dashboard:  → Port 3000, depends on api-server
  nginx:      → Port 80/443, proxy ke api (5000) dan dashboard (3000)
```

---

## Tahapan Pengerjaan

| Tahap | Yang Dikerjakan | Output |
|-------|-----------------|--------|
| **1** | Struktur folder + Docker + DB schema + Auth | `docker-compose up` jalan, register/login bisa |
| **2** | WhatsApp engine (Baileys) + Device management | QR scan bisa, pesan terkirim |
| **3** | Frontend dashboard (auth + device + send) | UI bisa dipakai |
| **4** | Broadcast + Auto-reply + AI + Webhook | Fitur otomasi jalan |
| **5** | Billing + Midtrans + Email + Admin panel | Bisa bayar langganan |
| **6** | Polish + docs + deploy guide | Siap production |

---

## Catatan Teknis Penting

> [!WARNING]
> **WhatsApp Unofficial API**: Baileys menggunakan protokol WhatsApp Web (bukan API resmi). Ada risiko ban jika:
> - Kirim pesan massal tanpa delay
> - Pakai nomor baru untuk broadcast banyak
> - Perilaku tidak wajar (kirim 1000 pesan/menit)
>
> Sistem sudah dirancang dengan anti-ban: delay random, queue, rate limit, warm-up.

> [!NOTE]
> **Status Update (Story WA)**: Membutuhkan `getPrivacyTokens` dan node khusus di Baileys v7. Fitur ini bisa lebih tidak stabil dari fitur lain. Akan diimplementasi dengan fallback.

> [!NOTE]
> **Channel WA**: Sangat terbatas via Baileys. Hanya bisa kirim ke channel yang diikuti device. Akan dijelaskan dengan jelas di dokumentasi untuk user.

> [!TIP]
> **Scale up**: Saat butuh ribuan device, Baileys worker bisa dipindah ke VPS terpisah. API server tinggal tambah environment variable `WA_WORKER_URL` untuk redirect request.

---

## Verifikasi Setiap Tahap

Setelah each tahap selesai, akan dilakukan:

```bash
# Health check
curl http://localhost:5000/health

# Auth
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test1234!"}'
```

Dan test manual via browser di `http://localhost:3000`.
