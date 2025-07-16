import { useState, useEffect, useRef, useCallback } from "react";
import { useSpeech } from "react-text-to-speech";
import type { HeritageItem } from "./ctrlFun";
import { PNG_TUBERS } from "./bgFun";
import { translate } from "./translate";
/*
  Cada objeto debe tener las siguientes propiedades:

  - identifier: ID numérico único del elemento.
  - name: Nombre del lugar o elemento patrimonial.
  - latitude / longitude: Coordenadas geográficas.
  - image: URL de una imagen ilustrativa (no puede ser null).
  - addressProvince / addressLocality / addressCountry: Información geográfica detallada.
  - type: Tipo de patrimonio ("Cultural", "Natural" o "Intangible").
  - description: Objeto con descripciones en dos idiomas:
      - local: Descripción en el idioma original del lugar (campos 'short' y 'extended').
      - english: Traducción al inglés (campos 'short' y 'extended').

*/

/**
 * Hook personalizado para manejar la reproducción de audio y progreso visual
 * @param currentItem - El elemento actual del patrimonio que contiene las descripciones
 * @param descriptionLength - Longitud de la descripción a usar ('short' o 'extended')
 * @param onNextRequested - Callback opcional para solicitar el siguiente elemento
 * @returns Objeto con el estado y funciones de control de reproducción
 */
export const useAudioFun = (
  currentItem: HeritageItem,
  descriptionLength: "short" | "extended",
  onNextRequested?: () => void,
  targetLanguage: "fr" | "en" | "es" = "es" // Add this parameter with default value
) => {
  // Estado para controlar si el audio está reproduciéndose
  const [isPlaying, setIsPlaying] = useState(false);
  // Estado para el progreso visual (0-100)
  const [progress, setProgress] = useState(0);
  // Estado para la imagen actual del "tuber" (personaje) a mostrar
  const [currentTuber, setCurrentTuber] = useState(0);
  // Refs para mantener valores entre renders sin causar rerenders
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // Duración estimada para el progreso visual basado en conteo de palabras
  const estimatedVisualDurationRef = useRef<number>(0);
  // Callback para ejecutar cuando termina la reproducción
  const onFinishedCallback = useRef<(() => void) | null>(null);

  //Esta usando local como base, hay que cambiarlo .
  const [displayText, setDisplayText] = useState<string>(
    currentItem.description.local[descriptionLength]
  );
  const local = "es";
  useEffect(() => {
    const translateText = async () => {
      const text = currentItem.description.local[descriptionLength];
      if (text) {
        // Only translate if target language is not (original language)
        const translatedText =
          targetLanguage === local
            ? text
            : await translate(text, targetLanguage);
        setDisplayText(translatedText);
      }
    };

    translateText();
  }, [currentItem, descriptionLength, targetLanguage]); // Add targetLanguage to dependencies

  // Configuración del hook de texto a voz
  const { start, stop, speechStatus } = useSpeech({
    text: displayText,
    lang: targetLanguage,
    onStop: () => {
      // Se ejecuta cuando el audio termina naturalmente
      if (onFinishedCallback.current) {
        onFinishedCallback.current();
      }
      // Solicita el siguiente elemento si existe el callback
      if (onNextRequested) {
        onNextRequested();
      }
      // Limpia el intervalo y completa el progreso
      clearProgressInterval();
      setProgress(100);
      // Muestra la última imagen del tuber
      setCurrentTuber(PNG_TUBERS.length - 1);
    },
  });

  /**
   * Limpia el intervalo de progreso si existe
   */
  const clearProgressInterval = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  /**
   * Maneja la reproducción del audio
   * @param onFinished - Callback opcional a ejecutar al terminar
   */
  const handlePlay = useCallback(
    (onFinished?: () => void) => {
      // Validación para texto vacío o no válido
      if (
        !displayText.trim() ||
        displayText === "Ingrese un JSON válido para comenzar"
      ) {
        alert("No hay contenido para reproducir");
        return;
      }

      // Guarda el callback para ejecutarlo al terminar
      onFinishedCallback.current = onFinished || null;

      // Calcula duración estimada basada en conteo de palabras (2.5 palabras/segundo)
      const wordCount = displayText.split(/\s+/).length;
      estimatedVisualDurationRef.current = wordCount / 2.5;

      // Inicializa el tiempo de inicio y estados
      startTimeRef.current = Date.now();
      setProgress(0);
      setCurrentTuber(0);

      // Limpia cualquier intervalo previo
      clearProgressInterval();

      // Configura un nuevo intervalo para actualizar el progreso visual
      progressInterval.current = setInterval(() => {
        if (!startTimeRef.current) return;

        // Calcula el progreso basado en el tiempo transcurrido
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const currentProgress = Math.min(
          (elapsed / estimatedVisualDurationRef.current) * 100,
          100
        );
        setProgress(currentProgress);

        // Encuentra los finales de oración para cambiar la imagen del tuber
        const sentenceEnds = [...displayText.matchAll(/[.!?]/g)].map(
          (m) => m.index!
        );

        // Cambia la imagen del tuber según el progreso en las oraciones
        sentenceEnds.forEach((endPos, index) => {
          if (currentProgress >= (endPos / displayText.length) * 100) {
            setCurrentTuber((index + 1) % PNG_TUBERS.length);
          }
        });
      }, 100); // Actualiza cada 100ms

      // Inicia la reproducción del audio
      start();
    },
    [displayText, start]
  );

  /**
   * Maneja la detención del audio
   */
  const handleStop = useCallback(() => {
    stop(); // Detiene la reproducción
    setProgress(0); // Reinicia el progreso
    setCurrentTuber(0); // Vuelve al primer tuber
    startTimeRef.current = null; // Limpia el tiempo de referencia
    clearProgressInterval(); // Limpia el intervalo
    onFinishedCallback.current = null; // Limpia el callback
  }, [stop]);

  // Efecto para sincronizar el estado de reproducción con speechStatus
  useEffect(() => {
    setIsPlaying(speechStatus === "started");

    if (speechStatus === "stopped") {
      // Limpia cuando el audio se detiene
      startTimeRef.current = null;
      clearProgressInterval();
    }
  }, [speechStatus]);

  // Efecto de limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      clearProgressInterval();
    };
  }, []);

  // Retorna el estado y las funciones de control
  return {
    isPlaying,
    progress,
    currentTuber,
    displayText: displayText, // Texto completo para mostrar
    handlePlay,
    handleStop,
  };
};
