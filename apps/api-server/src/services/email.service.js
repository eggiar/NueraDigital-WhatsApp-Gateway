const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');

class EmailService {
    async getTransporter() {
        // Fetch config from DB dynamically
        const smtpHost = await prisma.systemConfig.findUnique({ where: { key: 'SMTP_HOST' }});
        const smtpPort = await prisma.systemConfig.findUnique({ where: { key: 'SMTP_PORT' }});
        const smtpUser = await prisma.systemConfig.findUnique({ where: { key: 'SMTP_USER' }});
        const smtpPass = await prisma.systemConfig.findUnique({ where: { key: 'SMTP_PASS' }});

        // Use fallback dummy transporter if not configured
        if (!smtpHost || !smtpUser) {
           console.warn('SMTP config missing, skipping email send');
           return null;
        }

        return nodemailer.createTransport({
            host: smtpHost.value,
            port: parseInt(smtpPort.value, 10) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: smtpUser.value,
                pass: smtpPass.value
            }
        });
    }

    async sendEmail(to, subject, html) {
        try {
            const transporter = await this.getTransporter();
            if (!transporter) return false;

            const fromName = await prisma.systemConfig.findUnique({ where: { key: 'SMTP_FROM_NAME' }});
            const smtpUser = await prisma.systemConfig.findUnique({ where: { key: 'SMTP_USER' }});

            const fromStr = fromName ? `"${fromName.value}" <${smtpUser.value}>` : smtpUser.value;

            const info = await transporter.sendMail({
                from: fromStr,
                to,
                subject,
                html
            });

            console.log('Message sent: %s', info.messageId);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    async sendWelcomeEmail(to, name) {
        const subject = 'Welcome to NueraDigital WhatsApp Gateway';
        const html = `<h2>Welcome, ${name}!</h2><p>Thank you for registering. You can now connect your devices.</p>`;
        return this.sendEmail(to, subject, html);
    }

    async sendInvoiceEmail(to, name, invoiceUrl) {
        const subject = 'Your Invoice - NueraDigital';
        const html = `<h2>Hello ${name},</h2><p>Your subscription is active. View your invoice here: <a href="${invoiceUrl}">${invoiceUrl}</a></p>`;
        return this.sendEmail(to, subject, html);
    }
}

module.exports = new EmailService();
