// Email sending functions with template rendering

import { readFileSync } from 'fs';
import { join } from 'path';
import { sendEmail } from './transport';

interface TemplateVariables {
  [key: string]: string | number;
}

const templateCache = new Map<string, string>();

function loadTemplate(templatePath: string): string {
  const cached = templateCache.get(templatePath);
  if (cached) return cached;
  const template = readFileSync(templatePath, 'utf-8');
  templateCache.set(templatePath, template);
  return template;
}

function renderTemplate(
  templatePath: string,
  variables: TemplateVariables
): string {
  const template = loadTemplate(templatePath);
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }

  return rendered;
}

// Check if email is configured
function isEmailConfigured(): boolean {
  const hasSes =
    process.env.EMAIL_PROVIDER === 'ses' &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY;
  const hasSmtp =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  return hasSes || hasSmtp;
}

// Admin Signup Notification
export async function sendAdminSignupNotification(data: {
  companyName: string;
  contactName: string;
  email: string;
  countryCode: string;
  mobile: string;
  initialUsers: number;
  notes: string;
  customerId: string;
}): Promise<void> {
  // Skip if email not configured
  if (!isEmailConfigured()) {
    console.log(
      '[Email] Skipped admin signup notification - email not configured'
    );
    return;
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

  const templatePath = join(
    process.cwd(),
    'lib/email/templates/admin-signup-notification.html'
  );
  const html = renderTemplate(templatePath, data);

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Customer Signup: ${data.companyName}`,
    html,
    text: `New customer signup: ${data.companyName}\nContact: ${data.contactName}\nEmail: ${data.email}\nPhone: ${data.countryCode} ${data.mobile}\nInitial Users: ${data.initialUsers}\nNotes: ${data.notes}\nCustomer ID: ${data.customerId}`,
  }).catch(error => {
    console.error('[Email] Failed to send admin signup notification:', error);
  });
}

// Customer Confirmation
export async function sendCustomerConfirmation(data: {
  email: string;
  companyName: string;
  customerId: string;
}): Promise<void> {
  // Skip if email not configured
  if (!isEmailConfigured()) {
    console.log('[Email] Skipped customer confirmation - email not configured');
    return;
  }

  const templatePath = join(
    process.cwd(),
    'lib/email/templates/customer-confirmation.html'
  );
  const html = renderTemplate(templatePath, data);

  await sendEmail({
    to: data.email,
    subject: 'Registration Received - iVALT OnDemand ID',
    html,
    text: `Thank you for registering ${data.companyName} for iVALT OnDemand ID trial access.\n\nReference ID: ${data.customerId}\n\nAn iVALT representative will provision your IDCONNECTION code within one business day.`,
  }).catch(error => {
    console.error('[Email] Failed to send customer confirmation:', error);
  });
}

// Admin Verification Alert
export async function sendAdminVerificationAlert(data: {
  idConnection: string;
  countryCode: string;
  mobile: string;
  status: string;
  ivaltStatusCode: number;
  requestId: string;
}): Promise<void> {
  // Skip if email not configured
  if (!isEmailConfigured()) {
    console.log(
      '[Email] Skipped admin verification alert - email not configured'
    );
    return;
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

  const templatePath = join(
    process.cwd(),
    'lib/email/templates/admin-verification-alert.html'
  );
  const html = renderTemplate(templatePath, data);

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Verification Attempt: ${data.idConnection}`,
    html,
    text: `Verification attempt:\nIDCONNECTION: ${data.idConnection}\nMobile: ${data.countryCode} ${data.mobile}\nStatus: ${data.status}\niVALT Status Code: ${data.ivaltStatusCode}\nRequest ID: ${data.requestId}`,
  }).catch(error => {
    console.error('[Email] Failed to send admin verification alert:', error);
  });
}
