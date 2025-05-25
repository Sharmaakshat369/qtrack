const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    //unique: true
  },
  tokenNumber: {
    type: Number,
    default: 0
  },
  queuePosition: {
    type: Number,
    default: 0
  },
  estimatedTime: {
    type: String,
    default: '0 min'
  },
  status: {
    type: String,
    enum: ['waiting', 'processing', 'completed'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);