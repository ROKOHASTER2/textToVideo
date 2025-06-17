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
//import cors from 'cors'; para el server de react

// Configurar ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath.path);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

const app = express();
const port = 3000;
/* Esto es para pruebitas con mi server de react
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
const tempDir = tmpdir();
*/
// Función para obtener audio como buffer
async function getAudioBuffer(texto, idioma = 'es') {
  const url = await tts.getAudioUrl(texto, { 
    lang: idioma || 'es', 
    slow: false 
  });
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

// Función para obtener duración del audio
async function getAudioDuration(audioPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      resolve(err || !metadata.format.duration ? 5 : metadata.format.duration);
    });
  });
}

// Función para generar video
async function generateVideo(texto, imageUrl, idioma = 'es') {
  // 1. Generar audio
  const audioBuffer = await getAudioBuffer(texto, idioma);
  const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`);
  await fs.promises.writeFile(audioPath, audioBuffer);

  // 2. Obtener duración del audio
  const duration = await getAudioDuration(audioPath);

  // 3. Preparar imagen
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  
  try {
    const image = await loadImage(imageUrl);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch (error) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '30px Arial';
    ctx.fillText('Imagen no disponible', 50, 50);
  }

  const imagePath = path.join(tempDir, `image-${Date.now()}.png`);
  const out = fs.createWriteStream(imagePath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  await new Promise((resolve) => out.on('finish', resolve));

  // 4. Generar video
  const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1', `-t ${duration}`])
      .input(audioPath)
      .outputOptions([
        '-c:v libx264',
        '-tune stillimage',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-shortest'
      ])
      .save(videoPath)
      .on('end', resolve)
      .on('error', reject);
  });

  // 5. Leer video como base64
  const videoBuffer = await readFile(videoPath);
  const videoBase64 = videoBuffer.toString('base64');

  // 6. Limpiar archivos temporales
  await Promise.all([
    unlink(audioPath),
    unlink(imagePath),
    unlink(videoPath)
  ].map(p => p.catch(e => console.error('Error al borrar archivo temporal:', e))));

  return videoBase64;
}

// Endpoint POST para generar video
app.post('/video', async (req, res) => {
  try {
    const { texto, idioma = 'es', imageUrl } = req.body;
    
    if (!texto || !imageUrl) {
      return res.status(400).json({ 
        error: 'Parámetros requeridos: "texto" y "imageUrl"' 
      });
    }

    const videoBase64 = await generateVideo(texto, imageUrl, idioma);
    const videoBlobUrl = `data:video/mp4;base64,${videoBase64}`;
    
    res.json({
      success: true,
      videoUrl: videoBlobUrl,
      texto: texto,
      idioma: idioma,
      imageUrl: imageUrl
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar el video' 
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor listo en http://localhost:${port}`);
});