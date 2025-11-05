import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'nurse'],
    required: true,
    default: 'nurse'
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: function() { return this.role === 'nurse'; }
  },
  status: {
    type: String,
    enum: ['pending_activation', 'active', 'suspended'],
    default: 'pending_activation'
  },
  lastLogin: {
    type: Date
  },
  activationToken: {
    type: String
  },
  activationTokenExpiry: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpiry: {
    type: Date
  },
  temporaryPassword: {
    type: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to generate activation token
userSchema.methods.generateActivationToken = function() {
  const activationToken = crypto.randomBytes(32).toString('hex');
  this.activationToken = activationToken;
  this.activationTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return activationToken;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = resetToken;
  this.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return resetToken;
};

// Method to check if activation token is valid
userSchema.methods.isActivationTokenValid = function(token) {
  return this.activationToken === token && 
         this.activationTokenExpiry && 
         this.activationTokenExpiry > new Date();
};

// Method to check if reset token is valid
userSchema.methods.isResetTokenValid = function(token) {
  return this.resetPasswordToken === token && 
         this.resetPasswordExpiry && 
         this.resetPasswordExpiry > new Date();
};

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ activationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

const User = mongoose.model('User', userSchema);

export default User;
