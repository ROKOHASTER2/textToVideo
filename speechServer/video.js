import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { createCanvas } from "canvas";
import path from "path";
import {
  downloadFile,
  isGif,
  isAnimatedGif,
  wrapText,
  tempDir,
  writeFile,
  ensureTempDir,
  readFile,
  unlink,
  validateImageFile,
  downloadAndValidateImage,
  escapeForDrawtext,
  pngTubers,
  DEFAULT_IMAGE_URL,
  splitTextIntoSentences,
  calculateDurations,
  translateText,
} from "./utils.js";
import { getAudioBuffer, getAudioDuration } from "./audio.js";

// Configura la ruta de FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * Función principal que genera un video con texto, imagen de fondo y audio
 * @param {string} texto - Texto a convertir en audio y subtítulos
 * @param {string} imageUrl - URL de la imagen de fondo (opcional)
 * @param {string} idioma - Código de idioma para el audio (default: "es")
 * @returns {Promise<string>} Video en formato base64
 */
export async function generateVideo(texto, imageUrl, idioma = "es") {
  // Asegura que exista el directorio temporal
  await ensureTempDir();

  // Usa imagen por defecto si no se proporciona una
  let finalImageUrl = imageUrl || DEFAULT_IMAGE_URL;

  // Descarga los avatares PNG (tubers)
  const tuberPaths = [];
  for (let i = 0; i < pngTubers.length; i++) {
    const tuberPath = path.join(tempDir, `tuber_${i}_${Date.now()}.png`);
    try {
      await downloadAndValidateImage(pngTubers[i], tuberPath);
      tuberPaths.push(tuberPath);
    } catch (error) {
      console.error(`Error descargando tuber ${pngTubers[i]}:`, error);
    }
  }

  // Verifica que se hayan descargado tubers válidos
  if (tuberPaths.length === 0) {
    throw new Error("No se pudieron descargar imágenes de tuber válidas");
  }

  // Crea el archivo de audio a partir del texto
  const audioBuf = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(
    tempDir,
    `audio-${Date.now()}-rand${Math.floor(Math.random() * 3000) + 1}.mp3`
  );
  await writeFile(audioPath, audioBuf);
  const totalDuration = await getAudioDuration(audioPath);

  // Maneja la descarga y procesamiento de la imagen principal
  let downloadedPath;
  let isGifFormat = false;
  let isAnimated = false;
  let attempts = 0;
  const maxAttempts = 2;

  // Intenta descargar la imagen con reintentos
  while (attempts < maxAttempts) {
    attempts++;
    try {
      isGifFormat = await isGif(finalImageUrl);
      downloadedPath = path.join(
        tempDir,
        `input-${Date.now()}${isGifFormat ? ".gif" : ".png"}`
      );

      await downloadAndValidateImage(finalImageUrl, downloadedPath);

      // Verifica si el GIF es animado
      if (isGifFormat) {
        isAnimated = await isAnimatedGif(downloadedPath);
      }
      break;
    } catch (error) {
      console.warn(
        `Intento ${attempts} fallido para imagen ${finalImageUrl}:`,
        error.message
      );
      // Si falla, usa la imagen por defecto
      if (attempts >= maxAttempts) {
        console.warn("Usando imagen por defecto");
        finalImageUrl = DEFAULT_IMAGE_URL;
        attempts = 0;
      }
    }
  }

  // Prepara el canvas para medir el texto
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");
  ctx.font = "36px Sans";

  let videoParts = [];
  // Divide el texto en oraciones para los subtítulos
  const sentences = splitTextIntoSentences(texto);
  // Calcula la duración de cada oración
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  // Procesa cada oración para crear segmentos de video
  for (let i = 0; i < sentences.length; i++) {
    const outputVid = path.join(tempDir, `clip_${i}_${Date.now()}.mp4`);
    const duration = sentenceDurations[i];
    // Selecciona un pngtuber alternado
    const tuberIndex = i % tuberPaths.length;
    const tuberPath = tuberPaths[tuberIndex];

    // Procesa el texto: traduce, ajusta y escapa para FFmpeg
    const translatedSentence = await translateText(sentences[i], idioma);
    const wrappedText = wrapText(ctx, translatedSentence, 700); // 700px de ancho máximo
    const escapedText = escapeForDrawtext(wrappedText);

    // Genera el segmento de video usando FFmpeg
    await new Promise((resolve, reject) => {
      const ff = isAnimated
        ? ffmpeg()
            .input(downloadedPath)
            .inputOptions(["-stream_loop -1", "-err_detect explode"])
        : ffmpeg().input(downloadedPath).inputOptions(["-err_detect explode"]);

      ff.input(tuberPath);
      const filters = [];

      // Procesa imagen principal
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

      // Escala el tuber
      filters.push({
        filter: "scale",
        options: "300:-1",
        inputs: "1:v",
        outputs: "tuber_scaled",
      });

      // Escala la imagen principal
      filters.push({
        filter: "scale",
        options: "800:600",
        inputs: mainInput,
        outputs: "main_scaled",
      });

      // Superpone el tuber
      filters.push({
        filter: "overlay",
        options: {
          x: 500,
          y: 200,
        },
        inputs: ["main_scaled", "tuber_scaled"],
        outputs: "with_tuber",
      });

      // Añade texto
      filters.push({
        filter: "drawtext",
        options: {
          font: "Dejavu Sans",
          text: escapedText,
          fontcolor: "white",
          fontsize: 36,
          box: 1,
          boxcolor: "black@0.5",
          boxborderw: 10,
          x: "(w-text_w)/2",
          y: "h - text_h - 20",
          line_spacing: 15,
        },
        inputs: "with_tuber",
      });

      // Aplica los filtros y guarda el segmento
      ff.complexFilter(filters)
        .outputOptions([
          "-map 0:v",
          "-pix_fmt yuv420p",
          "-r 30",
          "-c:v libx264",
        ])
        .duration(duration)
        .on("error", (err, stdout, stderr) => {
          console.error("Error FFmpeg:", err);
          console.error("FFmpeg stdout:", stdout);
          console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .on("end", resolve)
        .save(outputVid);
    });

    videoParts.push({ path: outputVid, dur: duration });
  }

  // Concatena todos los segmentos de video
  const concatPath = path.join(tempDir, `concat-${Date.now()}.txt`);
  const concatTxt = videoParts.map((f) => `file '${f.path}'`).join("\n");
  await writeFile(concatPath, concatTxt);

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

  // Combina el video con el audio
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

  // Convierte a base64 para la respuesta
  const vidBuf = await readFile(finalVid);
  const b64 = vidBuf.toString("base64");

  // Limpieza de archivos temporales
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
      unlink(p).catch((e) => console.error(`Error borrando ${p}:`, e))
    )
  );

  return b64;
}

/**
 * Genera video a partir de datos JSON de patrimonio cultural
 * @param {Object} heritageData - Datos del patrimonio cultural
 * @param {string} targetLanguage - Idioma objetivo ("en" o "local")
 * @param {string} length - Longitud del texto a usar ("short", "medium", etc.)
 * @returns {Promise<string>} Video en base64
 */
export async function generateVideoFromJSON(
  heritageData,
  targetLanguage = "en",
  length
) {
  // Determina el idioma a usar
  const langToUse = targetLanguage === "local" ? "es" : targetLanguage;

  // Obtiene el texto según la longitud solicitada
  const originalText = heritageData.description.local[length];

  // Limita la longitud del texto para evitar problemas
  const maxLength = 130000;
  const truncatedText =
    originalText.length > maxLength
      ? originalText.substring(0, maxLength) + "..."
      : originalText;

  // Procesa la URL de la imagen
  let imageToUse = heritageData.image || DEFAULT_IMAGE_URL;
  if (imageToUse.includes("?")) {
    imageToUse = imageToUse.split("?")[0];
  }

  // Genera el video final
  return await generateVideo(truncatedText, imageToUse, langToUse);
}

/**
 * Genera un video combinado a partir de múltiples elementos de patrimonio
 * @param {Array} heritageDataArray - Array de datos de patrimonio
 * @param {string} targetLanguage - Idioma objetivo
 * @param {string} length - Longitud del texto
 * @returns {Promise<string>} Video combinado en base64
 */
export async function generateMultiVideoFromJSON(
  heritageDataArray,
  targetLanguage = "en",
  length
) {
  const videoPaths = [];
  let concatPath;
  let finalPath;

  try {
    // Genera cada video individual
    for (let i = 0; i < heritageDataArray.length; i++) {
      const heritageData = heritageDataArray[i];
      const videoBase64 = await generateVideoFromJSON(
        heritageData,
        targetLanguage,
        length
      );

      // Guarda cada video en archivo temporal
      const videoBuffer = Buffer.from(videoBase64, "base64");
      const videoPath = path.join(tempDir, `part_${i}_${Date.now()}.mp4`);
      await writeFile(videoPath, videoBuffer);
      videoPaths.push(videoPath);
    }

    // Crea archivo de concatenación para FFmpeg
    concatPath = path.join(tempDir, `multi_concat_${Date.now()}.txt`);
    const concatContent = videoPaths.map((p) => `file '${p}'`).join("\n");
    await writeFile(concatPath, concatContent);

    // Combina todos los videos
    finalPath = path.join(tempDir, `final_multi_${Date.now()}.mp4`);
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .save(finalPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // Convierte a base64
    const finalBuffer = await readFile(finalPath);
    return finalBuffer.toString("base64");
  } finally {
    // Limpieza de archivos temporales
    const cleanUpFiles = [...videoPaths];
    if (concatPath) cleanUpFiles.push(concatPath);
    if (finalPath) cleanUpFiles.push(finalPath);

    await Promise.all(
      cleanUpFiles.map((file) =>
        unlink(file).catch((e) => console.error(`Error borrando ${file}:`, e))
      )
    );
  }
}
