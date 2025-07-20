import { useState, useEffect, useRef } from "react";
import { translate } from "./translate";
import { useTTSPlayer, PNG_TUBERS } from "./tts11labs";

interface HeritageDescription {
  local: {
    short: string;
    extended: string;
  };
  english?: {
    short: string;
    extended: string;
  };
}

interface InputHeritageItem {
  identifier: number | string;
  name: string;
  latitude?: number;
  longitude?: number;
  image: string;
  addressProvince?: string;
  addressLocality?: string;
  addressCountry?: string;
  type?: string;
  description: HeritageDescription;
}

interface HeritageItem {
  id: string;
  name: string;
  description: {
    local: {
      short: string;
      extended: string;
    };
  };
  imageUrl: string;
}

const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";

interface TextToVideoProps {
  heritageItems: InputHeritageItem[];
  targetLanguage: "fr" | "en" | "es";
  descriptionLength: "short" | "extended";
}

export const TextToVideo = ({
  heritageItems = [],
  targetLanguage = "es",
  descriptionLength = "extended",
}: TextToVideoProps) => {
  // Mapeamos los items de entrada al formato esperado internamente
  const mappedHeritageItems = heritageItems.map((item) => ({
    id: item.identifier.toString(),
    name: item.name,
    description: {
      local: item.description.local,
    },
    imageUrl: item.image || DEFAULT_IMAGE_URL,
  }));

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const sentenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef(autoAdvance);
  const currentItemRef = useRef(currentItemIndex);
  const heritageItemsRef = useRef(mappedHeritageItems);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
    currentItemRef.current = currentItemIndex;
    heritageItemsRef.current = mappedHeritageItems;
  }, [autoAdvance, currentItemIndex, mappedHeritageItems]);

  const currentItem = mappedHeritageItems[currentItemIndex] || {
    id: "default",
    name: "Patrimonio Cultural",
    description: {
      local: {
        short: "No hay datos disponibles",
        extended: "No hay datos disponibles",
      },
    },
    imageUrl: DEFAULT_IMAGE_URL,
  };

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
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    apiKey: "sk_b79f1163753aac8d1e5f160f1a378a5ecafa59715d38511a",
  });

  useEffect(() => {
    if (isLoadingNext && displayText) {
      const timer = setTimeout(() => {
        if (!isPlaying) {
          handlePlay();
        }
        setIsLoadingNext(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingNext, displayText, isPlaying]);

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

  const handlePlay = () => {
    if (!displayText.trim()) {
      alert("No hay contenido para reproducir");
      return;
    }
    startTTS();
  };

  const handleStop = () => {
    stopTTS();
    setIsLoadingNext(false);
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }
  };

  const handlePrev = () => {
    setCurrentItemIndex((prev) =>
      prev > 0 ? prev - 1 : heritageItems.length - 1
    );
  };

  const handleNext = () => {
    setCurrentItemIndex((prev) =>
      prev < heritageItems.length - 1 ? prev + 1 : 0
    );
  };

  useEffect(() => {
    return () => {
      if (sentenceTimerRef.current) clearTimeout(sentenceTimerRef.current);
    };
  }, []);

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
      <div style={styles.controlsRow}>
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
                transform: `scale(${progress % 10 < 5 ? 1 : 1.05})`,
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
  controlsRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  autoAdvanceButton: {
    padding: "10px 15px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
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
  },
  itemCounter: {
    padding: "5px 10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
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
  },
  playButton: {
    padding: "12px 24px",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
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
  },
};
