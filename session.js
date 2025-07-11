
const express = require("express");
const fs = require("fs");
const pino = require("pino");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

const router = express.Router();

function cleanupSession(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log("🧹 Deleted expired session:", folderPath);
    }
}

router.get("/generate", async (req, res) => {
    const method = req.query.method || "pair"; // qr or pair
    const phone = req.query.number || "user";

    const sessionId = phone + "-" + Date.now();
    const sessionPath = path.join(__dirname, "sessions", sessionId);
    const qrPath = path.join(sessionPath, "qr.txt");

    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        version: await fetchLatestBaileysVersion(),
        auth: state,
        printQRInTerminal: method === "qr",
        browser: ["Danuwa Public", "Chrome", "1.0"],
        logger: pino({ level: "fatal" }),
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection } = update;

        if (connection === "open") {
            console.log("✅ Session connected:", sessionId);
        }

        if (connection === "close") {
            console.log("❌ Connection closed:", sessionId);
        }
    });

    if (method === "pair") {
        try {
            const code = await sock.requestPairingCode(phone);
            res.send({ session: sessionId, pairingCode: code });
        } catch (err) {
            res.status(500).send("Failed to generate pair code");
            cleanupSession(sessionPath);
        }
    } else if (method === "qr") {
        // Wait for QR event and return QR data
        let qrCode = null;
        sock.ev.on("connection.update", (update) => {
            if (update.qr) {
                qrCode = update.qr;
                fs.writeFileSync(qrPath, qrCode);
            }
        });

        // Wait max 5s for QR to be set
        setTimeout(() => {
            if (qrCode) {
                res.send({ session: sessionId, qr: qrCode });
            } else {
                res.status(500).send("Failed to generate QR");
                cleanupSession(sessionPath);
            }
        }, 3000);
    }

    // Cleanup session if not connected in 2 minutes
    setTimeout(() => {
        if (!sock.authState.creds?.me) {
            cleanupSession(sessionPath);
        }
    }, 120000);
});

module.exports = router;
