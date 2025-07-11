
const express = require("express");
const path = require("path");
const app = express();
const sessionRoutes = require("./session");

const PORT = process.env.PORT || 3000;

// Serve static HTML files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Mount session generator route
app.use("/", sessionRoutes);

// Fallback to index.html for root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle /qr and /pair routes
app.get("/qr", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "qr.html"));
});

app.get("/pair", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pair.html"));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
