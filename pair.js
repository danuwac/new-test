const express = require("express");
const fs = require("fs");
const pino = require("pino");
const qrcode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

const router = express.Router();

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  const method = req.query.method || "pair";
  const sessionID = Date.now().toString();
  const sessionPath = `./session/${sessionID}`;

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "fatal" }),
    browser: ['Chrome (Linux)', '', ''],
  });

  sock.ev.on("creds.update", saveCreds);

  if (method === "pair") {
    try {
      let jid = await sock.requestPairingCode("94712345678@s.whatsapp.net"); // Replace with dynamic number if needed
      res.json({
        type: "pair",
        pairing_code: jid?.replace("@s.whatsapp.net", ""),
        session_id: sessionID,
      });
    } catch (err) {
      console.log("Pair error:", err);
      res.status(500).json({ error: "Failed to generate pair code." });
    }
  } else if (method === "qr") {
    let timeout;
    sock.ev.on("connection.update", async (update) => {
      const { qr, connection } = update;

      if (qr) {
        // Return QR as data URL
        const qrImage = await qrcode.toDataURL(qr);
        clearTimeout(timeout);
        res.json({
          type: "qr",
          qr_data_url: qrImage,
          session_id: sessionID,
        });
      }

      if (connection === "open") {
        console.log("✅ QR session connected!");
      }

      if (connection === "close") {
        console.log("❌ QR session closed.");
        clearTimeout(timeout);
      }
    });

    // Cleanup if QR not scanned in 90 seconds
    timeout = setTimeout(() => {
      removeFile(sessionPath);
      res.status(408).json({ error: "QR code expired." });
    }, 90000);
  } else {
    res.status(400).json({ error: "Invalid method" });
  }
});

module.exports = router;
