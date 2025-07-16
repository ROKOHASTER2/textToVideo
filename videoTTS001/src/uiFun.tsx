import { useCallback, useEffect, useState, useRef } from "react";
import { useCtrlFun } from "./ctrlFun";
import { useAudioFun } from "./audioFun";
import { BgFun, PNG_TUBERS } from "./bgFun";

// Function to split text into sentences
function splitTextIntoSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Function to calculate display time for each sentence (ms)
function calculateSentenceDuration(sentence: string): number {
  // Base time + extra time per character
  return 1500 + sentence.length * 50;
}

// Componente principal de la interfaz de usuario del simulador de patrimonio cultural
export const UiFun = () => {
  const [targetLanguage, setTargetLanguage] = useState<"fr" | "en" | "es">(
    "fr"
  );
  // Extracción de estados y funciones del hook de control
  const {
    heritageItems,
    currentItemIndex,
    setCurrentItemIndex,
    jsonInput,
    setJsonInput,
    jsonError,
    descriptionLength,
    setDescriptionLength,
    testText,
    setTestText,
    testImageUrl,
    setTestImageUrl,
    currentItem,
    loadHeritageFromJson,
    prepareTestItem,
    isAutoAdvancing,
    safeAdvance,
  } = useCtrlFun();

  // Estados para el nuevo sistema de visualización de texto
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const sentenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Extracción de estados y funciones del hook de audio
  const {
    isPlaying,
    progress,
    currentTuber,
    displayText,
    handlePlay: audioHandlePlay,
    handleStop: audioHandleStop,
  } = useAudioFun(currentItem, descriptionLength, safeAdvance, targetLanguage);

  // Procesar el texto cuando cambia
  useEffect(() => {
    if (displayText) {
      const newSentences = splitTextIntoSentences(displayText);
      setSentences(newSentences);
      setCurrentSentenceIndex(0);
    } else {
      setSentences([]);
      setCurrentSentenceIndex(0);
    }
  }, [displayText]);

  // Manejar la transición entre frases
  useEffect(() => {
    if (!isPlaying || sentences.length === 0) return;

    // Limpiar timer anterior si existe
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }

    // Obtener la duración para la frase actual
    const currentSentence = sentences[currentSentenceIndex];
    const duration = calculateSentenceDuration(currentSentence);

    // Configurar timer para la siguiente frase
    sentenceTimerRef.current = setTimeout(() => {
      setCurrentSentenceIndex((prev) => (prev + 1) % sentences.length);
    }, duration);

    // Limpiar al desmontar
    return () => {
      if (sentenceTimerRef.current) {
        clearTimeout(sentenceTimerRef.current);
      }
    };
  }, [isPlaying, sentences, currentSentenceIndex]);

  // Manejo de reproducción con auto-avance
  const handlePlay = useCallback(() => {
    isAutoAdvancing.current = true;
    audioHandlePlay();
  }, [audioHandlePlay]);

  // Manejo de detención con desactivación de auto-avance
  const handleStop = useCallback(() => {
    isAutoAdvancing.current = false;
    audioHandleStop();
    // Limpiar timer al detener
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }
  }, [audioHandleStop]);

  // Navegación al item anterior
  const handlePrev = () => {
    isAutoAdvancing.current = false;
    setCurrentItemIndex((prev) =>
      prev > 0 ? prev - 1 : heritageItems.length - 1
    );
    // Limpiar timer al cambiar
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }
  };

  // Navegación al siguiente item
  const handleNext = () => {
    isAutoAdvancing.current = false;
    setCurrentItemIndex((prev) =>
      prev < heritageItems.length - 1 ? prev + 1 : 0
    );
    // Limpiar timer al cambiar
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }
  };

  // Efecto para reiniciar reproducción al cambiar de item cuando está activo el auto-avance
  useEffect(() => {
    if (isAutoAdvancing.current && heritageItems.length > 0) {
      const timer = setTimeout(() => {
        if (isAutoAdvancing.current) {
          audioHandlePlay();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentItemIndex, heritageItems.length]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: "30px" }}>Simulador de Patrimonio Cultural</h2>

      {/* Selector de longitud de descripción */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select
          value={descriptionLength}
          onChange={(e) =>
            setDescriptionLength(e.target.value as "short" | "extended")
          }
          style={{ padding: "10px", width: "150px" }}
        >
          <option value="short">Descripción Corta</option>
          <option value="extended">Descripción Extendida</option>
        </select>
        <select
          value={targetLanguage}
          onChange={(e) =>
            setTargetLanguage(e.target.value as "fr" | "en" | "es")
          }
          style={{ padding: "10px", width: "150px" }}
        >
          <option value="fr">Francés</option>
          <option value="en">Inglés</option>
          <option value="es">Español</option>
        </select>
      </div>

      {/* Sección para cargar datos JSON */}
      <div style={{ width: "100%", maxWidth: "800px", marginBottom: "20px" }}>
        <h3>Cargar datos de patrimonio (JSON)</h3>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`Pega aquí el JSON con los datos de patrimonio...`}
          style={{
            width: "100%",
            height: "200px",
            padding: "10px",
            fontFamily: "monospace",
            marginBottom: "10px",
          }}
        />

        {jsonError && (
          <div style={{ color: "red", marginBottom: "10px" }}>{jsonError}</div>
        )}

        <button
          onClick={loadHeritageFromJson}
          style={{
            padding: "10px 15px",
            backgroundColor: "#4285f4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cargar JSON
        </button>

        {heritageItems.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <p>
              <strong>{heritageItems.length}</strong> patrimonios cargados
            </p>
          </div>
        )}
      </div>

      {/* Sección de pruebas rápidas */}
      <div style={{ width: "100%", maxWidth: "800px", marginBottom: "20px" }}>
        <h3>Pruebas rápidas</h3>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Texto para probar"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
            }}
          />
          <input
            type="text"
            value={testImageUrl}
            onChange={(e) => setTestImageUrl(e.target.value)}
            placeholder="URL de imagen (opcional)"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
            }}
          />
          <button
            onClick={() => {
              prepareTestItem();
              setTimeout(handlePlay, 100);
            }}
            style={{
              padding: "10px 15px",
              backgroundColor: "#34a853",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Probar
          </button>
        </div>
      </div>

      {/* Controles de navegación entre items */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={handlePrev}
          disabled={heritageItems.length === 0}
          style={{
            padding: "10px 15px",
            fontSize: "20px",
            backgroundColor: "transparent",
            border: "none",
            cursor: heritageItems.length === 0 ? "not-allowed" : "pointer",
            opacity: heritageItems.length === 0 ? 0.5 : 1,
          }}
          title="Anterior"
        >
          ⬅️
        </button>

        <button
          onClick={handleNext}
          disabled={heritageItems.length === 0}
          style={{
            padding: "10px 15px",
            fontSize: "20px",
            backgroundColor: "transparent",
            border: "none",
            cursor: heritageItems.length === 0 ? "not-allowed" : "pointer",
            opacity: heritageItems.length === 0 ? 0.5 : 1,
          }}
          title="Siguiente"
        >
          ➡️
        </button>
      </div>

      {/* Visualizador principal con animaciones */}
      <div
        style={{
          width: "500px",
          height: "300px",
          position: "relative",
          marginBottom: "20px",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#000",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Componente de fondo animado */}
        <BgFun currentItem={currentItem} isPlaying={isPlaying} />

        {/* Avatar y texto cuando está reproduciendo */}
        {isPlaying && (
          <>
            <img
              src={PNG_TUBERS[currentTuber]}
              alt="Avatar"
              style={{
                position: "absolute",
                right: "20px",
                bottom: "20px",
                width: "120px",
                height: "120px",
                objectFit: "contain",
                transition: "transform 0.3s",
                transform: `scale(${progress % 10 < 5 ? 1 : 1.05})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "0",
                left: "0",
                right: "0",
                padding: "10px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "white",
                textAlign: "center",
                minHeight: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sentences.length > 0 && sentences[currentSentenceIndex]}
            </div>
          </>
        )}

        {/* Barra de progreso */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              backgroundColor: "#4285f4",
              transition: "width 0.1s linear",
            }}
          />
        </div>
      </div>

      {/* Controles de reproducción principales */}
      <div style={{ display: "flex", gap: "10px" }}>
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            disabled={heritageItems.length === 0}
            style={{
              padding: "12px 24px",
              backgroundColor: heritageItems.length === 0 ? "#ccc" : "#4285f4",
              color: "white",
              cursor: heritageItems.length === 0 ? "not-allowed" : "pointer",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            ▶️ Reproducir
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              padding: "12px 24px",
              backgroundColor: "#ea4335",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ⏹️ Detener
          </button>
        )}
      </div>
    </div>
  );
};
