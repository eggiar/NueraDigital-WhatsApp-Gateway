# Webhooks Reference

Sistem NueraDigital WhatsApp Gateway mendukung pengiriman Webhook ke titik akhir (endpoint) yang dikonfigurasi saat terjadi peristiwa tertentu.

Anda dapat menambahkan Webhook melalui Dasbor pada halaman Webhooks. 

## Format Payload

Semua Webhook akan dikirimkan dengan metode `POST` dan memiliki tipe konten `application/json`.
Payload utama memiliki struktur dasar:

```json
{
  "event": "nama.event",
  "data": { ...isi data terkait event... },
  "timestamp": "2026-04-15T10:00:00.000Z"
}
```

Jika Webhook dikonfigurasi menggunakan kunci rahasia (secret), sistem akan menyertakan header `X-Webhook-Signature` berupa tanda tangan (HMAC SHA-256) dari payload.

---

## Event Types

### 1. `message.received`
Dipicu ketika perangkat WhatsApp menerima pesan baru (masuk).

**Contoh Data:**
```json
{
  "event": "message.received",
  "data": {
    "deviceId": "clvqxxxxxxx",
    "from": "628123456789@s.whatsapp.net",
    "message": "Halo, apakah produk ini masih ada?",
    "messageType": "conversation",
    "pushName": "Budi"
  },
  "timestamp": "2026-04-15T10:00:00.000Z"
}
```

### 2. `message.sent`
Dipicu ketika platform berhasil mengirim pesan dari perangkat Anda.

**Contoh Data:**
```json
{
  "event": "message.sent",
  "data": {
    "deviceId": "clvqxxxxxxx",
    "to": "628987654321@s.whatsapp.net",
    "messageId": "AB1234567890",
    "status": "sent"
  },
  "timestamp": "2026-04-15T10:01:00.000Z"
}
```

### 3. `device.disconnected`
Dipicu ketika perangkat terputus dari jaringan atau sesi WhatsApp keluar.

**Contoh Data:**
```json
{
  "event": "device.disconnected",
  "data": {
    "deviceId": "clvqxxxxxxx",
    "reason": "Logged out"
  },
  "timestamp": "2026-04-15T10:05:00.000Z"
}
```
