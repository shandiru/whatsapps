const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { execSync } = require('child_process');
const { WHATSAPP_CHAT_ID } = require('../config/config');

let client = null;
let isReady = false;
let currentQR = null;        // raw QR string
let currentQRImage = null;   // base64 PNG dataURL for the web UI

// Kill any leftover Chrome instances from previous crashes.
// On Windows, a crashed client leaves zombie chrome.exe processes that hold
// onto the user-data-dir lock — the next launch then fails injection with
// "Execution context was destroyed, most likely because of a navigation."
const killStaleChromium = () => {
  if (process.platform !== 'win32') return;
  try {
    execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' });
    execSync('taskkill /F /IM chromium.exe /T', { stdio: 'ignore' });
  } catch {
    // ignore — taskkill exits non-zero if no processes matched
  }
};

const buildClient = () =>
  new Client({
    authStrategy: new LocalAuth({ clientId: 'whatsapp-scheduler' }),
    restartOnAuthFail: true,
    puppeteer: {
      headless: true,
      // NOTE: do NOT add --single-process or --no-zygote on Windows —
      // they cause "Navigating frame was detached" crashes.
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        // Helps avoid the mid-load redirect that destroys the JS context
        // before whatsapp-web.js can inject its API hook.
        '--disable-features=IsolateOrigins,site-per-process,TranslateUI',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--mute-audio',
      ],
    },
  });

const attachHandlers = (c) => {
  c.on('qr', async (qr) => {
    currentQR = qr;
    console.log('\n📱 Scan this QR code with your WhatsApp app:\n');
    qrcodeTerminal.generate(qr, { small: true });
    try {
      currentQRImage = await qrcode.toDataURL(qr);
    } catch (e) {
      currentQRImage = null;
    }
  });

  c.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated');
  });

  c.on('auth_failure', (msg) => {
    isReady = false;
    console.error('❌ Auth failure:', msg);
  });

  c.on('ready', () => {
    isReady = true;
    currentQR = null;
    currentQRImage = null;
    console.log('✅ WhatsApp client is READY — messages can be sent');

    // Pre-warm WhatsApp's LID-to-phone mapping for the configured chat.
    // Without this, the first sendMessage() after a fresh auth can throw
    // "No LID for user" because WhatsApp Web's toUserLidOrThrow() cannot
    // resolve the LID until the phone-number JID has been looked up at
    // least once. We log but do not crash — if it fails, sendMessage() will
    // retry through the fallback path.
    const chatId = WHATSAPP_CHAT_ID;
    if (chatId) {
      c.getNumberId(chatId)
        .then((resolved) => {
          if (resolved && resolved._serialized) {
            console.log(`🔎 LID mapping pre-warmed for ${chatId} → ${resolved._serialized}`);
          } else {
            console.warn(
              `⚠️  getNumberId(${chatId}) returned no mapping. ` +
                `First sendMessage() may briefly retry until WhatsApp syncs.`
            );
          }
        })
        .catch((err) => {
          console.warn(
            `⚠️  Pre-warming LID mapping failed for ${chatId}: ${err.message}`
          );
        });
    }
  });

  c.on('disconnected', (reason) => {
    isReady = false;
    currentQR = null;
    currentQRImage = null;
    console.log('\n⚠️  WhatsApp DISCONNECTED — reason:', reason);
    console.log('   Common causes:');
    console.log('   • You signed out from your phone (Linked Devices → remove)');
    console.log('   • Phone lost internet for >2 weeks');
    console.log('   • WhatsApp revoked the multi-device session');
    console.log('   → Fix: restart the backend, then re-scan the QR with your phone.\n');
  });

  c.on('change_state', (state) => {
    console.log(`🔄 WhatsApp state changed → ${state}`);
  });

  c.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading WhatsApp web: ${percent}% — ${message}`);
  });
};

const initWhatsAppClient = () => {
  killStaleChromium();
  client = buildClient();
  attachHandlers(client);

  // Retry the whole initialize() up to 3 times. The "Execution context
  // was destroyed" error means WhatsApp Web redirected mid-injection —
  // usually because the previous Chrome was still holding the user-data
  // lock. After killing it and waiting a beat, the next attempt succeeds.
  const tryInit = (attempt = 1) => {
    client
      .initialize()
      .catch(async (err) => {
        const msg = err && err.message ? err.message : String(err);
        const isContextError =
          msg.includes('Execution context was destroyed') ||
          msg.includes('Navigating frame was detached');

        console.error(
          `❌ WhatsApp client.initialize() failed (attempt ${attempt}/3): ${msg.split('\n')[0]}`
        );

        if (isContextError && attempt < 3) {
          console.log('   ↻ Killing stale Chromium and retrying in 3s…');
          try {
            await client.destroy();
          } catch {}
          killStaleChromium();
          await new Promise((r) => setTimeout(r, 3000));
          client = buildClient();
          attachHandlers(client);
          return tryInit(attempt + 1);
        }

        if (isContextError) {
          console.error(
            '   💥 Injection failed 3 times in a row. This usually means the\n' +
              '      cached session in .wwebjs_auth/ is stale. To recover:\n' +
              '        1. Stop the backend.\n' +
              '        2. Delete the .wwebjs_auth/ folder.\n' +
              '        3. Start the backend and re-scan the QR code.\n'
          );
        }
      });
  };

  tryInit();
};

const getConnectionStatus = () => ({
  connected: isReady,
  hasQR: !!currentQR,
  qrCode: currentQR,
  qrImage: currentQRImage,
});

const sendMessage = async (chatId, body) => {
  if (!isReady) {
    throw new Error('WhatsApp client is not ready');
  }
  if (!chatId) {
    throw new Error('WHATSAPP_CHAT_ID is not set');
  }

  // WhatsApp Web throws "No LID for user" when its internal LID-to-phone
  // mapping has not been populated for the recipient yet. The mapping is
  // built up over time as the account syncs; it can be empty right after
  // a fresh authentication. We resolve it explicitly via getNumberId /
  // getContact and retry once before giving up.
  const trySend = async () => client.sendMessage(chatId, body);

  try {
    return await trySend();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (!/No LID for user/i.test(msg)) throw err;

    console.warn(
      `⚠️  sendMessage hit "No LID for user" for ${chatId} — resolving contact and retrying once.`
    );

    try {
      // getNumberId populates the LID mapping when WhatsApp knows the number.
      await client.getNumberId(chatId);
    } catch (e1) {
      // Fallback: getContact forces contact-store hydration for this JID.
      try {
        await client.getContact(chatId);
      } catch (e2) {
        throw new Error(
          `LID resolution failed for ${chatId}: ${e1.message || e1}; ${e2.message || e2}`
        );
      }
    }

    // Brief wait so the resolved mapping propagates to the chat store.
    await new Promise((r) => setTimeout(r, 1500));
    return await trySend();
  }
};

module.exports = {
  initWhatsAppClient,
  getConnectionStatus,
  sendMessage,
};
