const express = require("express");
const Parser = require("rss-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const parser = new Parser();

// Autoriser ton site à utiliser l'API
app.use(cors());

// Servir ton site statique
app.use(express.static(path.join(__dirname, "public")));

// Endpoint pour récupérer les flux RSS
app.get("/api/rss", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url param" });

  try {
    const feed = await parser.parseURL(url);
    res.json(feed);
  } catch (err) {
    console.error("RSS fetch error:", err);
    res.status(500).json({ error: "Unable to fetch RSS" });
  }
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur en ligne sur http://localhost:${PORT}`);
});