import tts from "google-tts-api";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { ensureTempDir, tempDir, writeFile } from "./utils.js";
import { translateText } from "./subtitulos.js";
import { promisify } from "util";
import fs from "fs";

// Configurar ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath.path);

const writeFileAsync = promisify(fs.writeFile);

export async function getAudioBuffer(texto, idioma = "es") {
  await ensureTempDir();

  // Traducir texto si es necesario
  const translatedText = await translateText(texto, idioma);

  // Dividir el texto en fragmentos manejables
  const textChunks = [];
  let currentChunk = "";

  const sentences = translatedText.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length < 200) {
      currentChunk += (currentChunk ? " " : "") + sentence;
    } else {
      if (currentChunk) textChunks.push(currentChunk);
      currentChunk = sentence;
    }
  }

  if (currentChunk) textChunks.push(currentChunk);

  // Procesar fragmentos largos
  const finalChunks = [];
  for (const chunk of textChunks) {
    if (chunk.length < 200) {
      finalChunks.push(chunk);
    } else {
      const words = chunk.split(" ");
      let tempChunk = "";
      for (const word of words) {
        if (tempChunk.length + word.length < 200) {
          tempChunk += (tempChunk ? " " : "") + word;
        } else {
          if (tempChunk) finalChunks.push(tempChunk);
          tempChunk = word;
        }
      }
      if (tempChunk) finalChunks.push(tempChunk);
    }
  }

  // Generar audio para cada fragmento
  let audioUrls;
  try {
    audioUrls = await Promise.all(
      finalChunks.map((chunk) =>
        tts.getAudioUrl(chunk, { lang: idioma, slow: false })
      )
    );
  } catch (error) {
    console.error(
      "[getAudioBuffer] Error al generar URLs de audio:",
      error.message
    );
    return Buffer.from([]); // Buffer vacío si falla
  }

  // Descargar y combinar los buffers de audio
  const audioBuffers = await Promise.all(
    audioUrls.map(async (url, index) => {
      try {
        const res = await axios.get(url, { responseType: "arraybuffer" });
        return Buffer.from(res.data);
      } catch (error) {
        console.log("error en audiobuffers");
        return Buffer.from([]);
      }
    })
  );

  return Buffer.concat(audioBuffers);
}

export async function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata.format?.duration) {
        console.error(
          "Error al obtener duración del audio:",
          err?.message || err
        );
        resolve(5); // Valor por defecto si hay error
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}
