const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const QRCode = require('qrcode');

// Admin registration
router.post('/register', [
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('organization', 'Organization name is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, organization } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ msg: 'Admin already exists' });
    }

    admin = new Admin({
      username,
      email,
      password,
      organization
    });

    await admin.save();

    const payload = {
      admin: {
        id: admin.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Admin login
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      admin: {
        id: admin.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Generate queue code/QR
router.post('/generate-code', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ msg: 'Admin not found' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const qrData = JSON.stringify({ 
      adminId: admin.id,
      code,
      organization: admin.organization
    });

    const qrCode = await QRCode.toDataURL(qrData);

    res.json({
      code,
      qrCode
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get current queue
router.get('/queue', auth, async (req, res) => {
  try {
    const users = await User.find({ status: 'waiting' }).sort('tokenNumber');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark user as served
router.put('/serve/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.status = 'completed';
    await user.save();

    // Update positions of remaining users
    await User.updateMany(
      { status: 'waiting', tokenNumber: { $gt: user.tokenNumber } },
      { $inc: { queuePosition: -1 } }
    );

    res.json({ msg: 'User marked as served' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Emergency stop queue
router.put('/emergency-stop', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ msg: 'Admin not found' });
    }

    const { emergencyStop, emergencyMessage } = req.body;
    
    admin.queueSettings.emergencyStop = emergencyStop;
    admin.queueSettings.emergencyMessage = emergencyMessage || '';
    await admin.save();

    // Add 20 minutes to all waiting users' estimated time
    if (emergencyStop) {
      await User.updateMany(
        { status: 'waiting' },
        { $inc: { estimatedTime: 20 } }
      );
    }

    res.json(admin.queueSettings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get emergency status
router.get('/emergency-status', async (req, res) => {
  try {
    const admin = await Admin.findOne().sort({ createdAt: -1 });
    if (!admin) {
      return res.status(404).json({ msg: 'No admin found' });
    }

    res.json(admin.queueSettings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;