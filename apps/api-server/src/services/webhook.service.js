const prisma = require('../lib/prisma');
const { Queue, Worker } = require('bullmq');
const { connection } = require('../lib/redis');

const WEBHOOK_QUEUE = 'webhookQueue';
const webhookQueue = new Queue(WEBHOOK_QUEUE, { connection });
const crypto = require('crypto');

class WebhookService {
  constructor() {
    this.worker = new Worker(WEBHOOK_QUEUE, async (job) => {
        const { webhookId, event, payload, url, secret } = job.data;
        try {
            // Include signature if secret is provided
            const headers = { 'Content-Type': 'application/json' };
            const payloadString = JSON.stringify(payload);

            if (secret) {
                const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
                headers['X-Hub-Signature-256'] = signature;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: payloadString,
                timeout: 10000 // 10 seconds
            });

            const statusCode = response.status;
            
            // Log to DB
            await prisma.webhookLog.create({
                data: {
                    webhookId,
                    event,
                    payload: payloadString,
                    statusCode
                }
            });

            if (!response.ok) {
               throw new Error(`Server responded with ${statusCode}`);
            }

        } catch (error) {
            console.error(`Webhook delivery failed for event ${event} to ${url}`, error);
            // Log failure
            await prisma.webhookLog.create({
                data: {
                    webhookId,
                    event,
                    payload: JSON.stringify(payload),
                    // Use generic code for failure if response wasn't received (timeout/conn refused)
                    statusCode: error.message.includes('responded with') ? parseInt(error.message.split(' ').pop()) : 500
                }
            });
            throw error; // Let BullMQ retry
        }
    }, { connection, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    this.worker.on('failed', (job, err) => {
        console.error(`Webhook job ${job.id} failed after all retries:`, err);
    });
  }

  // Wrapper to send event from within app
  async sendEvent(webhookId, event, payload) {
      const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
      if (!webhook) return;
      
      const configuredEvents = JSON.parse(webhook.events);
      if (!configuredEvents.includes(event) && event !== 'ping') return;

      await webhookQueue.add(`webhook-${event}`, {
          webhookId: webhook.id,
          event,
          payload,
          url: webhook.url,
          secret: webhook.secret
      });
  }

  // Trigger webhooks for a specific user ID and event
  async triggerUserEvent(userId, event, payload) {
      // Find all webhooks for this user that are listening to this event
      const webhooks = await prisma.webhook.findMany({ where: { userId }});

      for (const webhook of webhooks) {
          const configuredEvents = JSON.parse(webhook.events);
          if (configuredEvents.includes(event)) {
             await webhookQueue.add(`webhook-${event}`, {
                 webhookId: webhook.id,
                 event,
                 payload,
                 url: webhook.url,
                 secret: webhook.secret
             });
          }
      }
  }
}

module.exports = new WebhookService();
