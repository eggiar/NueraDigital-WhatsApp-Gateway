const prisma = require('../lib/prisma');
const crypto = require('crypto');
const emailService = require('../services/email.service');

// Normally you'd use Midtrans Node.js client or raw Fetch API. 
// We use fetch for simplicity and to avoid another dependency.

// @desc    Create Transaction (Midtrans Snap Token)
// @route   POST /api/payment/create-transaction
exports.createTransaction = async (req, res, next) => {
  try {
    const { planId } = req.body;
    
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    // Generate unique order ID
    const midtransOrderId = `ORDER-${req.user.id.substring(0, 5)}-${Date.now()}`;

    // Create Transaction in DB
    const transaction = await prisma.transaction.create({
        data: {
            userId: req.user.id,
            planId: plan.id,
            amount: plan.price,
            status: 'PENDING',
            midtransOrderId
        }
    });

    // Request Snap Token to Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const baseUrl = isProduction ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authString = Buffer.from(serverKey + ':').toString('base64');

    const payload = {
        transaction_details: {
            order_id: midtransOrderId,
            gross_amount: plan.price
        },
        item_details: [{
            id: plan.id,
            price: plan.price,
            quantity: 1,
            name: plan.name
        }],
        customer_details: {
            first_name: req.user.name,
            email: req.user.email
        }
    };

    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Midtrans Error:', data);
        return res.status(500).json({ success: false, error: 'Failed to create payment' });
    }

    res.status(200).json({ 
        success: true, 
        data: {
            transactionId: transaction.id,
            token: data.token,
            redirect_url: data.redirect_url
        } 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Midtrans Webhook Callback
// @route   POST /api/payment/webhook
// @access  Public
exports.midtransWebhook = async (req, res, next) => {
  try {
      const payload = req.body;
      const serverKey = process.env.MIDTRANS_SERVER_KEY;

      // Verify signature
      const hash = crypto.createHash('sha512').update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`).digest('hex');
      
      if (hash !== payload.signature_key) {
          return res.status(403).json({ success: false, error: 'Invalid signature' });
      }

      const transactionStatus = payload.transaction_status;
      const orderId = payload.order_id;
      const fraudStatus = payload.fraud_status;

      // Find transaction
      const transaction = await prisma.transaction.findUnique({
          where: { midtransOrderId: orderId },
          include: { user: true, plan: true }
      });

      if (!transaction) {
          return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      // Logic based on status
      let newStatus = transaction.status;

      if (transactionStatus == 'capture'){
          if (fraudStatus == 'challenge'){
              newStatus = 'PENDING';
          } else if (fraudStatus == 'accept'){
              newStatus = 'PAID';
          }
      } else if (transactionStatus == 'settlement'){
          newStatus = 'PAID';
      } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire'){
          newStatus = 'FAILED';
      } else if (transactionStatus == 'pending'){
          newStatus = 'PENDING';
      }

      // Update Transaction
      if (newStatus !== transaction.status) {
          await prisma.transaction.update({
              where: { id: transaction.id },
              data: { status: newStatus }
          });

          // If paid, create subscription and invoice
          if (newStatus === 'PAID') {
              const startAt = new Date();
              const expiredAt = new Date();
              expiredAt.setMonth(expiredAt.getMonth() + 1);

              await prisma.subscription.create({
                  data: {
                      userId: transaction.userId,
                      planId: transaction.planId,
                      startAt,
                      expiredAt,
                      status: 'ACTIVE'
                  }
              });

              // Create invoice record
              await prisma.invoice.create({
                  data: {
                      transactionId: transaction.id,
                      pdfUrl: `https://app.midtrans.com/v2/transactions/${orderId}/pdf`,
                      paidAt: new Date()
                  }
              });

              emailService.sendInvoiceEmail(transaction.user.email, transaction.user.name, `https://app.midtrans.com/v2/transactions/${orderId}/pdf`).catch(console.error);
          }
      }

      res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
