const express = require('express');
const cors = require('cors');
const bfhlRoutes = require('./src/routes/bfhlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
