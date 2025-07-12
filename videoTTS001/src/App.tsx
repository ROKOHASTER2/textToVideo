import React, { useState, useEffect, useRef } from "react";
import { useSpeech } from "react-text-to-speech";

const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";
const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];

const SUPPORTED_TTS_LANGUAGES = {
  es: "es-ES",
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  ja: "ja-JP",
  ru: "ru-RU",
  zh: "zh-CN",
  ar: "ar-SA",
};

type LanguageCode = keyof typeof SUPPORTED_TTS_LANGUAGES;

// Tipo para datos de patrimonio
interface HeritageDescription {
  local: {
    short: string;
    extended: string;
  };
  english: {
    short: string;
    extended: string;
  };
}

interface HeritageItem {
  id: string;
  name: string;
  description: HeritageDescription;
  imageUrl: string;
}

const App = () => {
  // Estados para gestión multi-heritage
  const [heritageItems, setHeritageItems] = useState<HeritageItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [jsonInput, setJsonInput] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState<
    "short" | "extended"
  >("extended");

  // Estados principales
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("es");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTuber, setCurrentTuber] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const autoAdvancing = useRef(false);

  // Obtener el elemento actual
  const currentItem = heritageItems[currentItemIndex] || {
    id: "default",
    name: "Patrimonio Cultural",
    description: {
      local: {
        short: "Ingrese un JSON válido para comenzar",
        extended: "Ingrese un JSON válido para comenzar",
      },
      english: {
        short: "Please enter valid JSON data",
        extended: "Please enter valid JSON data",
      },
    },
    imageUrl: "",
  };

  // Obtener texto a mostrar según idioma y longitud
  const displayText =
    currentLanguage === "es"
      ? currentItem.description.local[descriptionLength]
      : currentItem.description.english[descriptionLength];

  // Función para cargar JSON
  const loadHeritageFromJson = () => {
    try {
      setJsonError(null);
      const parsedItems = JSON.parse(jsonInput);

      if (!Array.isArray(parsedItems)) {
        throw new Error("El JSON debe ser un array de objetos");
      }

      const validatedItems = parsedItems.map((item, index) => ({
        id: item.identifier?.toString() || `item-${index}`,
        name: item.name || `Patrimonio ${index + 1}`,
        description: {
          local: item.description?.local || { short: "", extended: "" },
          english: item.description?.english || { short: "", extended: "" },
        },
        imageUrl: item.image || "",
      }));

      setHeritageItems(validatedItems);
      setCurrentItemIndex(0);
    } catch (error: any) {
      setJsonError(`Error en el JSON: ${error.message}`);
      console.error("Error parsing JSON:", error);
    }
  };

  // Configuración de TTS
  const { start, stop, speechStatus } = useSpeech({
    text: displayText,
    lang: SUPPORTED_TTS_LANGUAGES[currentLanguage],
  });

  // Reproducir automáticamente al cambiar de item
  useEffect(() => {
    if (autoAdvancing.current && heritageItems.length > 0) {
      handlePlay();
      autoAdvancing.current = false;
    }
  }, [currentItemIndex]);

  // Manejar fin de reproducción y avanzar automáticamente
  useEffect(() => {
    setIsPlaying(speechStatus === "started");

    if (speechStatus === "stopped" && progress === 100) {
      if (currentItemIndex < heritageItems.length - 1) {
        autoAdvancing.current = true;
        setCurrentItemIndex(currentItemIndex + 1);
      }
    }
  }, [speechStatus, progress]);

  // Funciones de reproducción
  const handlePlay = () => {
    if (
      !displayText.trim() ||
      displayText === "Ingrese un JSON válido para comenzar"
    ) {
      alert("No hay contenido para reproducir");
      return;
    }

    const duration = Math.max(displayText.split(" ").length / 2, 3);
    const sentenceEnds = [...displayText.matchAll(/[.!?]/g)].map(
      (m) => m.index!
    );
    setProgress(0);
    setCurrentTuber(0);

    progressInterval.current && clearInterval(progressInterval.current);

    let elapsed = 0;
    progressInterval.current = setInterval(() => {
      elapsed += 0.1;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);

      const currentChar = Math.floor(
        (displayText.length * currentProgress) / 100
      );
      sentenceEnds.forEach((endPos, index) => {
        if (
          currentChar >= endPos &&
          currentTuber === index % PNG_TUBERS.length
        ) {
          setCurrentTuber((index + 1) % PNG_TUBERS.length);
        }
      });
    }, 100);

    start();
  };

  const handleStop = () => {
    stop();
    setProgress(0);
    setCurrentTuber(0);
    progressInterval.current && clearInterval(progressInterval.current);
  };

  // Limpieza
  useEffect(() => {
    return () => {
      progressInterval.current && clearInterval(progressInterval.current);
    };
  }, []);

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

      {/* Selector de idioma y longitud */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select
          value={currentLanguage}
          onChange={(e) => setCurrentLanguage(e.target.value as LanguageCode)}
          style={{ padding: "10px", width: "150px" }}
        >
          {Object.entries(SUPPORTED_TTS_LANGUAGES).map(([code, lang]) => (
            <option key={code} value={code}>
              {lang.split("-")[0].toUpperCase()}
            </option>
          ))}
        </select>

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
      </div>

      {/* Entrada de JSON */}
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

      {/* Selector de patrimonio actual */}
      {heritageItems.length > 0 && (
        <div style={{ width: "100%", maxWidth: "800px", marginBottom: "20px" }}>
          <h3>Seleccionar patrimonio</h3>
          <select
            value={currentItemIndex}
            onChange={(e) => setCurrentItemIndex(Number(e.target.value))}
            style={{ width: "100%", padding: "10px" }}
          >
            {heritageItems.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Visualizador */}
      <div
        style={{
          width: "500px",
          height: "300px",
          position: "relative",
          marginBottom: "20px",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <img
          src={currentItem.imageUrl || DEFAULT_IMAGE_URL}
          alt="Background"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: isPlaying ? 1 : 0.7,
            transition: "opacity 0.3s",
          }}
          onError={(e) => (e.currentTarget.src = DEFAULT_IMAGE_URL)}
        />

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
              }}
            >
              {displayText.substring(
                0,
                Math.floor((displayText.length * progress) / 100)
              )}
            </div>
          </>
        )}

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
            }}
          >
            Reproducir
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              padding: "12px 24px",
              backgroundColor: "#ea4335",
              color: "white",
            }}
          >
            Detener
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
