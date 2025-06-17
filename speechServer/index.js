import express from 'express';
import axios from 'axios';
import tts from 'google-tts-api';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Función para obtener audio como buffer
async function getAudioBuffer(text, lang = 'es') {
  try {
    const url = await tts.getAudioUrl(text, { 
      lang: lang || 'es', 
      slow: false 
    });
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error al obtener el audio:', error);
    throw error;
  }
}

// Endpoint para probar el servicio
app.get('/voz/saludo', async (req, res) => {
  try {
    const audioBuffer = await getAudioBuffer('Hola, este es el servicio de texto a voz');
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el saludo de voz' });
  }
});

// Endpoint para generar voz con parámetros GET
app.get('/voz/generar', async (req, res) => {
  try {
    const { texto = 'Texto no proporcionado', idioma = 'es' } = req.query;
    const audioBuffer = await getAudioBuffer(texto, idioma);
    
    // Convertir a Blob URL (simulado para el cliente)
    const base64Audio = audioBuffer.toString('base64');
    const blobUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    res.json({ 
      audioUrl: blobUrl,
      texto: texto,
      idioma: idioma
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el audio' });
  }
});

// Endpoint para generar voz con parámetros POST
app.post('/voz/generar', async (req, res) => {
  try {
    const { texto, idioma = 'es' } = req.body;
    
    if (!texto) {
      return res.status(400).json({ error: 'El parámetro "texto" es requerido' });
    }

    const audioBuffer = await getAudioBuffer(texto, idioma);
    const base64Audio = audioBuffer.toString('base64');
    const blobUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    res.json({ 
      audioUrl: blobUrl,
      texto: texto,
      idioma: idioma,
      mensaje: 'Audio generado con éxito'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar el audio' });
  }
});

// Endpoint para listar idiomas disponibles
app.get('/voz/idiomas', (req, res) => {
  const idiomas = [
    { codigo: 'es', nombre: 'Español' },
    { codigo: 'en', nombre: 'Inglés' },
    { codigo: 'fr', nombre: 'Francés' },
    { codigo: 'de', nombre: 'Alemán' },
    { codigo: 'it', nombre: 'Italiano' },
    { codigo: 'pt', nombre: 'Portugués' },
    { codigo: 'ja', nombre: 'Japonés' },
    { codigo: 'ru', nombre: 'Ruso' }
  ];
  res.json(idiomas);
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor de Texto a Voz en http://localhost:${port}`);
});