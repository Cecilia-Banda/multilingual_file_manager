const express = require('express');
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./config/database')
const userRoutes = require('./routes/userauth');
const uploadRoutes = require('./controllers/fileController');
const queueService = require('./services/uploadServices');
const filesRoutes = require('./routes/filesRoutes')

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Parse JSON request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', uploadRoutes);

connectMongoDB();

const queue = queueService;

app.use('/auth', authRoutes);

app.use('/user', userRoutes);
app.use('/file', filesRoutes)

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.error('Health check failed:', error);
  process.exit(1);
});

req.end();

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});