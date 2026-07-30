const nodemailer = require('nodemailer');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
}

async function sendOTPEmail(to, otp, ticketId, userName) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const safeName = escapeHtml(userName);
  const safeTicket = escapeHtml(ticketId);
  const safeOtp = escapeHtml(otp);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #0F4C81;">JH Health WiFi Complaint Portal</h2>
      <p>Dear ${safeName},</p>
      <p>Your complaint ticket <strong>${safeTicket}</strong> has been marked for resolution by our engineer.</p>
      <p>To confirm the resolution, please share this <strong>6-digit OTP</strong> with the engineer:</p>
      <div style="background: #f0f4f8; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0;">
        ${safeOtp}
      </div>
      <p style="color: #666; font-size: 12px;">This OTP is valid for 15 minutes. Do not share it with anyone except the engineer handling your complaint.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from,
      to,
      subject: `Resolution OTP for Ticket ${safeTicket} - JH Health WiFi`,
      html
    });
  } else {
    console.log('\n📧 [Email not configured] OTP would be sent to:', to);
    console.log('   Ticket:', safeTicket, '| OTP:', safeOtp, '| Valid 15 min\n');
  }
}

async function sendRegistrationOTPEmail(to, otp) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const safeOtp = escapeHtml(otp);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #0F4C81;">JH Health WiFi Complaint Portal</h2>
      <p>Your <strong>6-digit OTP</strong> to verify your email for complaint registration:</p>
      <div style="background: #f0f4f8; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0;">
        ${safeOtp}
      </div>
      <p style="color: #666; font-size: 12px;">This OTP is valid for 15 minutes. Do not share it with anyone.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from,
      to,
      subject: 'Verify your email - JH Health WiFi Complaint Portal',
      html
    });
  } else {
    console.log('\n📧 [Email not configured] Registration OTP would be sent to:', to);
    console.log('   OTP:', safeOtp, '| Valid 15 min\n');
  }
}

async function sendComplaintSummaryEmail(to, complaint) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const issueList = Array.isArray(complaint.issueCategory)
    ? complaint.issueCategory
    : [complaint.issueCategory].filter(Boolean);
  const safeUserName = escapeHtml(complaint.userName || 'User');
  const safeTicketId = escapeHtml(complaint.ticketId);
  const safeDistrict = escapeHtml(complaint.district || '-');
  const safeFacilityType = escapeHtml(complaint.facilityType || '-');
  const safeFacilityName = escapeHtml(complaint.facilityName || '-');
  const issuesHtml = issueList.length
    ? issueList.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('')
    : '<li>Not specified</li>';
  const createdAt = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0F4C81; margin-bottom: 8px;">Complaint Submitted Successfully</h2>
      <p>Dear ${safeUserName},</p>
      <p>Your WiFi complaint has been registered successfully. Please save your ticket ID for tracking.</p>
      <div style="background: #f0f4f8; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <div style="font-size: 12px; color: #666;">Ticket ID</div>
        <div style="font-size: 20px; font-weight: 700; color: #0F4C81;">${safeTicketId}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <tr><td style="padding: 6px 0; color: #666;">Submitted On</td><td style="padding: 6px 0; font-weight: 600;">${createdAt}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">District</td><td style="padding: 6px 0; font-weight: 600;">${safeDistrict}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Facility Type</td><td style="padding: 6px 0; font-weight: 600;">${safeFacilityType}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Facility</td><td style="padding: 6px 0; font-weight: 600;">${safeFacilityName}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Issues</td><td style="padding: 6px 0; font-weight: 600;"><ul style="margin: 0; padding-left: 18px;">${issuesHtml}</ul></td></tr>
      </table>
      <p style="margin-top: 14px;">You can track status using your email/mobile on the complaint portal.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from,
      to,
      subject: `Complaint Registered: ${safeTicketId} - JH Health WiFi`,
      html
    });
  } else {
    console.log('\n📧 [Email not configured] Complaint summary would be sent to:', to);
    console.log('   Ticket:', safeTicketId, '| Issues:', issueList.join(', ') || 'N/A', '\n');
  }
}

async function sendComplaintAlertEmail(recipients, complaint) {
  if (!Array.isArray(recipients) || recipients.length === 0) return;
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const issueList = Array.isArray(complaint.issueCategory)
    ? complaint.issueCategory
    : [complaint.issueCategory].filter(Boolean);
  const safeTicketId = escapeHtml(complaint.ticketId);
  const safeUserName = escapeHtml(complaint.userName || '-');
  const safeMobile = escapeHtml(complaint.mobile || '-');
  const safeDistrict = escapeHtml(complaint.district || '-');
  const safeFacilityName = escapeHtml(complaint.facilityName || '-');
  const safeFacilityCode = escapeHtml(complaint.facilityCode || '-');
  const safeIssues = issueList.map(i => escapeHtml(i)).join(', ') || '-';
  const createdAt = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0F4C81;">New Complaint Registered</h2>
      <p>A complaint has been registered in the JH Health WiFi portal.</p>
      <div style="background: #f0f4f8; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
        <div style="font-size: 12px; color: #666;">Ticket ID</div>
        <div style="font-size: 20px; font-weight: 700; color: #0F4C81;">${safeTicketId}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #666;">Complainant</td><td style="padding: 6px 0; font-weight: 600;">${safeUserName} (${safeMobile})</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Submitted On</td><td style="padding: 6px 0; font-weight: 600;">${createdAt}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">District</td><td style="padding: 6px 0; font-weight: 600;">${safeDistrict}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Facility</td><td style="padding: 6px 0; font-weight: 600;">${safeFacilityName} (${safeFacilityCode})</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Issue(s)</td><td style="padding: 6px 0; font-weight: 600;">${safeIssues}</td></tr>
      </table>
      <p style="margin-top: 14px;">Please review and take required action.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from,
      to: recipients.join(','),
      subject: `New Complaint: ${safeTicketId} - JH Health WiFi`,
      html
    });
  } else {
    console.log('\n📧 [Email not configured] Complaint alert would be sent to:', recipients.join(', '));
    console.log('   Ticket:', safeTicketId, '| Facility:', safeFacilityName, '\n');
  }
}

async function sendTicketAcceptedEmail(recipients, complaint, engineer) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const to = Array.isArray(recipients) ? recipients.join(',') : recipients;
  const safeTicketId = escapeHtml(complaint.ticketId);
  const safeEngName = escapeHtml(engineer?.name || 'N/A');
  const safeEngEmail = escapeHtml(engineer?.email || 'N/A');
  const safeDistrict = escapeHtml(complaint.district || '-');
  const safeFacilityName = escapeHtml(complaint.facilityName || '-');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0F4C81;">Ticket Accepted by Engineer</h2>
      <p>Complaint ticket <strong>${safeTicketId}</strong> has been accepted by engineer <strong>${safeEngName}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <tr><td style="padding: 6px 0; color: #666;">Ticket ID</td><td style="padding: 6px 0; font-weight: 600;">${safeTicketId}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Engineer</td><td style="padding: 6px 0; font-weight: 600;">${safeEngName} (${safeEngEmail})</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">District</td><td style="padding: 6px 0; font-weight: 600;">${safeDistrict}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Facility</td><td style="padding: 6px 0; font-weight: 600;">${safeFacilityName}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({ from, to, subject: `Ticket Accepted: ${safeTicketId} - JH Health WiFi`, html });
  } else {
    console.log(`\n📧 [Email not configured] Ticket accepted notification would be sent to: ${to}`);
    console.log('   Ticket:', safeTicketId, '| Engineer:', safeEngName, '\n');
  }
}

async function sendTicketResolvedEmail(recipients, complaint) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const to = Array.isArray(recipients) ? recipients.join(',') : recipients;
  const safeTicketId = escapeHtml(complaint.ticketId);
  const safeNotes = complaint.resolutionNotes ? escapeHtml(complaint.resolutionNotes) : '';
  const safeDistrict = escapeHtml(complaint.district || '-');
  const safeFacilityName = escapeHtml(complaint.facilityName || '-');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0F4C81;">Complaint Resolved</h2>
      <p>Complaint ticket <strong>${safeTicketId}</strong> has been marked as resolved.</p>
      ${safeNotes ? `<p><strong>Resolution Notes:</strong><br>${safeNotes}</p>` : ''}
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <tr><td style="padding: 6px 0; color: #666;">Ticket ID</td><td style="padding: 6px 0; font-weight: 600;">${safeTicketId}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Resolved At</td><td style="padding: 6px 0; font-weight: 600;">${new Date(complaint.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">District</td><td style="padding: 6px 0; font-weight: 600;">${safeDistrict}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Facility</td><td style="padding: 6px 0; font-weight: 600;">${safeFacilityName}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({ from, to, subject: `Complaint Resolved: ${safeTicketId} - JH Health WiFi`, html });
  } else {
    console.log(`\n📧 [Email not configured] Resolution notification would be sent to: ${to}`);
    console.log('   Ticket:', safeTicketId, '\n');
  }
}

async function sendTicketClosedEmail(recipients, complaint) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jhhealthwifi.gov.in';
  const to = Array.isArray(recipients) ? recipients.join(',') : recipients;
  const safeTicketId = escapeHtml(complaint.ticketId);
  const safeDistrict = escapeHtml(complaint.district || '-');
  const safeFacilityName = escapeHtml(complaint.facilityName || '-');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0F4C81;">Complaint Closed</h2>
      <p>Complaint ticket <strong>${safeTicketId}</strong> has been closed.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <tr><td style="padding: 6px 0; color: #666;">Ticket ID</td><td style="padding: 6px 0; font-weight: 600;">${safeTicketId}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Closed At</td><td style="padding: 6px 0; font-weight: 600;">${new Date(complaint.closedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">District</td><td style="padding: 6px 0; font-weight: 600;">${safeDistrict}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Facility</td><td style="padding: 6px 0; font-weight: 600;">${safeFacilityName}</td></tr>
      </table>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 11px;">Jharkhand Health Department · NIC</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({ from, to, subject: `Complaint Closed: ${safeTicketId} - JH Health WiFi`, html });
  } else {
    console.log(`\n📧 [Email not configured] Closure notification would be sent to: ${to}`);
    console.log('   Ticket:', safeTicketId, '\n');
  }
}

module.exports = { sendOTPEmail, sendRegistrationOTPEmail, sendComplaintSummaryEmail, sendComplaintAlertEmail, sendTicketAcceptedEmail, sendTicketResolvedEmail, sendTicketClosedEmail };
