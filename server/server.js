require('dotenv').config({ path: __dirname + '/.env' });  // __dirname points to /server
console.log("ENV:", process.env.MONGO_URI);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


// Routes will be added here

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/admin', require('./routes/admin')); //added on24may while resolving issue
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'active', 
    time: new Date(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

console.log(require('dotenv').config());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));