// Importamos hooks de React para manejar estado, ciclos de vida y referencias mutables
import { useState, useEffect, useRef } from "react";

// Función de traducción personalizada con la Api de Google Translate
import { translate } from "./translatePrueba";

// Hook personalizado que gestiona la reproducción de texto a voz (TTS) y el sistema de PNGTubers (avatares animados)
import { useTTSPlayer, PNG_TUBERS } from "./tts11labs";

// Definimos una interfaz para describir el formato de descripción de un patrimonio cultural
interface HeritageDescription {
  local: {
    short: string;
    extended: string;
  };
}

// Definimos la estructura de un elemento patrimonial
interface HeritageItem {
  id: string;
  name: string;
  description: HeritageDescription;
  imageUrl: string;
}

const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";

export const TextToVideo = () => {
  const [heritageItems, setHeritageItems] = useState<HeritageItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [descriptionLength, setDescriptionLength] = useState<
    "short" | "extended"
  >("extended");
  const [targetLanguage, setTargetLanguage] = useState<"fr" | "en" | "es">(
    "fr"
  );
  const [displayText, setDisplayText] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [testText, setTestText] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [voiceId, setVoiceId] = useState("Nh2zY9kknu6z4pZy6FhD"); // Voz mujer por defecto

  const sentenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef(autoAdvance);
  const currentItemRef = useRef(currentItemIndex);
  const heritageItemsRef = useRef(heritageItems);

  /**
   * Efecto para sincronizar las referencias con los estados actuales
   * Esto asegura que las referencias siempre tengan los valores más recientes
   * incluso dentro de callbacks asíncronos
   */
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
    currentItemRef.current = currentItemIndex;
    heritageItemsRef.current = heritageItems;
  }, [autoAdvance, currentItemIndex, heritageItems]);

  const currentItem = heritageItems[currentItemIndex] || {
    id: "default",
    name: "Patrimonio Cultural",
    description: {
      local: {
        short: "Ingrese un JSON válido para comenzar",
        extended: "Ingrese un JSON válido para comenzar",
      },
    },
    imageUrl: "",
  };

  /**
   * Hook personalizado para el reproductor de Text-to-Speech
   * Gestiona la reproducción de audio y la animación del avatar PNGTuber
   * @param text - Texto a convertir a voz
   * @param lang - Idioma de la voz
   * @param onStop - Callback que se ejecuta al terminar la reproducción
   * @param voiceId - ID de la voz a utilizar
   * @param apiKey - Clave de API para el servicio TTS
   */
  const {
    isPlaying,
    progress,
    currentPNGTuber,
    play: startTTS,
    stop: stopTTS,
  } = useTTSPlayer({
    text: displayText,
    lang: targetLanguage,
    onStop: () => {
      if (autoAdvanceRef.current && heritageItemsRef.current.length > 1) {
        setIsLoadingNext(true);
        const nextIndex =
          (currentItemRef.current + 1) % heritageItemsRef.current.length;
        setCurrentItemIndex(nextIndex);
      }
    },
    voiceId: voiceId,
    apiKey: "sk_b79f1163753aac8d1e5f160f1a378a5ecafa59715d38511a",
  });

  /**
   * Efecto para manejar el avance automático al siguiente patrimonio
   * Se activa cuando isLoadingNext cambia y hay texto para mostrar
   * Espera un breve momento antes de iniciar la reproducción automática
   */
  useEffect(() => {
    if (isLoadingNext && displayText && !displayText.includes("JSON válido")) {
      const timer = setTimeout(() => {
        if (!isPlaying) {
          handlePlay();
        }
        setIsLoadingNext(false);
      }, 500);
      // si baja de 500 el tiemout, el tts reproduce el audio anterior
      // asi que no hay que tocar esto
      return () => clearTimeout(timer);
    }
  }, [isLoadingNext, displayText, isPlaying]);

  /**
   * Función para cargar y validar datos de patrimonio desde un JSON
   * Parsea el input JSON, valida la estructura y actualiza el estado
   * Muestra errores si el JSON es inválido o no tiene el formato correcto
   */
  const loadHeritageFromJson = () => {
    try {
      const parsedItems = JSON.parse(jsonInput);
      if (!Array.isArray(parsedItems))
        throw new Error("El JSON debe ser un array de objetos");

      const validatedItems = parsedItems.map((item, index) => ({
        id: item.identifier?.toString() || `item-${index}`,
        name: item.name || `Patrimonio ${index + 1}`,
        description: {
          local: item.description?.local || { short: "", extended: "" },
        },
        imageUrl: item.image || "",
      }));

      setHeritageItems(validatedItems);
      setCurrentItemIndex(0);
      setJsonError(null);
    } catch (error: any) {
      setJsonError(`Error en el JSON: ${error.message}`);
    }
  };

  /**
   * Función para preparar un elemento de prueba rápido
   * Permite probar la funcionalidad sin necesidad de cargar un JSON completo
   * Crea un único elemento de patrimonio con los datos proporcionados
   */
  const prepareTestItem = () => {
    setHeritageItems([
      {
        id: "test-item",
        name: "Prueba personalizada",
        description: {
          local: { short: testText, extended: testText },
        },
        imageUrl: testImageUrl || DEFAULT_IMAGE_URL,
      },
    ]);
    setCurrentItemIndex(0);
  };

  /**
   * Efecto para traducir el texto de descripción al idioma seleccionado
   * Se ejecuta cuando cambia el elemento actual, la longitud de descripción o el idioma objetivo
   * Utiliza la función translate para obtener la traducción asíncrona
   */
  useEffect(() => {
    const fetchTranslation = async () => {
      const text = currentItem.description.local[descriptionLength];
      if (text) {
        try {
          const translatedText = await translate(text, targetLanguage);
          setDisplayText(translatedText);
        } catch (error) {
          console.error("Error en traducción:", error);
          setDisplayText(text);
        }
      }
    };

    fetchTranslation();
  }, [currentItem, descriptionLength, targetLanguage]);

  /**
   * Función para iniciar la reproducción del texto a voz
   * Verifica que haya texto válido antes de iniciar la reproducción
   * Muestra una alerta si no hay contenido para reproducir
   */
  const handlePlay = () => {
    if (!displayText.trim() || displayText.includes("JSON válido")) {
      alert("No hay contenido para reproducir");
      return;
    }

    startTTS();
  };

  /**
   * Función para detener la reproducción actual
   * Limpia temporizadores y resetea el estado de carga
   */
  const handleStop = () => {
    stopTTS();
    setIsLoadingNext(false);

    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }
  };

  /**
   * Función para navegar al elemento patrimonial anterior
   * Implementa un comportamiento circular (vuelve al último cuando está en el primero)
   */
  const handlePrev = () => {
    setCurrentItemIndex((prev) =>
      prev > 0 ? prev - 1 : heritageItems.length - 1
    );
  };

  /**
   * Función para navegar al siguiente elemento patrimonial
   * Implementa un comportamiento circular (vuelve al primero cuando está en el último)
   */
  const handleNext = () => {
    setCurrentItemIndex((prev) =>
      prev < heritageItems.length - 1 ? prev + 1 : 0
    );
  };

  /**
   * Efecto de limpieza al desmontar el componente
   * Asegura que se cancelen todos los temporizadores pendientes
   */
  useEffect(() => {
    return () => {
      if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);
    };
  }, []);

  /**
   * Efecto para dividir el texto en oraciones para los subtítulos
   * Separa el texto por signos de puntuación y filtra oraciones vacías
   * Se ejecuta cada vez que cambia el texto a mostrar
   */
  useEffect(() => {
    if (displayText) {
      const newSentences = displayText
        .split(/(?<=[.!?])\s+/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      setSentences(newSentences);
      setCurrentSentenceIndex(0);
    }
  }, [displayText]);

  /**
   * Efecto para controlar la transición entre oraciones en los subtítulos
   * Calcula la duración de cada oración basada en su longitud
   * Avanza automáticamente a la siguiente oración mientras se reproduce el audio
   */
  useEffect(() => {
    if (!isPlaying || sentences.length === 0) return;

    if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);

    const currentSentence = sentences[currentSentenceIndex];
    const duration = 1500 + currentSentence.length * 50;

    sentenceTimerRef.current = setTimeout(() => {
      setCurrentSentenceIndex((prev) => (prev + 1) % sentences.length);
    }, duration);
  }, [isPlaying, sentences, currentSentenceIndex]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Simulador de Patrimonio Cultural</h2>

      <div style={styles.controlsRow}>
        <select
          value={descriptionLength}
          onChange={(e) =>
            setDescriptionLength(e.target.value as "short" | "extended")
          }
          style={styles.select}
        >
          <option value="short">Descripción Corta</option>
          <option value="extended">Descripción Extendida</option>
        </select>

        <select
          value={targetLanguage}
          onChange={(e) =>
            setTargetLanguage(e.target.value as "fr" | "en" | "es")
          }
          style={styles.select}
        >
          <option value="fr">Francés</option>
          <option value="en">Inglés</option>
          <option value="es">Español</option>
        </select>

        <select
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          style={styles.select}
        >
          <option value="21m00Tcm4TlvDq8ikWAM">Voz Mujer</option>
          <option value="iLzHtPh0bW6RGWRG0Xo5">Voz Hombre</option>
          <option value="Nh2zY9kknu6z4pZy6FhD">Voz Hombre Joven</option>
        </select>

        <button
          onClick={() => setAutoAdvance(!autoAdvance)}
          style={{
            ...styles.autoAdvanceButton,
            backgroundColor: autoAdvance ? "#34a853" : "#ea4335",
          }}
        >
          {autoAdvance ? "⏩ AUTO ON" : "⏩ AUTO OFF"}
        </button>
      </div>

      <div style={styles.section}>
        <h3>Cargar datos de patrimonio (JSON)</h3>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Pega aquí el JSON con los datos de patrimonio..."
          style={styles.textarea}
        />

        {jsonError && <div style={styles.error}>{jsonError}</div>}

        <button onClick={loadHeritageFromJson} style={styles.buttonPrimary}>
          Cargar JSON
        </button>

        {heritageItems.length > 0 && (
          <div style={styles.infoBox}>
            <strong>{heritageItems.length}</strong> patrimonios cargados
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3>Pruebas rápidas</h3>
        <div>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Texto para probar"
            style={styles.input}
          />
          <input
            type="text"
            value={testImageUrl}
            onChange={(e) => setTestImageUrl(e.target.value)}
            placeholder="URL de imagen (opcional)"
            style={styles.input}
          />
          <button
            onClick={() => {
              prepareTestItem();
              setTimeout(handlePlay, 100);
            }}
            style={styles.buttonSuccess}
          >
            Probar
          </button>
        </div>
      </div>

      <div style={styles.navigation}>
        <button
          onClick={handlePrev}
          disabled={heritageItems.length === 0}
          style={styles.navButton}
          title="Anterior"
        >
          ⬅️
        </button>

        <div style={styles.itemCounter}>
          {heritageItems.length > 0
            ? `${currentItemIndex + 1}/${heritageItems.length}`
            : "0/0"}
        </div>

        <button
          onClick={handleNext}
          disabled={heritageItems.length === 0}
          style={styles.navButton}
          title="Siguiente"
        >
          ➡️
        </button>
      </div>

      <div style={styles.viewer}>
        <img
          src={currentItem.imageUrl || DEFAULT_IMAGE_URL}
          alt="Background"
          style={{
            ...styles.backgroundImage,
            opacity: isPlaying ? 1 : 0.7,
          }}
          onError={(e) => (e.currentTarget.src = DEFAULT_IMAGE_URL)}
        />

        {isPlaying && (
          <>
            <img
              src={PNG_TUBERS[currentPNGTuber]}
              alt="Avatar"
              style={{
                ...styles.avatar,
                transform: `scale(${progress % 10 < 5 ? 4 : 4.05})`,
              }}
            />
            <div style={styles.caption}>
              {sentences.length > 0 && sentences[currentSentenceIndex]}
            </div>
          </>
        )}

        {isLoadingNext && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}></div>
            <p>Cargando siguiente patrimonio...</p>
          </div>
        )}

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      <div style={styles.playbackControls}>
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={heritageItems.length === 0 || isLoadingNext}
            style={{
              ...styles.playButton,
              backgroundColor:
                heritageItems.length === 0 || isLoadingNext
                  ? "#ccc"
                  : "#4285f4",
            }}
          >
            ▶️ Reproducir
          </button>
        ) : (
          <button onClick={handleStop} style={styles.stopButton}>
            ⏹️ Detener
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "20px",
    backgroundColor: "#f5f5f5",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    marginBottom: "30px",
  },
  controlsRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  select: {
    padding: "10px",
    width: "200px",
    marginBottom: "10px",
  },
  autoAdvanceButton: {
    padding: "10px 15px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  section: {
    width: "100%",
    maxWidth: "800px",
    marginBottom: "20px",
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  textarea: {
    width: "100%",
    height: "200px",
    padding: "10px",
    fontFamily: "monospace",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  error: {
    color: "red",
    marginBottom: "10px",
  },
  buttonPrimary: {
    padding: "10px 15px",
    backgroundColor: "#4285f4",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginRight: "10px",
  },
  buttonSuccess: {
    padding: "10px 15px",
    backgroundColor: "#34a853",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  infoBox: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
    borderLeft: "4px solid #4285f4",
  },
  navigation: {
    width: "100%",
    maxWidth: "800px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  navButton: {
    padding: "10px 15px",
    fontSize: "20px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.3s",
  },
  itemCounter: {
    padding: "5px 10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
    fontWeight: "bold",
  },
  viewer: {
    width: "500px",
    height: "300px",
    position: "relative" as const,
    marginBottom: "20px",
    borderRadius: "8px",
    overflow: "hidden" as const,
    backgroundColor: "#000",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transition: "opacity 0.3s",
  },
  avatar: {
    position: "absolute" as const,
    right: "20px",
    bottom: "20px",
    width: "120px",
    height: "120px",
    objectFit: "contain" as const,
    transition: "transform 0.3s",
  },
  caption: {
    position: "absolute" as const,
    bottom: "0",
    left: "0",
    right: "0",
    padding: "10px",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    textAlign: "center" as const,
    minHeight: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    lineHeight: "1.4",
  },
  loadingOverlay: {
    position: "absolute" as const,
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    zIndex: 10,
  },
  loadingSpinner: {
    border: "4px solid rgba(255,255,255,0.3)",
    borderRadius: "50%",
    borderTop: "4px solid #4285f4",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    marginBottom: "10px",
  },
  progressBar: {
    position: "absolute" as const,
    bottom: "0",
    left: "0",
    right: "0",
    height: "4px",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4285f4",
    transition: "width 0.1s linear",
  },
  playbackControls: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  playButton: {
    padding: "12px 24px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  stopButton: {
    padding: "12px 24px",
    backgroundColor: "#ea4335",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
};
