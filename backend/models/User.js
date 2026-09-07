const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, validate: { validator: v => v.length >= 6, message: 'Password must be at least 6 characters' } },
  role: { type: String, enum: ['admin', 'engineer', 'management', 'teamLead'], required: true },
  // Engineers: links to their Team Lead user
  teamLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedDistricts: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
