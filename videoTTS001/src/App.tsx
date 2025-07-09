import React, { useState, useRef, useEffect } from 'react';
import './styles.css';
interface HeritageData {
  description: {
    local: {
      short: string;
      medium: string;
      long?: string;
    };
  };
  image?: string;
}

const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";
const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png"
];

const App: React.FC = () => {
  const [heritageItems, setHeritageItems] = useState<HeritageData[]>([]);
  const [language, setLanguage] = useState('es');
  const [textLength, setTextLength] = useState<'short' | 'medium'>('medium');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContent, setCurrentContent] = useState<{
    text: string;
    image: string;
    tuber: string;
  } | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentIndexRef = useRef(0);

  // Procesar múltiples elementos de patrimonio
  const processMultiHeritage = async (items: HeritageData[], lang: string, length: 'short' | 'medium') => {
    setIsPlaying(true);
    currentIndexRef.current = 0;
    playNextItem(items, lang, length);
  };

  // Reproducir el siguiente elemento
  const playNextItem = (items: HeritageData[], lang: string, length: 'short' | 'medium') => {
    if (currentIndexRef.current >= items.length) {
      setIsPlaying(false);
      return;
    }

    const item = items[currentIndexRef.current];
    const originalText = item.description.local[length];
    const imageUrl = item.image || DEFAULT_IMAGE_URL;

    // Traducir el texto (simulado - en producción usarías una API real)
    translateText(originalText, lang).then(translatedText => {
      setCurrentContent({
        text: translatedText,
        image: imageUrl,
        tuber: PNG_TUBERS[currentIndexRef.current % PNG_TUBERS.length]
      });

      speakText(translatedText, lang, () => {
        currentIndexRef.current++;
        setTimeout(() => playNextItem(items, lang, length), 500);
      });
    });
  };

  // Sintetizar voz
  const speakText = (text: string, lang: string, onEnd: () => void) => {
    const sentences = splitSentences(text);
    let sentenceIndex = 0;

    const speakNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        onEnd();
        return;
      }

      const sentence = sentences[sentenceIndex];
      setCurrentContent(prev => prev ? { ...prev, text: sentence } : null);

      speechRef.current = new SpeechSynthesisUtterance(sentence);
      speechRef.current.lang = lang;
      speechRef.current.onend = () => {
        sentenceIndex++;
        setTimeout(speakNextSentence, 300);
      };
      
      window.speechSynthesis.speak(speechRef.current);
    };

    speakNextSentence();
  };

  // Dividir texto en oraciones
  const splitSentences = (text: string): string[] => {
    return text.split(/(?<=[.!?])\s+/g)
               .map(s => s.trim())
               .filter(s => s.length > 0);
  };

  // Función de traducción simulada
  const translateText = async (text: string, targetLang: string): Promise<string> => {
    // En una implementación real, usarías una API de traducción
    console.log(`Traduciendo a ${targetLang}: ${text.substring(0, 30)}...`);
    return text; // Retorna el mismo texto como simulación
  };

  // Detener reproducción
  const stopPlayback = () => {
    if (speechRef.current) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  // Ejemplo de carga de datos JSON
  const loadExampleData = () => {
    const exampleData: HeritageData[] = [
      {
        description: {
          local: {
            short: "La Catedral de Sevilla es la catedral gótica más grande del mundo.",
            medium: "La Catedral de Sevilla, construida entre 1401 y 1506, es la catedral gótica más grande del mundo y alberga la tumba de Cristóbal Colón. Su campanario, la Giralda, es el antiguo alminar de la mezquita que ocupaba el lugar."
          }
        },
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Catedral_de_Sevilla.jpg/800px-Catedral_de_Sevilla.jpg"
      },
      {
        description: {
          local: {
            short: "La Alhambra es un palacio y fortaleza nazarí en Granada.",
            medium: "La Alhambra es un complejo palaciego y fortaleza situado en Granada, España. Fue residencia de los monarcas nazaríes y destaca por su arquitectura islámica, patios y decoración. El Generalife, con sus jardines, forma parte del conjunto."
          }
        },
        image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Alhambra_from_Albaicin.jpg/800px-Alhambra_from_Albaicin.jpg"
      }
    ];
    setHeritageItems(exampleData);
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="app">
      <h1>Generador de Videos MultiJSON</h1>
      
      {!isPlaying ? (
        <div className="controls">
          <div className="language-selector">
            <label>
              Idioma:
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="fr">Francés</option>
              </select>
            </label>
            
            <label>
              Longitud del texto:
              <select 
                value={textLength} 
                onChange={(e) => setTextLength(e.target.value as 'short' | 'medium')}
              >
                <option value="short">Corto</option>
                <option value="medium">Medio</option>
              </select>
            </label>
          </div>
          
          <div className="data-section">
            <button onClick={loadExampleData}>Cargar Datos de Ejemplo</button>
            <div className="json-preview">
              {heritageItems.map((item, index) => (
                <div key={index} className="json-item">
                  <h3>Elemento {index + 1}</h3>
                  <p>{item.description.local[textLength].substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => processMultiHeritage(heritageItems, language, textLength)}
            disabled={heritageItems.length === 0}
          >
            Generar Video MultiJSON
          </button>
        </div>
      ) : (
        <div className="player-container">
          {currentContent && (
            <div className="video-preview">
              <img 
                src={currentContent.image} 
                alt="Background" 
                className="background" 
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_IMAGE_URL;
                }}
              />
              
              <div className="tuber-container">
                <img 
                  src={currentContent.tuber} 
                  alt="PNG Tuber" 
                  className="tuber"
                  onError={(e) => e.currentTarget.src = PNG_TUBERS[0]}
                />
              </div>
              
              <div className="subtitles">
                {currentContent.text}
              </div>
            </div>
          )}
          
          <button onClick={stopPlayback}>Detener</button>
        </div>
      )}
    </div>
  );
};

export default App;