const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = "https://v3.football.api-sports.io";

// Cloud Function para obtener fixture con resultados reales
// Responde en: https://region-project.cloudfunctions.net/getFixture
exports.getFixture = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { league = 1, season = 2026 } = req.query;

    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
      return res.status(400).json({
        error: "API_KEY no configurada en variables de entorno",
        message: "Configura VITE_API_FOOTBALL_KEY en el Firebase Console",
      });
    }

    const response = await axios.get(`${BASE_URL}/fixtures`, {
      params: { league, season },
      headers: { "x-apisports-key": API_KEY },
      timeout: 10000,
    });

    // Devuelve solo los datos necesarios
    res.json(response.data);
  } catch (error) {
    console.error("Error en getFixture:", error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || "Error al conectar con api-football",
    });
  }
});

// Cloud Function para obtener un partido específico
exports.getMatch = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { fixtureId } = req.query;

    if (!fixtureId) {
      return res.status(400).json({ error: "fixtureId requerido" });
    }

    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
      return res.status(400).json({
        error: "API_KEY no configurada",
      });
    }

    const response = await axios.get(`${BASE_URL}/fixtures`, {
      params: { id: fixtureId },
      headers: { "x-apisports-key": API_KEY },
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error en getMatch:", error.message);
    res.status(500).json({ error: error.message });
  }
});
