const { Queue, Worker } = require('bullmq');
const { connection } = require('../lib/redis');
const prisma = require('../lib/prisma');
const waService = require('../services/whatsapp.service');

const BROADCAST_QUEUE = 'broadcastQueue';

const broadcastQueue = new Queue(BROADCAST_QUEUE, { connection });

// Helper to delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const broadcastWorker = new Worker(BROADCAST_QUEUE, async (job) => {
  const { recipientId, deviceId, jid, messageType, content, isLast } = job.data;
  
  try {
    // 1. Mark recipient as processing (optional to add PROCESSING status in DB, omitted for simplicity)
    const socket = waService.sessions.get(deviceId);
    
    if (!socket) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    // 2. Send Message
    let msgOptions = {};
    if (messageType === 'TEXT') {
       msgOptions = { text: content };
    } else {
       // if it's media, parse content (we assume content is JSON with url and caption previously saved)
       try {
           const mediaObj = JSON.parse(content);
           if (messageType === 'IMAGE') msgOptions = { image: { url: mediaObj.url }, caption: mediaObj.caption };
           else if (messageType === 'VIDEO') msgOptions = { video: { url: mediaObj.url }, caption: mediaObj.caption };
           else if (messageType === 'DOCUMENT') msgOptions = { document: { url: mediaObj.url }, fileName: mediaObj.caption };
       } catch (e) {
           msgOptions = { text: content }; // fallback
       }
    }

    await socket.sendMessage(jid, msgOptions);

    // 3. Update Recipient Status -> SENT
    await prisma.broadcastRecipient.update({
      where: { id: recipientId },
      data: { status: 'SENT', sentAt: new Date() }
    });

    // 4. Update parent job stats
    const recipient = await prisma.broadcastRecipient.findUnique({ where: { id: recipientId }});
    if (recipient) {
       await prisma.broadcastJob.update({
          where: { id: recipient.jobId },
          data: { sentCount: { increment: 1 } }
       });
    }

  } catch (error) {
    console.error(`Broadcast Failed for recipient ${recipientId}:`, error);
    
    // Update status -> FAILED
    await prisma.broadcastRecipient.update({
      where: { id: recipientId },
      data: { status: 'FAILED' }
    });

    const recipient = await prisma.broadcastRecipient.findUnique({ where: { id: recipientId }});
    if (recipient) {
       await prisma.broadcastJob.update({
          where: { id: recipient.jobId },
          data: { failCount: { increment: 1 } }
       });
    }
  }

  // Delay random 2-10 seconds to prevent getting banned
  const delayMs = Math.floor(Math.random() * (10000 - 2000 + 1)) + 2000;
  await sleep(delayMs);

}, { connection, concurrency: 1 }); // Concurrency 1 ensures we do respect the delay per device (if global). Better design: concurrency 1 per deviceId.

broadcastWorker.on('completed', (job) => {
  // console.log(`Broadcast job ${job.id} completed`);
});

broadcastWorker.on('failed', (job, err) => {
  console.error(`Broadcast job ${job.id} failed:`, err);
});

module.exports = { broadcastQueue, broadcastWorker };
