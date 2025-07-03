import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { promisify } from "util";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export const tempDir = path.join(tmpdir(), "OcityTemp");

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

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + " " + word : word;
    const metrics = context.measureText(testLine);

    if (metrics.width < maxWidth) {
      currentLine = testLine;
    } else {
      // Manejar palabra muy larga
      if (currentLine === "" && context.measureText(word).width >= maxWidth) {
        // Dividir palabra en caracteres
        let segmentedWord = "";
        for (let j = 0; j < word.length; j++) {
          const testChar = segmentedWord + word[j];
          if (context.measureText(testChar).width >= maxWidth) {
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

export { readFile, writeFile, unlink };
