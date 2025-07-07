import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import translate from "@iamtraction/google-translate";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export const tempDir = path.join(tmpdir(), "OcityTemp");
// PNG Tuber URLs
export const pngTubers = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];

// Default image URL
export const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";

// Text processing functions
export function splitTextIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function calculateDurations(sentences, totalDuration) {
  const totalChars = sentences.reduce(
    (sum, sentence) => sum + sentence.length,
    0
  );

  if (totalChars === 0) {
    const uniformDuration = totalDuration / sentences.length;
    return Array(sentences.length).fill(uniformDuration);
  }

  return sentences.map((sentence) => {
    const proportion = sentence.length / totalChars;
    return proportion * totalDuration;
  });
}

export async function translateText(texto, idioma = "es") {
  try {
    // Verificar que el idioma no sea undefined o null
    const targetLang = idioma || "es";

    // Forzar el idioma de destino en la llamada a translate
    const result = await translate(texto, {
      to: targetLang,
      from: "auto", // Asegurar que detecte el idioma de origen automáticamente
    });
    return result.text;
  } catch (error) {
    console.error("Error al traducir el texto:", error);
    return texto; // Devuelve el texto original si hay error
  }
}

export async function ensureTempDir() {
  try {
    await mkdir(tempDir, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error("Error creating temp directory:", error);
      throw error;
    }
  }
}

export async function isGif(url) {
  try {
    const response = await axios.head(url);
    return response.headers["content-type"] === "image/gif";
  } catch (error) {
    console.log("error en isGif");
    return false;
  }
}

export async function downloadFile(url, dest) {
  await ensureTempDir();
  const writer = fs.createWriteStream(dest);

  try {
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
  } catch (error) {
    console.log("error en downloadFile");
    return false;
  }
}

export async function isAnimatedGif(filePath) {
  try {
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    return metadata.streams.some(
      (stream) =>
        stream.codec_type === "video" &&
        (stream.codec_name === "gif" || stream.codec_name === "png") &&
        (stream.nb_frames > 1 ||
          (stream.duration && parseFloat(stream.duration) > 0))
    );
  } catch (error) {
    console.error("Error al verificar GIF animado:", error.message);
    return false;
  }
}

export function wrapText(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  // Reducir ligeramente el maxWidth para dar margen
  const adjustedMaxWidth = maxWidth * 0.95; // 5% menos de ancho

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + " " + word : word;
    const metrics = context.measureText(testLine);

    if (metrics.width < adjustedMaxWidth) {
      currentLine = testLine;
    } else {
      if (
        currentLine === "" &&
        context.measureText(word).width >= adjustedMaxWidth
      ) {
        let segmentedWord = "";
        for (let j = 0; j < word.length; j++) {
          const testChar = segmentedWord + word[j];
          if (context.measureText(testChar).width >= adjustedMaxWidth) {
            lines.push(segmentedWord);
            segmentedWord = word[j];
          } else {
            segmentedWord = testChar;
          }
        }
        lines.push(segmentedWord);
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

// SI CAMBIA ALGO DE ESTO la version en aleman o en frances EXPLOTAN
// (NO BORRAR)
export function escapeForDrawtext(text) {
  return text
    .replace(/\\/g, "\\\\") // Escapa backslashes
    .replace(/:/g, "\\:"); // Escapa dos puntos
}

export async function validateImageFile(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      throw new Error("Empty file");
    }
    return true;
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }
}

export async function downloadAndValidateImage(imageUrl, outputPath) {
  try {
    await downloadFile(imageUrl, outputPath);
    await validateImageFile(outputPath);
    return true;
  } catch (error) {
    await unlink(outputPath).catch(() => {});
    throw error;
  }
}

export { readFile, writeFile, unlink };
