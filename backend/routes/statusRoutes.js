const express = require('express');
const router = express.Router();
const { getConnectionStatus } = require('../services/whatsappClient');

router.get('/status', (req, res) => {
  res.json({ server: 'running', whatsapp: getConnectionStatus() });
});

router.get('/qr', (req, res) => {
  const { connected, hasQR, qrImage } = getConnectionStatus();
  res.json({ connected, hasQR, qrImage });
});

module.exports = router;
