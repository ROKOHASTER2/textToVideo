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
} from "./utils.js";
import { getAudioBuffer, getAudioDuration } from "./audio.js";
import {
  splitTextIntoSentences,
  calculateDurations,
  translateText,
} from "./subtitulos.js";

ffmpeg.setFfmpegPath(ffmpegPath.path);

// PNG Tuber URLs
const pngTubers = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];

export async function generateVideo(texto, imageUrl, idioma = "es") {
  await ensureTempDir();

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

  // Crear archivo de audio
  const audioBuf = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(
    tempDir,
    `audio-${Date.now()}-rand${Math.floor(Math.random() * 3000) + 1}.mp3`
  );
  await writeFile(audioPath, audioBuf);
  const totalDuration = await getAudioDuration(audioPath);

  // Descargar el recurso gráfico principal
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

  // Preparamos el canvas para medir texto
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");
  ctx.font = "36px Arial";

  let videoParts = [];
  const sentences = splitTextIntoSentences(texto);
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  for (let i = 0; i < sentences.length; i++) {
    const outputVid = path.join(tempDir, `clip_${i}_${Date.now()}.mp4`);
    const duration = sentenceDurations[i];
    const tuberIndex = i % tuberPaths.length;
    const tuberPath = tuberPaths[tuberIndex];

    // Dividimos el texto en múltiples líneas
    const maxTextWidth = 700;
    const translatedSentence = await translateText(sentences[i], idioma);
    const wrappedText = wrapText(ctx, translatedSentence, maxTextWidth);
    const escapedText = wrappedText.replace(/:/g, "\\:").replace(/'/g, "\\'");

    await new Promise((resolve, reject) => {
      const ff = isAnimated
        ? ffmpeg().input(downloadedPath).inputOptions("-stream_loop -1")
        : ffmpeg().input(downloadedPath);

      ff.input(tuberPath);
      const filters = [];

      // Procesar imagen principal
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

      // Overlay
      filters.push({
        filter: "overlay",
        options: {
          x: 500,
          y: 200,
        },
        inputs: ["scaled", "tuber"],
        outputs: "with_tuber",
      });

      // Añadir texto
      filters.push({
        filter: "drawtext",
        options: {
          font: "DejaVu Sans",
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
        outputs: "out",
      });

      // Aplicar filtros
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
  // Verificar el idioma objetivo
  const langToUse = targetLanguage === "local" ? "es" : targetLanguage;

  const originalText = heritageData.description.local[length];

  const maxLength = 130000;
  const truncatedText =
    originalText.length > maxLength
      ? originalText.substring(0, maxLength) + "..."
      : originalText;

  return await generateVideo(truncatedText, heritageData.image, langToUse);
}
