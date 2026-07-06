const NotificationDirectory = require('../models/NotificationDirectory');
const {
  sendComplaintSummaryEmail,
  sendComplaintAlertEmail,
  sendTicketAcceptedEmail,
  sendTicketResolvedEmail,
  sendTicketClosedEmail
} = require('../utils/email');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

/**
 * Builds the standard recipient list: Team Lead, State Head, Ops Manager (from
 * NotificationDirectory), plus an optional engineer email, minus an optional
 * excluded address (usually the customer, when they get a separate email).
 */
async function getStakeholderRecipients(complaint, { engineerEmail, excludeEmail } = {}) {
  const directory = await NotificationDirectory.findOne({ key: 'default' });
  const mapping = directory?.mappings?.find(m => m.facilityCode === complaint.facilityCode);

  const recipientSet = new Set();
  const excludeNormalized = normalizeEmail(excludeEmail);

  const addRecipient = (email) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return;
    if (!isValidEmail(normalized)) return;
    if (excludeNormalized && normalized === excludeNormalized) return;
    recipientSet.add(normalized);
  };

  if (engineerEmail) addRecipient(engineerEmail);
  addRecipient(mapping?.teamLead?.email);
  addRecipient(directory?.stateHead?.email);
  addRecipient(directory?.opsManager?.email);

  return [...recipientSet];
}

/**
 * FEATURE 3: Complaint Assigned (auto or manual)
 * Customer gets the detailed summary email; Engineer/TL/State Head/Ops Manager get the alert email.
 */
async function notifyAssigned(complaint, assignedEngineer) {
  const normalizedCustomerEmail = normalizeEmail(complaint.email);
  const result = { summaryEmailSent: true, stakeholderEmailSent: true };

  try {
    await sendComplaintSummaryEmail(normalizedCustomerEmail, complaint);
  } catch (err) {
    result.summaryEmailSent = false;
    console.error('Complaint summary email failed:', err);
  }

  try {
    const recipients = await getStakeholderRecipients(complaint, {
      engineerEmail: assignedEngineer?.email,
      excludeEmail: normalizedCustomerEmail
    });
    if (recipients.length) await sendComplaintAlertEmail(recipients, complaint);
  } catch (err) {
    result.stakeholderEmailSent = false;
    console.error('Stakeholder alert email failed:', err);
  }

  return result;
}

/**
 * FEATURE 3: Ticket Accepted by Engineer
 * (Currently unused — email notification on acceptance was intentionally disabled.)
 */
async function notifyAccepted(complaint, engineer) {
  try {
    const normalizedCustomerEmail = normalizeEmail(complaint.email);
    const stakeholders = await getStakeholderRecipients(complaint, {
      engineerEmail: engineer?.email,
      excludeEmail: normalizedCustomerEmail
    });
    const recipients = normalizedCustomerEmail ? [normalizedCustomerEmail, ...stakeholders] : stakeholders;
    await sendTicketAcceptedEmail(recipients, complaint, engineer);
    return true;
  } catch (err) {
    console.error('Ticket accepted email failed:', err);
    return false;
  }
}

/**
 * FEATURE 3: Ticket Resolved
 */
async function notifyResolved(complaint) {
  try {
    const normalizedCustomerEmail = normalizeEmail(complaint.email);
    const engineerEmail = complaint.assignedTo?.email;
    const stakeholders = await getStakeholderRecipients(complaint, {
      engineerEmail,
      excludeEmail: normalizedCustomerEmail
    });
    const recipients = normalizedCustomerEmail ? [normalizedCustomerEmail, ...stakeholders] : stakeholders;
    await sendTicketResolvedEmail(recipients, complaint);
    return true;
  } catch (err) {
    console.error('Ticket resolved email failed:', err);
    return false;
  }
}

/**
 * FEATURE 3: Ticket Closed
 */
async function notifyClosed(complaint) {
  try {
    const normalizedCustomerEmail = normalizeEmail(complaint.email);
    const engineerEmail = complaint.assignedTo?.email;
    const stakeholders = await getStakeholderRecipients(complaint, {
      engineerEmail,
      excludeEmail: normalizedCustomerEmail
    });
    const recipients = normalizedCustomerEmail ? [normalizedCustomerEmail, ...stakeholders] : stakeholders;
    await sendTicketClosedEmail(recipients, complaint);
    return true;
  } catch (err) {
    console.error('Ticket closed email failed:', err);
    return false;
  }
}

module.exports = {
  getStakeholderRecipients,
  notifyAssigned,
  notifyAccepted,
  notifyResolved,
  notifyClosed
};