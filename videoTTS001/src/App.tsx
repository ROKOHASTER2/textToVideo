import React, { useState, useEffect, useRef } from 'react';
import { useSpeech } from 'react-text-to-speech';

const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";

const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png"
];

// Configuración de idiomas disponibles
const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '中文(简体)' },
  { code: 'ru', name: 'Русский' }
];

// Declaración global para TypeScript
declare global {
  interface Window {
    google: any;
  }
}

const App = () => {
  const [text, setText] = useState('Texto de ejemplo. Este audio se sincronizará con la visualización.');
  const [imageUrl, setImageUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTuber, setCurrentTuber] = useState(0);
  const [language, setLanguage] = useState('es');
  const [translatedText, setTranslatedText] = useState('');
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  
  const { start, pause, stop } = useSpeech({ 
    text: translatedText || text,
    lang: language
  });

  // Cargar script de Google Translate
  useEffect(() => {
    // Verificar si el script ya está cargado
    const existingScript = document.querySelector('script[src*="translate.google.com"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);

    // Inicializar cuando el script esté listo
    (window as any).googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'es',
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
      }
    };

    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
      // Limpiar la función global
      delete (window as any).googleTranslateElementInit;
    };
  }, []);

  // Traducir texto cuando cambia el idioma o el texto original
  useEffect(() => {
    const translateText = async () => {
      if (!text.trim() || language === 'es') {
        setTranslatedText('');
        return;
      }

      try {
        // Usamos la API de Google Translate directamente
        const response = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${language}&dt=t&q=${encodeURIComponent(text)}`
        );
        const data = await response.json();
        
        if (data && Array.isArray(data[0])) {
          const translated = data[0].map((item: any) => item[0]).join('');
          setTranslatedText(translated);
        }
      } catch (error) {
        console.error('Error al traducir:', error);
        setTranslatedText('');
      }
    };

    translateText();
  }, [text, language]);

  // Calcula duración estimada basada en cantidad de palabras
  const calculateDuration = () => {
    const content = translatedText || text;
    const words = content.split(/\s+/).filter(Boolean).length;
    const wordsPerSecond = 2;
    return Math.max(words / wordsPerSecond, 3);
  };

  // Detecta puntos finales de frase para cambiar el PNG tuber
  const detectSentenceEnds = (content: string) => {
    const sentenceEnds = [];
    const regex = /[.!?]/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      sentenceEnds.push(match.index);
    }
    
    return sentenceEnds;
  };

  const handlePlay = () => {
    const content = translatedText || text;
    const duration = calculateDuration();
    const sentenceEnds = detectSentenceEnds(content);
    setProgress(0);
    setCurrentTuber(0);
    
    let elapsed = 0;
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(() => {
      elapsed += 0.1;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);
      
      // Cambiar tuber al final de cada frase
      const currentChar = Math.floor(content.length * currentProgress / 100);
      sentenceEnds.forEach((endPos, index) => {
        if (currentChar >= endPos && currentTuber === index % PNG_TUBERS.length) {
          setCurrentTuber((index + 1) % PNG_TUBERS.length);
        }
      });
    }, 100);
    
    start();
    setIsPlaying(true);
  };

  const handlePause = () => {
    pause();
    setIsPlaying(false);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const handleStop = () => {
    stop();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTuber(0);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // Limpiar intervalos al desmontar
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }}>
      {/* Contenedor oculto para Google Translate */}
      <div id="google_translate_element" style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 1000,
        opacity: 0.01,
        pointerEvents: 'none'
      }} />
      
      <h2 style={{ marginBottom: '30px' }}>Simulador Audio-Visual</h2>
      
      {/* Selector de idioma personalizado */}
      <div style={{ 
        marginBottom: '20px', 
        width: '80%', 
        maxWidth: '600px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <label style={{
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          Idioma:
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white'
          }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
      
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ 
          width: '80%',
          maxWidth: '600px',
          height: '120px',
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          fontSize: '16px'
        }}
        placeholder="Escribe el texto a convertir en audio..."
      />
      
      {translatedText && language !== 'es' && (
        <div style={{
          width: '80%',
          maxWidth: '600px',
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          backgroundColor: '#f0f8ff',
          fontSize: '16px',
          color: '#0066cc'
        }}>
          <strong>Traducción ({LANGUAGES.find(l => l.code === language)?.name}):</strong> {translatedText}
        </div>
      )}
      
      <div style={{ marginBottom: '20px', width: '60%', maxWidth: '500px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 'bold'
        }}>
          URL de la imagen:
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Pega la URL de tu imagen aquí"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
      
      {/* Visualizador simulado */}
      <div style={{
        width: '60%',
        maxWidth: '500px',
        height: '300px',
        position: 'relative',
        marginBottom: '20px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        backgroundColor: '#000'
      }}>
        <img 
          src={imageUrl || DEFAULT_IMAGE_URL}
          alt="Fondo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            opacity: isPlaying ? 1 : 0.7,
            filter: isPlaying ? 'brightness(1)' : 'brightness(0.7)',
            transition: 'all 0.3s ease'
          }}
          onError={(e) => {
            e.currentTarget.src = DEFAULT_IMAGE_URL;
          }}
        />
        
        {/* Simulación de PNG tuber */}
        {isPlaying && (
          <img 
            src={PNG_TUBERS[currentTuber]}
            alt="Avatar"
            style={{
              position: 'absolute',
              right: '50px',
              bottom: '50px',
              width: '150px',
              height: '150px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))',
              transition: 'all 0.5s ease'
            }}
          />
        )}
        
        {/* Barra de progreso */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.3)'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#4285f4',
            transition: 'width 0.1s linear'
          }} />
        </div>
        
        {/* Texto simulado (subtítulos) */}
        {isPlaying && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '0',
            right: '0',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            textAlign: 'center',
            fontSize: '16px'
          }}>
            {(translatedText || text).substring(0, Math.floor((translatedText || text).length * progress / 100))}
          </div>
        )}
      </div>
      
      {/* Controles */}
      <div style={{ display: 'flex', gap: '15px' }}>
        {!isPlaying ? (
          <button 
            onClick={handlePlay}
            style={{
              padding: '12px 25px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            Reproducir
          </button>
        ) : (
          <>
            <button 
              onClick={handlePause}
              style={{
                padding: '12px 25px',
                backgroundColor: '#fbbc05',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              Pausar
            </button>
            <button 
              onClick={handleStop}
              style={{
                padding: '12px 25px',
                backgroundColor: '#ea4335',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              Detener
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default App;