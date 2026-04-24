const express = require('express');
const { processBfhl } = require('../controllers/bfhlController');

const router = express.Router();

router.get('/bfhl', (req, res) => {
  res.status(200).json({ operation_code: 1 });
});

router.post('/bfhl', processBfhl);

module.exports = router;
