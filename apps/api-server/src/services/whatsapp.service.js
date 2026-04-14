const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const prisma = require('../lib/prisma');
const aiService = require('./ai.service');
const webhookService = require('./webhook.service');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.qrs = new Map(); // Store latest QR per session
    this.sessionsDir = path.join(__dirname, '..', '..', 'sessions');
    
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  isSessionConnected(deviceId) {
    return this.sessions.has(deviceId);
  }

  getLatestQr(deviceId) {
    return this.qrs.get(deviceId);
  }

  async startSession(deviceId) {
    const sessionDir = path.join(this.sessionsDir, deviceId);
    
    // To support multiple devices without blocking
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`Starting session ${deviceId} (WA v${version.join('.')})`);
    
    const socket = makeWASocket({
      version,
      logger: pino({ level: 'silent' }), // silence pino to avoid flooding logs
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: true,
      syncFullHistory: false, // Don't download full history to save bandwidth
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Convert to data url for easy display
        const qrDataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 5 });
        this.qrs.set(deviceId, qrDataUrl);
        this.emit(`qr-${deviceId}`, qrDataUrl);
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Session ${deviceId} connection closed. Reconnecting: ${shouldReconnect}`);
        
        this.sessions.delete(deviceId);
        this.qrs.delete(deviceId);

        if (shouldReconnect) {
          // Exponential backoff or simple timeout
          setTimeout(() => this.startSession(deviceId), 5000);
        } else {
          // Logged out
          this.emit(`disconnected-${deviceId}`);
          await prisma.device.update({ where: { id: deviceId }, data: { status: 'DISCONNECTED' } });
          this.deleteSessionFolder(deviceId);
        }
      } else if (connection === 'open') {
        console.log(`Session ${deviceId} connected successfully!`);
        this.sessions.set(deviceId, socket);
        this.qrs.delete(deviceId); // Clear QR
        
        // Update device owner details
        const me = socket.authState.creds.me;
        const phone = me ? me.id.split(':')[0] : null;

        await prisma.device.update({ 
          where: { id: deviceId }, 
          data: { status: 'CONNECTED', phone } 
        });

        this.emit(`connected-${deviceId}`);
      }
    });

    // Listen to messages for auto-reply / webhook
    socket.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return; // ignore our own messages

      this.emit('message.received', { deviceId, msg });

      try {
          const deviceDb = await prisma.device.findFirst({ where: { id: deviceId } });
          if (!deviceDb) return;

          const senderJid = msg.key.remoteJid;
          const isGroup = senderJid.endsWith('@g.us');
          let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

          // 1. Trigger Webhook
          await webhookService.triggerUserEvent(deviceDb.userId, 'message.received', {
             deviceId,
             sender: senderJid,
             message: text,
             isGroup,
             timestamp: new Date().toISOString(),
             raw: msg
          });

          // 2. Process Auto Reply (only for texts and not groups usually, but we check anyway)
          if (text) {
              const rule = await prisma.autoReplyRule.findFirst({
                 where: { 
                    userId: deviceDb.userId,
                    keyword: { equals: text.toLowerCase() }
                 }
              });

              if (rule) {
                  // If AI rule
                  if (rule.isAI) {
                     const response = await aiService.generateReply(deviceDb.userId, text);
                     if (response) {
                        await socket.sendMessage(senderJid, { text: response });
                     }
                  } else {
                     // standard rule
                     await socket.sendMessage(senderJid, { text: rule.response });
                  }
              }
          }
      } catch (err) {
         console.error('Error processing incoming message:', err);
      }
    });

    return socket;
  }

  logoutSession(deviceId) {
    const socket = this.sessions.get(deviceId);
    if (socket) {
      socket.logout();
    }
  }

  async deleteSession(deviceId) {
    this.logoutSession(deviceId);
    this.deleteSessionFolder(deviceId);
  }

  deleteSessionFolder(deviceId) {
    const sessionDir = path.join(this.sessionsDir, deviceId);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete session folder for ${deviceId}:`, err);
      }
    }
  }
}

// Export singleton instance
const waService = new WhatsAppService();
module.exports = waService;
