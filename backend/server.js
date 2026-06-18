const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const { PORT, WHATSAPP_CHAT_ID } = require('./config/config');
const scheduleRoutes = require('./routes/scheduleRoutes');
const statusRoutes = require('./routes/statusRoutes');
const { initWhatsAppClient } = require('./services/whatsappClient');
const { startSchedulerWorker } = require('./services/schedulerWorker');

const app = express();

app.use(cors());
app.use(express.json());

if (!WHATSAPP_CHAT_ID) {
  console.warn('⚠️  WHATSAPP_CHAT_ID is not configured — scheduled messages will not send.');
  console.warn('   Edit backend/config/config.js and set WHATSAPP_CHAT_ID (e.g. 94729216039@c.us)');
} else {
  console.log(`📨 Scheduled messages will be sent to: ${WHATSAPP_CHAT_ID}`);
}

app.use('/api/schedule', scheduleRoutes);
app.use('/api', statusRoutes);

app.get('/', (req, res) => {
  res.json({ service: 'whatsapp-scheduler-backend', status: 'ok' });
});

const bootstrap = async () => {
  try {
    await connectDB();
    initWhatsAppClient();
    startSchedulerWorker();
    app.listen(PORT, () => {
      console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

bootstrap();
