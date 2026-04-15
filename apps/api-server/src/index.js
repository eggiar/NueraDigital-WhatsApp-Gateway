const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Dev logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100 // 100 requests per 10 mins per IP
});
app.use(limiter);

// Default Route
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'NueraDigital WhatsApp Gateway API is running' });
});

// Import Routes
const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/device.routes');
const messageRoutes = require('./routes/message.routes');
const contactRoutes = require('./routes/contact.routes');
const groupRoutes = require('./routes/group.routes');
const broadcastRoutes = require('./routes/broadcast.routes');
const autoReplyRoutes = require('./routes/autoReply.routes');
const webhookRoutes = require('./routes/webhook.routes');
const aiConfigRoutes = require('./routes/aiConfig.routes');
const planRoutes = require('./routes/plan.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const usageRoutes = require('./routes/usage.routes');
const invoiceRoutes = require('./routes/invoice.routes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/auto-reply', autoReplyRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/ai-config', aiConfigRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/invoices', invoiceRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
