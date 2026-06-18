const cron = require('node-cron');
const ScheduleMessage = require('../models/ScheduleMessage');
const { sendMessage, getConnectionStatus } = require('./whatsappClient');
const { WHATSAPP_CHAT_ID } = require('../config/config');

const CHAT_ID = WHATSAPP_CHAT_ID;

const processPending = async () => {
  try {
    const { connected } = getConnectionStatus();
    if (!connected) return; // silently skip — client not ready

    const chatId = WHATSAPP_CHAT_ID;
    if (!chatId) {
      console.error(
        '❌ WHATSAPP_CHAT_ID is not configured — messages will not be sent.\n' +
        '   Set it in backend/config/config.js (e.g. 94729216039@c.us).'
      );
      return;
    }

    const now = new Date();
    const pending = await ScheduleMessage.find({
      isSent: false,
      scheduledTime: { $lte: now },
    }).limit(50);

    if (!pending.length) return;
    console.log(`📨 Sending ${pending.length} scheduled message(s)…`);

    for (const doc of pending) {
      try {
        await sendMessage(chatId, doc.message);
        doc.isSent = true;
        doc.sentAt = new Date();
        doc.error = null;
        await doc.save();
        console.log(`   ✅ Sent [${doc._id}] to ${chatId}`);
      } catch (err) {
        doc.error = err.message;
        await doc.save();
        console.error(`   ❌ Failed [${doc._id}]:`, err.message);
      }
    }
  } catch (err) {
    console.error('Scheduler tick error:', err.message);
  }
};

const startSchedulerWorker = () => {
  // Run every minute
  cron.schedule('* * * * *', processPending);
  console.log('⏰ Scheduler worker started — running every minute');

  // Also run once on boot in case a message is overdue
  setTimeout(processPending, 5000);
};

module.exports = { startSchedulerWorker, processPending };
