const mongoose = require('mongoose');

const userVerifySchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required for verification'],
    validate: {
      validator: function(v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Enter valid email'
    }
  },
  otp: {
    type: String, // Changed to String to handle OTPs better
    required: [true, 'OTP is required']
  },
  expireIn: {
    type: Date,
    required: true
  }
}, {
  timestamps: true,
  collection: 'userverifies' // Plural form for MongoDB collections
});

// Create TTL index for automatic expiration after 3 minutes
userVerifySchema.index({ expireIn: 1 }, { expireAfterSeconds: 0 });

const UserVerify = mongoose.model('UserVerify', userVerifySchema);

module.exports = UserVerify;