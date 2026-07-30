const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  // End user info
  userName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, match: [/^[6-9]\d{9}$/, 'Invalid mobile number'] },
  email: { type: String, required: true, lowercase: true },

  // Location info
  district: { type: String, required: true },
  facilityType: { type: String, required: true }, // PHC, CHC, DH, SDH, etc.
  facilityName: { type: String, required: true },
  facilityCode: { type: String, required: true },

  // Complaint details — array so users can pick multiple issues
  issueCategory: {
    type: [String],
    required: true,
    validate: {
      validator: arr => Array.isArray(arr) && arr.length > 0,
      message: 'At least one issue must be selected'
    },
    enum: {
      values: [
        'No Internet Connectivity',
        'Slow Internet Speed',
        'Frequent Disconnections',
        'WiFi Not Visible / SSID Not Broadcasting',
        'Unable to Connect to WiFi',
        'Limited Connectivity (Connected but No Internet)',
        'Router / Access Point Not Working',
        'Power Issue at Equipment',
        'Other'
      ],
      message: 'Invalid issue category: {VALUE}'
    }
  },
  issueDescription: { type: String, trim: true, maxlength: 2000 },
  attachmentUrls: [{ type: String }], // Optional images (screenshots, etc.) - max 2

  // Ticket management
  ticketId: { type: String, unique: true },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Engineer assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date },
  acceptedAt: { type: Date },

  // Resolution details
  resolutionNotes: { type: String, trim: true, maxlength: 2000 },
  resolvedAt: { type: Date },
  closedAt: { type: Date },

  // OTP verification for resolve (hashed, cleared after successful verify)
  pendingResolveOTP: { type: String },
  pendingResolveOTPExpiry: { type: Date },

  // Timeline / activity log
  activityLog: [{
    action: String,
    performedBy: String,
    performedByRole: String,
    timestamp: { type: Date, default: Date.now },
    notes: String
  }]

}, { timestamps: true });

complaintSchema.index({ email: 1 });
complaintSchema.index({ mobile: 1 });
complaintSchema.index({ status: 1, district: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ ticketId: 1 });
complaintSchema.index({ facilityName: 1 });
complaintSchema.index({ userName: 1 });

// Auto-generate ticket ID before save
complaintSchema.pre('save', function(next) {
  if (!this.ticketId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 90000) + 10000);
    this.ticketId = `JH-${year}${month}-${seq}`;
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
