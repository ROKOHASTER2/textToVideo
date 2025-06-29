import axios from "axios";
import tts from "google-tts-api";
import { createCanvas, loadImage } from "canvas";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import translate from "@iamtraction/google-translate";
import {
  getAudioBuffer,
  getAudioDuration,
  splitTextIntoSentences,
  calculateDurations,
} from "./utils.js";

ffmpeg.setFfmpegPath(ffmpegPath.path);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Create OcityTemp directory if it doesn't exist
const tempDir = path.join(tmpdir(), "OcityTemp");
try {
  await mkdir(tempDir, { recursive: true });
} catch (error) {
  if (error.code !== "EEXIST") {
    console.error("Error creating temp directory:", error);
    throw error;
  }
}

// PNG Tuber URLs
const pngTubers = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];

async function isGif(url) {
  try {
    const response = await axios.head(url);
    return response.headers["content-type"] === "image/gif";
  } catch (error) {
    console.error("Error checking if URL is GIF:", error);
    return false;
  }
}

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({ url, method: "GET", responseType: "stream" });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function isAnimatedGif(filePath) {
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
    console.error("Error al verificar GIF animado:", error);
    return false;
  }
}

function wrapText(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + " " + word;
    const metrics = context.measureText(testLine);

    if (metrics.width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines.join("\n");
}

export async function generateVideo(texto, imageUrl, idioma = "es") {
  // Traducción del texto
  let translatedText = texto;
  try {
    const result = await translate(texto, { to: idioma });
    translatedText = result.text;
  } catch (error) {
    console.error("Error al traducir el texto:", error);
  }

  // Crear archivo de audio
  const audioBuf = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(
    tempDir,
    `audio-${Date.now()}-rand${Math.floor(Math.random() * 3000) + 1}.mp3`
  );
  await writeFile(audioPath, audioBuf);
  const totalDuration = await getAudioDuration(audioPath);

  // Dividir texto en frases
  const sentences = splitTextIntoSentences(translatedText);
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  // Descargar el recurso gráfico
  const isGifFormat = await isGif(imageUrl);
  const downloadedPath = path.join(
    tempDir,
    `input-${Date.now()}${isGifFormat ? ".gif" : ".png"}`
  );
  await downloadFile(imageUrl, downloadedPath);

  // Verificar si es GIF animado
  let isAnimated = false;
  if (isGifFormat) {
    isAnimated = await isAnimatedGif(downloadedPath);
  }

  // Descargar PNG tubers
  const tuberPaths = [];
  for (let i = 0; i < pngTubers.length; i++) {
    const tuberPath = path.join(tempDir, `tuber_${i}_${Date.now()}.png`);
    try {
      await downloadFile(pngTubers[i], tuberPath);
      tuberPaths.push(tuberPath);
    } catch (error) {
      console.error(`Error downloading tuber ${pngTubers[i]}:`, error);
    }
  }

  // Preparamos el canvas para medir texto
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");
  ctx.font = "36px Arial"; // Misma fuente que usaremos en FFmpeg

  let videoParts = [];

  for (let i = 0; i < sentences.length; i++) {
    const outputVid = path.join(tempDir, `clip_${i}_${Date.now()}.mp4`);
    const duration = sentenceDurations[i];
    const tuberIndex = i % tuberPaths.length;
    const tuberPath = tuberPaths[tuberIndex];

    // Dividimos el texto en múltiples líneas
    const maxTextWidth = 700; // Ancho máximo para subtítulos
    const wrappedText = wrapText(ctx, sentences[i], maxTextWidth);
    const escapedText = wrappedText.replace(/:/g, "\\:").replace(/'/g, "\\'");

    // Calcular número de líneas para ajustar la posición
    const lineCount = wrappedText.split("\n").length;
    const lineHeight = 50; // Altura aproximada por línea (36px font + 14px spacing)

    await new Promise((resolve, reject) => {
      const ff = ffmpeg().input(downloadedPath).input(tuberPath);

      // Definir los filtros como un array de objetos
      const filters = [];

      // Procesar imagen principal (agregar loop si es estática)
      let mainInput = "0:v";
      if (!isAnimated) {
        filters.push({
          filter: "loop",
          options: "loop=-1:size=1",
          inputs: mainInput,
          outputs: "looped_main",
        });
        mainInput = "looped_main";
      }

      // Escalar tuber
      filters.push({
        filter: "scale",
        options: "300:-1",
        inputs: "1:v",
        outputs: "tuber",
      });

      // Escalar imagen principal
      filters.push({
        filter: "scale",
        options: "800:600",
        inputs: mainInput,
        outputs: "scaled",
      });

      // Overlay (ajustar posición del tuber)
      filters.push({
        filter: "overlay",
        options: {
          x: 500,
          y: 200, // Mover tuber hacia arriba para dar espacio a subtítulos
        },
        inputs: ["scaled", "tuber"],
        outputs: "with_tuber",
      });

      // Añadir el texto en la parte inferior
      filters.push({
        filter: "drawtext",
        options: {
          fontfile: "C\\:/Windows/Fonts/arial.ttf",
          text: escapedText,
          fontcolor: "white",
          fontsize: 36,
          box: 1,
          boxcolor: "black@0.5",
          boxborderw: 10,
          x: "(w-text_w)/2",
          y: "h - text_h - 20", // Posición fija en la parte inferior
          line_spacing: 15,
        },
        inputs: "with_tuber",
        outputs: "out",
      });

      // Aplicar los filtros
      ff.complexFilter(filters)
        .outputOptions([
          "-map [out]",
          "-pix_fmt yuv420p",
          "-r 30",
          "-c:v libx264",
        ])
        .duration(duration)
        .on("error", (err, stdout, stderr) => {
          console.error("Error en FFmpeg:", err);
          console.error("Salida FFmpeg:", stdout);
          console.error("Error FFmpeg:", stderr);
          reject(err);
        })
        .on("end", resolve)
        .save(outputVid);
    });

    videoParts.push({ path: outputVid, dur: duration });
  }

  // Crear lista de concatenación
  const concatPath = path.join(tempDir, `concat-${Date.now()}.txt`);
  const concatTxt = videoParts.map((f) => `file '${f.path}'`).join("\n");
  await writeFile(concatPath, concatTxt);

  // Crear video silencioso
  const silentVid = path.join(tempDir, `vid-noaudio-${Date.now()}.mp4`);
  await new Promise((res, rej) => {
    ffmpeg()
      .input(concatPath)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .save(silentVid)
      .on("end", res)
      .on("error", rej);
  });

  // Combinar con audio
  const finalVid = path.join(tempDir, `final-${Date.now()}.mp4`);
  await new Promise((res, rej) => {
    ffmpeg()
      .input(silentVid)
      .input(audioPath)
      .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
      .save(finalVid)
      .on("end", res)
      .on("error", rej);
  });

  // Convertir a base64 y limpieza
  const vidBuf = await readFile(finalVid);
  const b64 = vidBuf.toString("base64");

  const toRemove = [
    audioPath,
    concatPath,
    silentVid,
    finalVid,
    downloadedPath,
    ...videoParts.map((f) => f.path),
    ...tuberPaths,
  ];

  await Promise.all(
    toRemove.map((p) =>
      unlink(p).catch((e) => console.error(`Error deleting ${p}:`, e))
    )
  );

  return b64;
}

export async function generateVideoFromJSON(
  heritageData,
  targetLanguage = "en",
  length
) {
  const originalText = heritageData.description.local[length];

  const maxLength = 130000;
  const truncatedText =
    originalText.length > maxLength
      ? originalText.substring(0, maxLength) + "..."
      : originalText;

  let audioText = truncatedText;
  let subtitleText = truncatedText;

  if (targetLanguage !== "local") {
    try {
      const translation = await translate(truncatedText, {
        to: targetLanguage,
      });
      audioText = translation.text;
    } catch (error) {
      console.error("Error traduciendo:", error);
    }
  }

  return await generateVideo(
    audioText,
    heritageData.image,
    targetLanguage === "local" ? "es" : targetLanguage
  );
}
