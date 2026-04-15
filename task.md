# WhatsApp Gateway SaaS — NueraDigital Task Checklist
# Domain target: wa.nueradigital.my.id

---

## ✅ Phase 0: Perencanaan (SELESAI)
- [x] Review workspace
- [x] Diskusi kebutuhan & konfirmasi stack teknologi
- [x] Konfirmasi payment: Midtrans (sandbox dulu)
- [x] Konfirmasi deployment: Full VPS (bukan STB), Docker Compose
- [x] Konfirmasi database: MySQL via Prisma ORM (siap migrasi ke PostgreSQL)
- [x] Konfirmasi dashboard: Bahasa Indonesia + toggle English (bilingual)
- [x] Konfirmasi email: Nodemailer (SMTP dari hosting, config via admin panel)
- [x] Konfirmasi AI: Token milik user sendiri + opsi internal dari admin
- [x] Konfirmasi role: SuperAdmin (pemilik) / Admin (CS) / User (pelanggan)
- [x] Konfirmasi paket harga: Diatur superadmin, tidak hardcode
- [x] Buat implementation_plan.md
- [x] Approval dari user

---

## 🏗️ Phase 1: Fondasi Project
- [x] Buat struktur folder monorepo
- [x] Setup root `package.json` (npm workspaces)
- [x] Buat `.env.example` untuk api-server & dashboard
- [x] Buat `docker-compose.yml` (mysql, redis, api-server, dashboard, nginx)
- [x] Buat `Dockerfile` untuk api-server
- [x] Buat `Dockerfile` untuk dashboard
- [x] Buat `nginx.conf` (reverse proxy ke api + dashboard)
- [x] Setup Prisma schema (MySQL) — semua tabel

### Tabel Database:
- [x] `users` — data user + hashed password
- [x] `roles` — superadmin, admin, user
- [x] `user_roles` — relasi user ↔ role
- [x] `api_keys` — API key per user
- [x] `devices` — device WhatsApp per user
- [x] `messages` — log pesan terkirim/gagal
- [x] `contacts` — kontak per user
- [x] `groups` — grup WA per device
- [x] `auto_reply_rules` — rule keyword + AI reply
- [x] `ai_configs` — konfigurasi AI per user (provider, token, model)
- [x] `broadcast_jobs` — campaign broadcast
- [x] `broadcast_recipients` — penerima per campaign
- [x] `webhooks` — endpoint webhook user
- [x] `webhook_logs` — log pengiriman webhook
- [x] `plans` — paket harga (diatur superadmin)
- [x] `subscriptions` — langganan aktif user
- [x] `transactions` — riwayat transaksi
- [x] `invoices` — invoice Midtrans
- [x] `usage_logs` — tracking penggunaan pesan & device
- [x] `system_configs` — konfigurasi global (SMTP, AI internal, dll)

---

## ⚙️ Phase 2: API Server (Backend)
- [x] Setup Express.js + TypeScript (atau JS)
- [x] Koneksi database via Prisma
- [x] Middleware: CORS, helmet, morgan, rate limiting
- [x] **Auth:** POST /auth/register, POST /auth/login (JWT)
- [x] **Auth:** Middleware verifikasi JWT + API key
- [x] **RBAC:** Middleware role-based access control
- [x] **Users:** CRUD user (admin+), profile sendiri (user)
- [x] **Devices:** Daftar, tambah, hapus, status device
- [x] **WhatsApp Engine:** Baileys session per device
  - [x] QR code generation + WebSocket broadcast ke dashboard
  - [x] Session persistence (tidak scan ulang)
  - [x] Auto reconnect dengan exponential backoff
  - [x] Kirim teks, gambar, video, dokumen
  - [x] Kirim ke grup & kanal
  - [x] Update Status (Story)
  - [x] Ambil list grup & metadata
- [x] **Messaging:** POST /send, POST /send-group, POST /send-media
- [x] **Broadcast:** POST /broadcast (upload CSV, delay random 2-10s, queue)
- [x] **Broadcast:** Status tracking + retry failed
- [x] **Auto Reply:** CRUD rule keyword + response
- [x] **Auto Reply (AI):** Integrasi multi-provider (OpenAI, OpenRouter, Gemini)
- [x] **Webhook:** CRUD endpoint, kirim event, log delivery
- [x] **Contacts:** CRUD kontak per user
- [x] **Groups:** GET list grup per device
- [x] **Admin Billing:** CRUD paket harga (hanya superadmin)
- [x] **Billing:** GET paket, POST subscribe, GET status langganan
- [x] **Payment:** POST /payment/create-transaction (Midtrans Snap)
- [x] **Payment:** POST /payment/webhook (verifikasi signature Midtrans)
- [x] **Usage:** GET usage stats per user
- [x] **Email:** Nodemailer — registrasi, invoice, notifikasi habis kuota
- [x] **Admin Panel:** Kelola semua user, device, transaksi, config sistem
- [x] **System Config:** SMTP, AI internal, maintenance mode (via DB)

---

## 🌐 Phase 3: Frontend Dashboard
- [x] Setup Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- [x] Setup i18n bilingual (ID default, toggle EN)
- [x] **Auth:** Halaman login, register, lupa password
- [x] **Dashboard:** Statistik utama (pesan, device, usage, revenue)
- [x] **Devices:** Daftar device + QR modal (WebSocket) + status badge
- [x] **Send Message:** Form kirim pesan (teks/image/video/dok) + pilih device
- [x] **Broadcast:** Wizard — upload CSV → preview → jadwal → monitoring
- [x] **Contacts:** CRUD kontak, import CSV
- [x] **Groups:** Tampilkan grup per device
- [x] **Auto Reply:** Editor rule keyword + toggle AI mode
- [x] **AI Settings:** Input token per provider (OpenAI/OpenRouter/Gemini)
- [x] **Logs:** Tabel log pesan dengan filter (status, tanggal, device)
- [x] **Webhooks:** Daftar endpoint, log delivery, test kirim
- [x] **Billing:** Status langganan, usage meter, tombol upgrade
- [x] **Pricing:** Halaman paket harga (dinamis dari DB) + checkout Midtrans
- [x] **Invoices:** Riwayat transaksi & download invoice
- [x] **Settings:** API key, SMTP (user), profil
- [x] **Admin Panel:** 
  - [x] Kelola semua user (suspend, ubah role, reset device)
  - [x] Monitor semua device (live status)
  - [x] Semua transaksi & revenue
  - [x] Edit paket harga (plans)
  - [x] Konfigurasi sistem (SMTP global, AI internal, maintenance)

---

## 🚀 Phase 4: Deployment & Dokumentasi
- [x] Test `docker-compose up` — semua service jalan
- [x] Test end-to-end: register → QR scan → kirim pesan
- [x] Test billing: pilih paket → Midtrans sandbox → subscription aktif
- [x] Buat `docs/API.md` — referensi lengkap endpoint + cURL
- [x] Buat `docs/WEBHOOKS.md` — event types + payload contoh
- [x] Buat `docs/ARCHITECTURE.md` — diagram sistem
- [x] Buat `scripts/setup-vps.sh` — script install otomatis di VPS baru
- [x] Buat `README.md` — panduan run step-by-step
- [x] Panduan anti-banned (delay, quota, warm-up nomor)

---

## 🎁 Bonus (Setelah Core Selesai)
- [ ] Export laporan (Excel/CSV)
- [ ] Trial system (7 hari gratis tanpa kartu kredit)
- [ ] Referral system
- [ ] Multi-node WA worker (scale horizontal)
- [ ] Integrasi sistem eksternal (ERP/absensi)
