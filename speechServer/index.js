import express from 'express';
import axios from 'axios';
import tts from 'google-tts-api';
import { createCanvas, loadImage } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import cors from 'cors'; /// Esto sirve para hacer pruebas con react vita

ffmpeg.setFfmpegPath(ffmpegPath.path);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const app = express();
const port = 3000;
/// Esto sirve para hacer pruebas con react vita
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
///
app.use(express.json());

const tempDir = tmpdir();

// 1. Obtener audio como buffer
async function getAudioBuffer(texto, idioma = 'es') {
  const url = await tts.getAudioUrl(texto, { lang: idioma, slow: false });
  const resp = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
}

// 2. Duración del audio
async function getAudioDuration(filePath) {
  return new Promise((res) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err || !meta.format.duration) return res(5);
      res(meta.format.duration);
    });
  });
}

// 3. Dividir texto en frases (separadas por puntos)
function splitTextIntoSentences(text) {
  // Dividir por puntos pero mantener los puntos en el texto
  const sentences = text.split(/(?<=\.)/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences.length > 0 ? sentences : [text];
}

// 4. Generar una imagen con un sólo subtítulo encima del fondo
async function makeSubtitleImage(backgroundUrl, subtitleText, outPath) {
  const W = 800, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  try {
    const img = await loadImage(backgroundUrl);
    ctx.drawImage(img, 0, 0, W, H);
  } catch {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, W, H);
  }
  
  // fondo oscuro semitransparente
  const lineHeight = 40;
  const padding = 20;
  const textWidth = W - 2 * padding;
  
  // Medir el texto para ajustar el fondo
  ctx.font = '30px Arial';
  const lines = [];
  let currentLine = '';
  
  // Dividir el texto en líneas que quepan en el ancho
  for (const word of subtitleText.split(' ')) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > textWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  
  const totalTextHeight = lines.length * lineHeight;
  const startY = H - totalTextHeight - 60;
  
  // Dibujar fondo
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(
    padding, 
    startY - 20, 
    W - 2 * padding, 
    totalTextHeight + 40
  );
  
  // Dibujar texto
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  
  lines.forEach((line, i) => {
    ctx.fillText(line, W/2, startY + (i * lineHeight));
  });
  
  // guardar
  const out = fs.createWriteStream(outPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  return new Promise(resolve => out.on('finish', resolve));
}

// 5. Calcular duraciones proporcionales a la longitud del texto
function calculateDurations(sentences, totalDuration) {
  // Calcular longitud total de todos los caracteres
  const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  
  // Si no hay caracteres, dividir uniformemente
  if (totalChars === 0) {
    const uniformDuration = totalDuration / sentences.length;
    return Array(sentences.length).fill(uniformDuration);
  }
  
  // Calcular duración para cada frase proporcional a su longitud
  return sentences.map(sentence => {
    const proportion = sentence.length / totalChars;
    return proportion * totalDuration;
  });
}

// 6. Generar vídeo con subtítulos por frases
async function generateVideo(texto, imageUrl, idioma = 'es') {
  // Audio
  const audioBuf = await getAudioBuffer(texto, idioma);
  //le ponemos el nombre de la fecha mas un numero random entre 1 y 3000
  const audioPath = path.join(tempDir, `audio-${Date.now()+"rand"+(Math.floor(Math.random() * 3000) + 1)}.mp3`); 
  console.log(audioPath);
  await writeFile(audioPath, audioBuf);

  // Obtener duración total del audio
  const totalDuration = await getAudioDuration(audioPath);

  // Dividir texto en frases
  const sentences = splitTextIntoSentences(texto);
  
  // Calcular duraciones proporcionales
  const sentenceDurations = calculateDurations(sentences, totalDuration);

  // Imágenes de subtítulos
  const imageFiles = [];
  for (let i = 0; i < sentences.length; i++) {
    const imgPath = path.join(tempDir, `sub_${i}_${Date.now()}.png`);
    await makeSubtitleImage(imageUrl, sentences[i], imgPath);
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

// Endpoint
app.post('/video', async (req, res) => {
  try {
    const { texto, idioma = 'es', imageUrl } = req.body;
    if (!texto || !imageUrl) {
      return res.status(400).json({ error: 'Falta "texto" o "imageUrl".' });
    }
    const videoB64 = await generateVideo(texto, imageUrl, idioma);
    res.json({
      success: true,
      videoUrl: `data:video/mp4;base64,${videoB64}`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Error generando el vídeo.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});