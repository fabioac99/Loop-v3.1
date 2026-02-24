import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);
  private fromAddress: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.fromAddress = process.env.SMTP_FROM || 'noreply@loop.local';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      // Verify connection
      this.transporter.verify()
        .then(() => this.logger.log(`Mail service connected to ${host}:${port}`))
        .catch((err) => this.logger.error(`Mail service connection failed: ${err.message}`));
    } else {
      this.logger.warn('Mail service not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Mail not sent (not configured): to=${to} subject=${subject}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return false;
    }
  }

  // ==================== EMAIL TEMPLATES ====================

  private baseTemplate(title: string, body: string, actionUrl?: string, actionLabel?: string): string {
    const appName = process.env.APP_NAME || 'LOOP';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:24px;">
    <div style="background:#18181b;border-radius:12px 12px 0 0;padding:20px 24px;">
      <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">${appName}</span>
    </div>
    <div style="background:#ffffff;padding:28px 24px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#18181b;">${title}</h2>
      <div style="font-size:14px;line-height:1.6;color:#3f3f46;">${body}</div>
      ${actionUrl ? `
      <div style="margin:24px 0 8px;">
        <a href="${actionUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">${actionLabel || 'View'}</a>
      </div>` : ''}
    </div>
    <div style="background:#fafafa;border-radius:0 0 12px 12px;padding:16px 24px;border:1px solid #e4e4e7;border-top:0;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">This is an automated notification from <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">${appName}</a>.</p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendTicketCreated(to: string, ticket: any) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/dashboard/tickets/${ticket.id}`;
    return this.sendMail(to,
      `[${ticket.ticketNumber}] New ticket: ${ticket.title}`,
      this.baseTemplate('New Ticket Created',
        `<p>A new ticket has been created and requires your attention.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:120px;">Ticket</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${ticket.ticketNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Title</td><td style="padding:6px 0;font-size:13px;">${ticket.title}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Priority</td><td style="padding:6px 0;font-size:13px;">${ticket.priority}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Status</td><td style="padding:6px 0;font-size:13px;">${ticket.status}</td></tr>
        </table>`,
        url, 'View Ticket'));
  }

  async sendTicketAssigned(to: string, ticket: any) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/dashboard/tickets/${ticket.id}`;
    return this.sendMail(to,
      `[${ticket.ticketNumber}] Ticket assigned to you`,
      this.baseTemplate('Ticket Assigned',
        `<p>A ticket has been assigned to you.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:120px;">Ticket</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${ticket.ticketNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Title</td><td style="padding:6px 0;font-size:13px;">${ticket.title}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Priority</td><td style="padding:6px 0;font-size:13px;">${ticket.priority}</td></tr>
        </table>`,
        url, 'View Ticket'));
  }

  async sendNewMessage(to: string, ticket: any, senderName: string) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/dashboard/tickets/${ticket.id}`;
    return this.sendMail(to,
      `[${ticket.ticketNumber}] New reply from ${senderName}`,
      this.baseTemplate('New Reply',
        `<p><strong>${senderName}</strong> replied on ticket <strong>${ticket.ticketNumber}</strong>: ${ticket.title}</p>`,
        url, 'View Conversation'));
  }

  async sendStatusChanged(to: string, ticket: any, oldStatus: string, newStatus: string) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/dashboard/tickets/${ticket.id}`;
    return this.sendMail(to,
      `[${ticket.ticketNumber}] Status changed to ${newStatus}`,
      this.baseTemplate('Status Updated',
        `<p>Ticket <strong>${ticket.ticketNumber}</strong> status has been updated.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:120px;">Ticket</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${ticket.ticketNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Previous</td><td style="padding:6px 0;font-size:13px;">${oldStatus}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">New</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#6366f1;">${newStatus}</td></tr>
        </table>`,
        url, 'View Ticket'));
  }

  async sendTicketForwarded(to: string, ticket: any, fromName: string, message?: string) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/dashboard/tickets/${ticket.id}`;
    return this.sendMail(to,
      `[${ticket.ticketNumber}] Ticket forwarded to you by ${fromName}`,
      this.baseTemplate('Ticket Forwarded',
        `<p><strong>${fromName}</strong> forwarded a ticket to you.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:120px;">Ticket</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${ticket.ticketNumber}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Title</td><td style="padding:6px 0;font-size:13px;">${ticket.title}</td></tr>
        </table>
        ${message ? `<div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;color:#3f3f46;border-left:3px solid #6366f1;"><em>"${message}"</em></div>` : ''}`,
        url, 'View Ticket'));
  }

  async sendMentioned(to: string, ticket: any, senderName: string) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const url = `${appUrl}/dashboard/tickets/${ticket.id}`;
    return this.sendMail(to,
      `[${ticket.ticketNumber}] ${senderName} mentioned you`,
      this.baseTemplate('You Were Mentioned',
        `<p><strong>${senderName}</strong> mentioned you in ticket <strong>${ticket.ticketNumber}</strong>: ${ticket.title}</p>`,
        url, 'View Conversation'));
  }
}
