# NueraDigital WhatsApp Gateway API Reference

Base URL: `https://wa.nueradigital.my.id/api` (Production) / `http://localhost:5000/api` (Local)

Semua endpoint dilindungi oleh autentikasi menggunakan **Bearer Token** atau **API Key** (diteruskan di header `Authorization`).

Contoh:
```bash
Authorization: Bearer <token_atau_api_key>
```

---

## 1. Authentication
### POST `/auth/register`
Mendaftarkan pengguna baru.
- **Body:** `{ "name": "Budi", "email": "budi@email.com", "password": "Password123!" }`
- **Response (201):** `{ "success": true, "data": { "token": "...", "user": {...} } }`

### POST `/auth/login`
Masuk dengan akun yang sudah ada.
- **Body:** `{ "email": "budi@email.com", "password": "Password123!" }`
- **Response (200):** `{ "success": true, "data": { "token": "...", "user": {...} } }`

---

## 2. Messaging
### POST `/messages/send`
Mengirim pesan teks ke nomor tujuan.
- **Body:** `{ "deviceId": "device_id_anda", "to": "628123456789", "message": "Halo dari NueraDigital!" }`
- **Response (200):** `{ "success": true, "message": "Message sent" }`

### POST `/messages/send-media`
Mengirim pesan media (gambar, video, atau dokumen).
- **Body:** 
  ```json
  { 
    "deviceId": "device_id_anda", 
    "to": "628123456789", 
    "type": "image", 
    "url": "https://example.com/image.jpg", 
    "caption": "Ini gambar!" 
  }
  ```
- **Response (200):** `{ "success": true, "message": "Media sent" }`

---

## 3. Devices
### GET `/devices`
Mendapatkan daftar semua perangkat yang tertaut dengan akun Anda.
- **Response (200):** `{ "success": true, "data": [ ...perangkat... ] }`

### POST `/devices`
Menambahkan perangkat baru.
- **Body:** `{ "name": "Perangkat CS 1" }`
- **Response (201):** `{ "success": true, "data": { "id": "...", "name": "..." } }`

---

## 4. Broadcast
### POST `/broadcast`
Membuat jadwal siaran baru.
- **Body:** 
  ```json
  {
    "name": "Promo 2026",
    "deviceId": "device_id",
    "phones": ["6281...", "6282..."]
  }
  ```
- **Response (200):** `{ "success": true, "data": { "jobId": "..." } }`

### POST `/broadcast/:id/start`
Menjalankan jadwal siaran tertentu.
- **Body:** `{ "deviceId": "device_id", "content": "Halo, promo terbaru...", "messageType": "TEXT" }`
- **Response (200):** `{ "success": true, "message": "Broadcast started" }`
