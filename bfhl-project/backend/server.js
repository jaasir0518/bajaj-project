const express = require('express');
const cors = require('cors');
const bfhlRoutes = require('./src/routes/bfhlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const defaultFrontendOrigin = 'https://bajaj-project-liard-rho.vercel.app';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || defaultFrontendOrigin)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server requests and local tools that don't send Origin.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

// Routes
app.use('/', bfhlRoutes);

app.listen(PORT, () => {
  // Server running
});
