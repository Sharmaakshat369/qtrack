const express = require('express');
const router = express.Router();
const User = require('../models/User');
const twilio = require('twilio');
const QRCode = require('qrcode');

const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Add user to queue
router.post('/add', async (req, res) => {
  const { name, phone } = req.body;

  // Basic validation
  if (!name || !phone) {
    return res.status(400).json({ msg: 'Name and phone are required' });
  }

  try {

    // Check if user already exists
    const existingUser = await User.findOne({ phone, status: 'waiting' });
    if (existingUser) {
      return res.json({
        tokenNumber: existingUser.tokenNumber,
        queuePosition: existingUser.queuePosition,
        estimatedTime: existingUser.estimatedTime,
        qrCode: existingUser.qrCode,
        existing: true
      });
    }



    // Get the last token number and increment
    const lastUser = await User.findOne().sort({ tokenNumber: -1 });
    const tokenNumber = lastUser ? lastUser.tokenNumber + 1 : 1;
    
    // Calculate position in queue
    const queueCount = await User.countDocuments({ status: 'waiting' });
    const queuePosition = queueCount + 1;
    const estimatedTime = `${queuePosition * 5} min`; // Assuming 5 min per person

    const user = new User({
      name,
      phone,
      tokenNumber,
      queuePosition,
      estimatedTime,
      status: 'waiting'
    });

    await user.save();

    // Generate QR code data
    const qrData = JSON.stringify({ userId: user._id, tokenNumber });
    const qrCode = await QRCode.toDataURL(qrData);

    // Send SMS notification
    await client.messages.create({
      body: `Hello ${name}, your token number is ${tokenNumber}. There are ${queuePosition-1} people ahead of you. Estimated waiting time: ${estimatedTime}.`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    res.json({
      tokenNumber,
      queuePosition,
      estimatedTime: `${estimatedTime} min`,
      qrCode: user.qrCode
    });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ 
      msg: 'Server error',
      error: err.message 
    });
  }
});

// Get queue status
router.get('/status/:tokenNumber', async (req, res) => {
  try {
    const user = await User.findOne({ tokenNumber: req.params.tokenNumber });
    if (!user) {
      return res.status(404).json({ msg: 'Token not found' });
    }

    res.json({
      tokenNumber: user.tokenNumber,
      queuePosition: user.queuePosition,
      estimatedTime: user.estimatedTime,
      status: user.status
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;