const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otpHash: { type: String, required: true },
  expiry: { type: Date, required: true },
  type: { type: String, enum: ['registration', 'resolve'], default: 'registration' },
  verifiedAt: { type: Date }
}, { timestamps: true });

verificationCodeSchema.index({ email: 1, type: 1 });
verificationCodeSchema.index({ expiry: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
