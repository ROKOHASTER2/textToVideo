import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { createCanvas } from "canvas";
import path from "path";
import fs from "fs/promises";
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

// Default image URL
const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";

async function validateImageFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error("Empty file");
    }
    return true;
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }
}

async function downloadAndValidateImage(imageUrl, outputPath) {
  try {
    await downloadFile(imageUrl, outputPath);
    await validateImageFile(outputPath);
    return true;
  } catch (error) {
    await unlink(outputPath).catch(() => {});
    throw error;
  }
}

export async function generateVideo(texto, imageUrl, idioma = "es") {
  await ensureTempDir();

  // Use default image if none provided
  let finalImageUrl = imageUrl || DEFAULT_IMAGE_URL;

  // Download PNG tubers
  const tuberPaths = [];
  for (let i = 0; i < pngTubers.length; i++) {
    const tuberPath = path.join(tempDir, `tuber_${i}_${Date.now()}.png`);
    try {
      await downloadAndValidateImage(pngTubers[i], tuberPath);
      tuberPaths.push(tuberPath);
    } catch (error) {
      console.error(`Error downloading tuber ${pngTubers[i]}:`, error);
      // Continue with available tubers
    }
  }

  if (tuberPaths.length === 0) {
    throw new Error("No valid tuber images could be downloaded");
  }

  // Create audio file
  const audioBuf = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(
    tempDir,
    `audio-${Date.now()}-rand${Math.floor(Math.random() * 3000) + 1}.mp3`
  );
  await writeFile(audioPath, audioBuf);
  const totalDuration = await getAudioDuration(audioPath);

  // Handle main image download and processing
  let downloadedPath;
  let isGifFormat = false;
  let isAnimated = false;
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      isGifFormat = await isGif(finalImageUrl);
      downloadedPath = path.join(
        tempDir,
        `input-${Date.now()}${isGifFormat ? ".gif" : ".png"}`
      );

      await downloadAndValidateImage(finalImageUrl, downloadedPath);

      if (isGifFormat) {
        isAnimated = await isAnimatedGif(downloadedPath);
      }
      break; // Success
    } catch (error) {
      console.warn(
        `Attempt ${attempts} failed for image ${finalImageUrl}:`,
        error.message
      );
      if (attempts >= maxAttempts) {
        console.warn("Falling back to default image");
        finalImageUrl = DEFAULT_IMAGE_URL;
        attempts = 0; // Reset attempts for default image
      }
    }
  }

  // Prepare canvas for text measurement
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext("2d");
  ctx.font = "36px Sans";

  let videoParts = [];
  const sentences = splitTextIntoSentences(texto);
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  // Process each sentence
  for (let i = 0; i < sentences.length; i++) {
    const outputVid = path.join(tempDir, `clip_${i}_${Date.now()}.mp4`);
    const duration = sentenceDurations[i];
    const tuberIndex = i % tuberPaths.length;
    const tuberPath = tuberPaths[tuberIndex];

    // Wrap text
    const maxTextWidth = 700;
    const translatedSentence = await translateText(sentences[i], idioma);
    const wrappedText = wrapText(ctx, translatedSentence, maxTextWidth);
    const escapedText = escapeForDrawtext(wrappedText);

    await new Promise((resolve, reject) => {
      const ff = isAnimated
        ? ffmpeg()
            .input(downloadedPath)
            .inputOptions(["-stream_loop -1", "-err_detect explode"])
        : ffmpeg().input(downloadedPath).inputOptions(["-err_detect explode"]);

      ff.input(tuberPath);
      const filters = [];

      // Process main image
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

      // Scale tuber
      filters.push({
        filter: "scale",
        options: "300:-1",
        inputs: "1:v",
        outputs: "tuber_scaled",
      });

      // Scale main image
      filters.push({
        filter: "scale",
        options: "800:600",
        inputs: mainInput,
        outputs: "main_scaled",
      });

      // Tuber overlay
      filters.push({
        filter: "overlay",
        options: {
          x: 500,
          y: 200,
        },
        inputs: ["main_scaled", "tuber_scaled"],
        outputs: "with_tuber",
      });

      // Add text
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

      // Apply filters
      ff.complexFilter(filters)
        .outputOptions([
          "-map 0:v",
          "-pix_fmt yuv420p",
          "-r 30",
          "-c:v libx264",
        ])
        .duration(duration)
        .on("error", (err, stdout, stderr) => {
          console.error("FFmpeg error:", err);
          console.error("FFmpeg stdout:", stdout);
          console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .on("end", resolve)
        .save(outputVid);
    });

    videoParts.push({ path: outputVid, dur: duration });
  }

  // Concatenate videos
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

  // Combine with audio
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

  // Convert to base64
  const vidBuf = await readFile(finalVid);
  const b64 = vidBuf.toString("base64");

  // Cleanup
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
  // Verify target language
  const langToUse = targetLanguage === "local" ? "es" : targetLanguage;

  const originalText = heritageData.description.local[length];

  const maxLength = 130000;
  const truncatedText =
    originalText.length > maxLength
      ? originalText.substring(0, maxLength) + "..."
      : originalText;

  // Clean image URL if needed
  let imageToUse = heritageData.image || DEFAULT_IMAGE_URL;
  if (imageToUse.includes("?")) {
    imageToUse = imageToUse.split("?")[0];
  }

  return await generateVideo(truncatedText, imageToUse, langToUse);
}

// SI CAMBIA ALGO DE ESTO la version en aleman o en frances EXPLOTAN
// (NO BORRAR)
function escapeForDrawtext(text) {
  return text
    .replace(/\\/g, "\\\\") // Escapa backslashes
    .replace(/:/g, "\\:"); // Escapa dos puntos
}

export async function generateMultiVideoFromJSON(
  heritageDataArray,
  targetLanguage = "en",
  length
) {
  const videoPaths = [];
  let concatPath;
  let finalPath;

  try {
    // Generate each video
    for (let i = 0; i < heritageDataArray.length; i++) {
      const heritageData = heritageDataArray[i];
      const videoBase64 = await generateVideoFromJSON(
        heritageData,
        targetLanguage,
        length
      );

      const videoBuffer = Buffer.from(videoBase64, "base64");
      const videoPath = path.join(tempDir, `part_${i}_${Date.now()}.mp4`);
      await writeFile(videoPath, videoBuffer);
      videoPaths.push(videoPath);
    }

    // Create concat file
    concatPath = path.join(tempDir, `multi_concat_${Date.now()}.txt`);
    const concatContent = videoPaths.map((p) => `file '${p}'`).join("\n");
    await writeFile(concatPath, concatContent);

    // Concatenate videos
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

    // Read final video
    const finalBuffer = await readFile(finalPath);
    return finalBuffer.toString("base64");
  } finally {
    // Cleanup
    const cleanUpFiles = [...videoPaths];
    if (concatPath) cleanUpFiles.push(concatPath);
    if (finalPath) cleanUpFiles.push(finalPath);

    await Promise.all(
      cleanUpFiles.map((file) =>
        unlink(file).catch((e) => console.error(`Error deleting ${file}:`, e))
      )
    );
  }
}
