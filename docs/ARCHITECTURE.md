# WhatsApp Gateway SaaS - Architecture

Sistem ini didesain scalable dengan pemisahan Front-End, Back-End, Database, dan Queue System. Arsitekturnya berfokus pada ketahanan (reliability) terutama untuk sesi WhatsApp dan anti-banned.

## 1. High-Level Diagram

```text
[ Internet / Clients ]
       │ (HTTP/HTTPS)
       ▼
 [ NGINX Reverse Proxy ]
   │                 │
   │ (/api)          │ (/)
   ▼                 ▼
[ API Server ]     [ Dashboard ]
(Express JS)       (Next.js 14)
   │                 │
   ├─[ Prisma ORM ]  │ (API Calls)
   │                 ▼
   ├─[ MySQL DB ]  [ Local Storage / JWT ]
   │                 
   └─[ BullMQ ] ─── [ Redis ]
```

## 2. Core Components

1. **Dashboard (Next.js 14 - App Router)**
   - Menggunakan Tailwind CSS & shadcn/ui.
   - i18n Translation (ID / EN).
   - Menangani autentikasi JWT pengguna dan rute administratif.

2. **API Server (Express JS)**
   - Layanan Manajemen Pengguna, Tagihan (Midtrans), Webhook, dan WhatsApp Core.
   - Menggunakan framework Baileys untuk integrasi API WhatsApp Web secara internal. Multi-device didukung (Session pooling).

3. **Database (MySQL)**
   - Setup menggunakan Prisma ORM.
   - Memastikan ACID properties untuk tracking tagihan dan siaran.

4. **Queue System (Redis & BullMQ)**
   - Mengelola pemrosesan massal (Broadcast).
   - Diatur dengan penundaan otomatis (random delay) antar pengiriman pesan untuk menghindari banned (Anti-spam protection).

## 3. Worker Node Scaling (Future Extension)
Ketika lalu lintas bertambah hingga ribuan device, Baileys instances (Node WhatsApp) dapat diekstrak menjadi Multiple Workers terpisah pada VPS sekunder. Server API pusat hanya sebagai Router ke URL Pekerja.
