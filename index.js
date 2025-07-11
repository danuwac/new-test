const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;

// Route for session generation
const codeRoute = require("./pair");

require("events").EventEmitter.defaultMaxListeners = 500;

// Serve static files like HTML
app.use(express.static(path.join(__dirname)));

// Body parser setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use pair.js as session generator
app.use("/code", codeRoute);

// HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pair.html"));
});

app.get("/qr", (req, res) => {
  res.sendFile(path.join(__dirname, "qr.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});

module.exports = app;
