const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  queueSettings: {
    emergencyStop: {
      type: Boolean,
      default: false
    },
    emergencyMessage: {
      type: String,
      default: ''
    }
  }
});

AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);