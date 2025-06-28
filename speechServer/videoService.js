import axios from 'axios';
import tts from 'google-tts-api';
import { createCanvas, loadImage } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import translate from '@iamtraction/google-translate';
import { 
  getAudioBuffer,
  getAudioDuration,
  splitTextIntoSentences,
  makeSubtitleImage,
  calculateDurations
} from './utils.js';

ffmpeg.setFfmpegPath(ffmpegPath.path);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const tempDir = tmpdir();

export async function generateVideo(texto, imageUrl, idioma = 'es') {
  // Primero traducir el texto al idioma objetivo si es diferente del original
  let translatedText = texto;
  if (idioma !== 'es') {
    try {
      const result = await translate(texto, { to: idioma });
      translatedText = result.text;
    } catch (error) {
      console.error('Error al traducir el texto:', error);
    }
  }

  // Audio
  const audioBuf = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(tempDir, `audio-${Date.now()+"rand"+(Math.floor(Math.random() * 3000) + 1)}.mp3`); 
  await writeFile(audioPath, audioBuf);

  // Obtener duración total del audio
  const totalDuration = await getAudioDuration(audioPath);

  // Dividir texto en frases (usamos el texto traducido para los subtítulos)
  const sentences = splitTextIntoSentences(translatedText);
  
  // Calcular duraciones proporcionales
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  // Imágenes de subtítulos
  const imageFiles = [];
  for (let i = 0; i < sentences.length; i++) {
    const imgPath = path.join(tempDir, `sub_${i}_${Date.now()}.png`);
    await makeSubtitleImage(imageUrl, sentences[i], imgPath, i);
    imageFiles.push({ path: imgPath, dur: sentenceDurations[i] });
  }

  // Concat list
  const concatPath = path.join(tempDir, `concat-${Date.now()}.txt`);
  let concatTxt = imageFiles.map(f => `file '${f.path}'\nduration ${f.dur.toFixed(3)}`).join('\n');
  // Repetimos la última línea sin duration para FFmpeg
  concatTxt += `\nfile '${imageFiles[imageFiles.length-1].path}'\n`;
  await writeFile(concatPath, concatTxt);

  // Thumbnail video (sin audio)
  const silentVid = path.join(tempDir, `vid-noaudio-${Date.now()}.mp4`);
  await new Promise((res, rej) => {
    ffmpeg()
      .input(concatPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-vf fps=25'])
      .save(silentVid)
      .on('end', res)
      .on('error', rej);
  });

  // Mezclar audio y vídeo
  const finalVid = path.join(tempDir, `final-${Date.now()}.mp4`);
  await new Promise((res, rej) => {
    ffmpeg()
      .input(silentVid)
      .input(audioPath)
      .outputOptions(['-c:v copy', '-c:a aac', '-shortest'])
      .save(finalVid)
      .on('end', res)
      .on('error', rej);
  });

  // Convertir a base64
  const vidBuf = await readFile(finalVid);
  const b64 = vidBuf.toString('base64');

  // Limpieza
  const toRemove = [audioPath, concatPath, silentVid, finalVid, ...imageFiles.map(f => f.path)];
  await Promise.all(toRemove.map(p => unlink(p).catch(() => {})));

  return b64;
}

export async function generateVideoFromJSON(heritageData, targetLanguage = 'en', length) {
  const originalText = heritageData.description.local[length];
  
  const maxLength = 130000;
  const truncatedText = originalText.length > maxLength 
    ? originalText.substring(0, maxLength) + '...' 
    : originalText;

  let audioText = truncatedText;
  let subtitleText = truncatedText;

  if (targetLanguage !== 'local') {
    try {
      const translation = await translate(truncatedText, { to: targetLanguage });
      audioText = translation.text;
    } catch (error) {
      console.error("Error traduciendo:", error);
    }
  }

  return await generateVideo(
    audioText,
    heritageData.image,
    targetLanguage === 'local' ? 'es' : targetLanguage,
    subtitleText
  );
}