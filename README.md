# NueraDigital WhatsApp Gateway

A production-ready WhatsApp Gateway SaaS Platform with Next.js 14, Express.js, Prisma (MySQL), BullMQ (Redis), and Baileys.

## Fitur Utama
- **Multi-Device**: Mendukung banyak sesi perangkat WhatsApp untuk 1 akun.
- **Broadcast Cerdas**: Kirim massal anti-banned dengan random delay.
- **Auto-Reply AI**: Menggunakan model AI internal atau milik uer (OpenAI/Gemini/OpenRouter).
- **Billing Terintegrasi**: Menggunakan Midtrans (Paket Berlangganan).
- **Full Dashboard**: Manajemen webhook, status log, transaksi, admin multi-level.

## Arsitektur
Aplikasi berjalan sebagai Monorepo (npm workspaces). Lihat diagram utuh dan dokumentasi sistem lengkap di folder `docs/`.
- Backend (Port 5000) terhubung dengan database MySQL.
- Frontend (Port 3000) Dashboard React 14 + Shadcn.

## Panduan Instalasi (Development)

1. **Clone repository dan install dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   Salin `.env.example` sebagai `.env` di direktori utama, lalu isikan kredensial (database, midtrans, rahasia jwt, dll).
   ```bash
   cp .env.example .env
   ```

3. **Menyalakan Layanan Latar (Database + Redis)**
   Menggunakan Docker Compose:
   ```bash
   docker compose up -d mysql redis
   ```

4. **Jalankan Instalasi dan Migrasi Prisma**
   ```bash
   cd apps/api-server
   npx prisma generate
   npx prisma db push
   ```

5. **Jalankan Aplikasi Seluruhnya**
   Pada direktori root (satu terminal untuk masing-masing):
   - Backend: `npm --workspace=apps/api-server run dev`
   - Frontend: `npm --workspace=apps/dashboard run dev`

## Deployment di VPS (Production)
Jalankan file `.sh` di VPS kosong Ubuntu 22.04 menggunakan skrip dari `scripts/setup-vps.sh` — dan cukup jalankan `docker compose up -d` untuk memicu NGINX, Container Apps, Redis, dan Database secara bersamaan.
