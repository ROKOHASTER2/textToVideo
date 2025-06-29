import axios from "axios";
import tts from "google-tts-api";
import { createCanvas, loadImage } from "canvas";
import ffmpeg from "fluent-ffmpeg";
import translate from "@iamtraction/google-translate";
import { promisify } from "util";
import fs from "fs";

const readFile = promisify(fs.readFile);

// Lista de PNG tubers disponibles
const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];

export async function getAudioBuffer(texto, idioma = "es") {
  let translatedText = texto;
  if (idioma !== "es") {
    try {
      const result = await translate(texto, { to: idioma });
      translatedText = result.text;
    } catch (error) {
      console.error("Error al traducir el texto:", error);
    }
  }

  // Dividir el texto en fragmentos manejables para TTS
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
  const audioUrls = await Promise.all(
    finalChunks.map((chunk) =>
      tts.getAudioUrl(chunk, { lang: idioma, slow: false })
    )
  );

  // Descargar y combinar los buffers de audio
  const audioBuffers = await Promise.all(
    audioUrls.map((url) =>
      axios
        .get(url, { responseType: "arraybuffer" })
        .then((res) => Buffer.from(res.data))
    )
  );

  return Buffer.concat(audioBuffers);
}

export async function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata.format.duration) {
        console.error("Error al obtener duración del audio:", err);
        resolve(5); // Duración por defecto si hay error
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

export function splitTextIntoSentences(text) {
  // Dividir el texto en frases usando puntos como delimitadores
  const sentences = text
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : [text];
}

export async function makeSubtitleImage(
  backgroundUrl,
  subtitleText,
  outPath,
  frameIndex
) {
  const WIDTH = 800;
  const HEIGHT = 600;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  try {
    // Cargar imagen de fondo
    const img = await loadImage(backgroundUrl);
    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
  } catch (error) {
    console.error("Error al cargar imagen de fondo:", error);
    // Fondo por defecto si hay error
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Cargar PNG tuber (rotamos entre los disponibles)
  const tuberUrl = PNG_TUBERS[frameIndex % PNG_TUBERS.length];
  try {
    const tuberImg = await loadImage(tuberUrl);
    const tuberWidth = 300;
    const tuberHeight = (tuberImg.height / tuberImg.width) * tuberWidth;
    const tuberX = 500;
    const tuberY = 300;

    ctx.drawImage(tuberImg, tuberX, tuberY, tuberWidth, tuberHeight);
  } catch (error) {
    console.error("Error al cargar PNG tuber:", error);
  }

  // Configuración del texto
  const LINE_HEIGHT = 40;
  const PADDING = 20;
  const TEXT_WIDTH = WIDTH - 2 * PADDING;

  ctx.font = "30px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";

  // Dividir el texto en líneas que quepan en el ancho disponible
  const lines = [];
  let currentLine = "";

  for (const word of subtitleText.split(" ")) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > TEXT_WIDTH && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);

  // Calcular posición vertical del texto
  const totalTextHeight = lines.length * LINE_HEIGHT;
  const textStartY = HEIGHT - totalTextHeight - 60;

  // Dibujar fondo semitransparente para el texto
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(
    PADDING,
    textStartY - 20,
    WIDTH - 2 * PADDING,
    totalTextHeight + 40
  );

  // Dibujar cada línea de texto
  ctx.fillStyle = "#fff";
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, textStartY + i * LINE_HEIGHT);
  });

  // Guardar la imagen resultante
  const outStream = fs.createWriteStream(outPath);
  const pngStream = canvas.createPNGStream();
  pngStream.pipe(outStream);

  return new Promise((resolve) => {
    outStream.on("finish", resolve);
  });
}

export function calculateDurations(sentences, totalDuration) {
  // Calcular duración proporcional para cada frase basada en su longitud
  const totalChars = sentences.reduce(
    (sum, sentence) => sum + sentence.length,
    0
  );

  if (totalChars === 0) {
    // Si no hay texto, dividir el tiempo uniformemente
    const uniformDuration = totalDuration / sentences.length;
    return Array(sentences.length).fill(uniformDuration);
  }

  return sentences.map((sentence) => {
    const proportion = sentence.length / totalChars;
    return proportion * totalDuration;
  });
}

// Función adicional para descargar archivos
export async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Función para verificar si una URL es un GIF
export async function isGif(url) {
  try {
    const response = await axios.head(url);
    return response.headers["content-type"] === "image/gif";
  } catch (error) {
    console.error("Error al verificar si es GIF:", error);
    return false;
  }
}
