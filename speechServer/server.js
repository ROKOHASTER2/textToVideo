import express from "express";
import cors from "cors";
import { generateVideo, generateVideoFromJSON } from "./video.js";

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.post("/video", async (req, res) => {
  try {
    const { texto, idioma = "es", imageUrl } = req.body;
    if (!texto || !imageUrl) {
      return res.status(400).json({ error: 'Falta "texto" o "imageUrl".' });
    }

    const videoB64 = await generateVideo(texto, imageUrl, idioma);

    res.json({
      success: true,
      videoUrl: `data:video/mp4;base64,${videoB64}`,
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ success: false, error: "Error generando el vídeo." });
  }
});

app.post("/video-from-json", async (req, res) => {
  try {
    const { heritageData, targetLanguage = "en", targetLength } = req.body;

    if (!heritageData?.description?.local?.extended || !heritageData.image) {
      return res.status(400).json({ error: "Datos incompletos." });
    }

    const videoB64 = await generateVideoFromJSON(
      heritageData,
      targetLanguage,
      targetLength
    );

    res.json({
      success: true,
      videoUrl: `data:video/mp4;base64,${videoB64}`,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "Error generando el vídeo.",
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});
