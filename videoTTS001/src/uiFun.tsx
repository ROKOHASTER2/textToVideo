import { useCallback, useEffect } from "react";
import { useCtrlFun } from "./ctrlFun";
import { useAudioFun } from "./audioFun";
import { BgFun, PNG_TUBERS } from "./bgFun";

export const UiFun = () => {
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

  const {
    isPlaying,
    progress,
    currentTuber,
    displayText,
    handlePlay: audioHandlePlay,
    handleStop: audioHandleStop,
  } = useAudioFun(currentItem, descriptionLength, safeAdvance);

  const handlePlay = useCallback(() => {
    isAutoAdvancing.current = true;
    audioHandlePlay();
  }, [audioHandlePlay]);

  const handleStop = useCallback(() => {
    isAutoAdvancing.current = false;
    audioHandleStop();
  }, [audioHandleStop]);

  const handlePrev = () => {
    isAutoAdvancing.current = false;
    setCurrentItemIndex((prev) =>
      prev > 0 ? prev - 1 : heritageItems.length - 1
    );
  };

  const handleNext = () => {
    isAutoAdvancing.current = false;
    setCurrentItemIndex((prev) =>
      prev < heritageItems.length - 1 ? prev + 1 : 0
    );
  };

  // Efecto para manejar la reproducción automática
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlaying && isAutoAdvancing.current) {
      // Preparamos para el siguiente item cuando esté cerca del final
      if (progress > 90) {
        timer = setTimeout(() => {
          if (isAutoAdvancing.current && heritageItems.length > 1) {
            setCurrentItemIndex((prev) =>
              prev < heritageItems.length - 1 ? prev + 1 : 0
            );
          }
        }, 100);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [progress, isPlaying, heritageItems.length]);

  // Efecto para iniciar reproducción al cambiar de item
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

      {/* Selector de longitud */}
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

      {/* Campo de prueba - Texto e Imagen */}
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

      {/* Controles de navegación con emojis a los lados */}
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
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        }}
      >
        <BgFun currentItem={currentItem} isPlaying={isPlaying} />

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
