import axios from 'axios';
import tts from 'google-tts-api';
import { createCanvas, loadImage } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import translate from '@iamtraction/google-translate';
import { promisify } from 'util';
import fs from 'fs';

const readFile = promisify(fs.readFile);

export async function getAudioBuffer(texto, idioma = 'es') {
  let translatedText = texto;
  if (idioma !== 'es') {
    try {
      const result = await translate(texto, { to: idioma });
      translatedText = result.text;
    } catch (error) {
      console.error('Error al traducir el texto:', error);
    }
  }

  const textChunks = [];
  let currentChunk = '';
  
  const sentences = translatedText.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length < 200) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) textChunks.push(currentChunk);
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) textChunks.push(currentChunk);

  const finalChunks = [];
  for (const chunk of textChunks) {
    if (chunk.length < 200) {
      finalChunks.push(chunk);
    } else {
      const words = chunk.split(' ');
      let tempChunk = '';
      for (const word of words) {
        if (tempChunk.length + word.length < 200) {
          tempChunk += (tempChunk ? ' ' : '') + word;
        } else {
          if (tempChunk) finalChunks.push(tempChunk);
          tempChunk = word;
        }
      }
      if (tempChunk) finalChunks.push(tempChunk);
    }
  }

  const audioUrls = await Promise.all(
    finalChunks.map(chunk => 
      tts.getAudioUrl(chunk, { lang: idioma, slow: false })
    )
  );

  const audioBuffers = await Promise.all(
    audioUrls.map(url => 
      axios.get(url, { responseType: 'arraybuffer' })
        .then(res => Buffer.from(res.data))
    )
  );

  return Buffer.concat(audioBuffers);
}

export async function getAudioDuration(filePath) {
  return new Promise((res) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err || !meta.format.duration) return res(5);
      res(meta.format.duration);
    });
  });
}

export function splitTextIntoSentences(text) {
  const sentences = text.split(/(?<=\.)/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences.length > 0 ? sentences : [text];
}

export async function makeSubtitleImage(backgroundUrl, subtitleText, outPath, frameIndex) {
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

  const pngUrls = [
    'https://estaticos-cdn.prensaiberica.es/clip/2c5d8947-38c4-4300-8c7d-7e72deaf267e_alta-libre-aspect-ratio_640w_0.png',
    'https://storage.mlcdn.com/account_image/1359544/URoiMHeCK0PwJW7IDCUGO8qIXed8h29AhTmJf3vR.png',
  ];
  const selectedPngUrl = pngUrls[frameIndex % pngUrls.length];

  try {
    const pngImg = await loadImage(selectedPngUrl);
    const pngWidth = 400;
    const pngHeight = (pngImg.height / pngImg.width) * pngWidth;
    const randomX = 500;
    const randomY = 300;
    
    ctx.drawImage(pngImg, randomX, randomY, pngWidth, pngHeight);
  } catch (error) {
    console.error('Error al cargar el PNG transparente:', error);
  }

  const lineHeight = 40;
  const padding = 20;
  const textWidth = W - 2 * padding;
  
  ctx.font = '30px Arial';
  const lines = [];
  let currentLine = '';
  
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
  
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(
    padding, 
    startY - 20, 
    W - 2 * padding, 
    totalTextHeight + 40
  );
  
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  
  lines.forEach((line, i) => {
    ctx.fillText(line, W/2, startY + (i * lineHeight));
  });
  
  const out = fs.createWriteStream(outPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  return new Promise(resolve => out.on('finish', resolve));
}

export function calculateDurations(sentences, totalDuration) {
  const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  
  if (totalChars === 0) {
    const uniformDuration = totalDuration / sentences.length;
    return Array(sentences.length).fill(uniformDuration);
  }
  
  return sentences.map(sentence => {
    const proportion = sentence.length / totalChars;
    return proportion * totalDuration;
  });
}