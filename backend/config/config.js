// Hardcoded configuration — values are read from .env if present,
// otherwise the defaults below are used. This lets the app run even
// when no .env file is provided (e.g. on a serverless deploy).
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT:            process.env.PORT            || 5000,
  MONGODB_URI:     process.env.MONGODB_URI     || 'mongodb+srv://skin:skin@cluster0.z9fu7ey.mongodb.net/loughskin-email-test-whatsapp',
  WHATSAPP_CHAT_ID:process.env.WHATSAPP_CHAT_ID|| '94729216039@c.us',
};
