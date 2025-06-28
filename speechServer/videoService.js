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
  calculateDurations
} from './utils.js';

ffmpeg.setFfmpegPath(ffmpegPath.path);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Create OcityTemp directory if it doesn't exist
const tempDir = path.join(tmpdir(), 'OcityTemp');
try {
  await mkdir(tempDir, { recursive: true });
} catch (error) {
  if (error.code !== 'EEXIST') {
    console.error('Error creating temp directory:', error);
    throw error;
  }
}

async function isGif(url) {
  const response = await axios.head(url);
  return response.headers['content-type'] === 'image/gif';
}

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({ url, method: 'GET', responseType: 'stream' });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

export async function generateVideo(texto, imageUrl, idioma = 'es') {
  let translatedText = texto;
  if (idioma !== 'es') {
    try {
      const result = await translate(texto, { to: idioma });
      translatedText = result.text;
    } catch (error) {
      console.error('Error al traducir el texto:', error);
    }
  }

  const audioBuf = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`);
  await writeFile(audioPath, audioBuf);
  const totalDuration = await getAudioDuration(audioPath);
  const sentences = splitTextIntoSentences(translatedText);
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  const isGifFormat = await isGif(imageUrl);
  const downloadedPath = path.join(tempDir, `input-${Date.now()}${isGifFormat ? '.gif' : '.png'}`);
  await downloadFile(imageUrl, downloadedPath);

  const videoParts = [];

  for (let i = 0; i < sentences.length; i++) {
    const outputVid = path.join(tempDir, `clip_${i}_${Date.now()}.mp4`);
    const duration = sentenceDurations[i];

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(downloadedPath)
        .inputOptions(isGifFormat ? [] : ['-loop 1'])
        .duration(duration)
        .videoFilters([
          `fps=30`,
          `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${sentences[i].replace(/:/g, '\\:').replace(/'/g, "\\'")}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=h-(text_h*2)`
        ])
        .outputOptions([
          '-pix_fmt yuv420p',
          '-r 30',
          '-c:v libx264',
        ])
        .save(outputVid)
        .on('end', resolve)
        .on('error', reject);
    });

    videoParts.push({ path: outputVid, dur: duration });
  }

  const concatPath = path.join(tempDir, `concat-${Date.now()}.txt`);
  let concatTxt = videoParts.map(f => `file '${f.path}'`).join('\n');
  await writeFile(concatPath, concatTxt);

  const silentVid = path.join(tempDir, `vid-noaudio-${Date.now()}.mp4`);
  await new Promise((res, rej) => {
    ffmpeg()
      .input(concatPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .save(silentVid)
      .on('end', res)
      .on('error', rej);
  });

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

  const vidBuf = await readFile(finalVid);
  const b64 = vidBuf.toString('base64');

  const toRemove = [audioPath, concatPath, silentVid, finalVid, downloadedPath, ...videoParts.map(f => f.path)];
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
