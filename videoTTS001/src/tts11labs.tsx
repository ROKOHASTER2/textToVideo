import axios from "axios";
import { useState, useRef, useEffect } from "react";
import beardGuy from "./PNGTUBERS/women.webp";
// Definición del tipo de error que puede devolver el TTS
interface TTSError {
  type: "audio" | "synthesis" | "network";
  message: string;
}

// Estado principal del reproductor TTS
interface TTSPlayerState {
  isPlaying: boolean;
  progress: number;
  currentPNGTuber: number;
  error: TTSError | null;
}

// Estado que devuelve el hook, extiende TTSPlayerState e incluye funciones
interface UseTTSResponse extends TTSPlayerState {
  play: () => void;
  stop: () => void;
  toggleAutoAdvance: () => void;
  isAutoAdvancing: boolean;
}

// Opciones que recibe el hook
interface TTSOptions {
  text: string;
  lang?: "fr" | "en" | "es";
  onStop?: () => void;
  voiceId: string;
  apiKey: string;
  model?: "standard" | "multilingual" | "enhanced";
  stability?: number;
  similarityBoost?: number;
  autoAdvance?: boolean;
}

/**
 * Hook principal para reproducir texto a voz usando la API de ElevenLabs.
 * Además, alterna imágenes tipo PNGTuber mientras se reproduce el audio.
 * - Controla el progreso del audio de forma estimada (por palabras).
 * - Alterna entre dos imágenes PNG para simular expresión mientras habla.
 * - Soporta auto-advance, es decir, cuando termina el audio, automáticamente puede avanzar al siguiente bloque de texto si lo integras con un sistema externo.
 * - Gestiona errores de red, de síntesis o de audio.
 */
export function useTTSPlayer(options: TTSOptions): UseTTSResponse {
  const [playerState, setPlayerState] = useState<TTSPlayerState>({
    isPlaying: false,
    progress: 0,
    currentPNGTuber: 0,
    error: null,
  });

  const [isAutoAdvancing, setIsAutoAdvancing] = useState(
    options.autoAdvance || false
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const estimatedDurationRef = useRef<number>(0);
  const isAutoAdvancingRef = useRef(isAutoAdvancing);

  useEffect(() => {
    isAutoAdvancingRef.current = isAutoAdvancing;
  }, [isAutoAdvancing]);
  /**
   * Calcula el índice del PNGTuber actual basado en el progreso y el número de imágenes disponibles
   */
  const getCurrentPNGTuberIndex = (progress: number): number => {
    if (PNG_TUBERS.length <= 1) return 0; // Si solo hay 1 imagen, siempre usa la 0

    const segments = PNG_TUBERS.length;
    const segmentSize = 100 / segments;
    return Math.min(Math.floor(progress / segmentSize), segments - 1);
  };
  /**
   * Limpia el intervalo de progreso y reinicia el tiempo de inicio.
   * Esta función se usa al parar la reproducción o cuando ocurre un error.
   */
  const clearProgressInterval = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    startTimeRef.current = null;
  };

  /**
   * Detiene la reproducción de audio y resetea el estado.
   * También limpia cualquier intervalo de progreso en ejecución.
   */
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearProgressInterval();
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: false,
      progress: 0,
      currentPNGTuber: 0,
    }));
  };

  /**
   * Alterna el modo "auto-advance".
   * Cuando está activado, al terminar el audio automáticamente se puede ejecutar una acción extra (como pasar al siguiente texto).
   */
  const toggleAutoAdvance = () => {
    setIsAutoAdvancing((prev) => !prev);
  };

  /**
   * Función que se ejecuta al finalizar el audio o si ocurre un error durante la reproducción.
   * - Llama al callback `onStop` si se definió.
   * - Si el auto-advance está activado, fuerza el cambio de imagen PNG y completa el progreso al 100%.
   */
  const handleStop = () => {
    stop();
    options.onStop?.();

    if (isAutoAdvancingRef.current) {
      setTimeout(() => {
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: false,
          progress: 100,
          currentPNGTuber: PNG_TUBERS.length > 1 ? PNG_TUBERS.length - 1 : 0,
        }));
      }, 100);
    }
  };

  /**
   * Función principal que envía el texto a ElevenLabs, recibe el audio y lo reproduce.
   * Mientras el audio suena, se estima el progreso en base al número de palabras
   * y se alternan imágenes PNG cada 50% del progreso para simular expresión facial.
   * Maneja posibles errores y soporta distintos modelos de voz.
   */
  const play = async () => {
    if (!options.text.trim()) {
      setPlayerState((prev) => ({
        ...prev,
        error: {
          type: "synthesis",
          message: "No hay contenido para reproducir",
        },
      }));
      return;
    }

    stop(); // Asegura que no haya una reproducción previa activa

    try {
      setPlayerState({
        isPlaying: true,
        progress: 0,
        currentPNGTuber: 0,
        error: null,
      });

      const wordCount = options.text.split(/\s+/).length;
      estimatedDurationRef.current = wordCount / 2.5;
      startTimeRef.current = Date.now();

      // Establece un intervalo para simular el progreso del audio y alternar imágenes
      progressInterval.current = setInterval(() => {
        if (!startTimeRef.current) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const progress = Math.min(
          (elapsed / estimatedDurationRef.current) * 100,
          100
        );

        setPlayerState((prev) => ({
          ...prev,
          progress,
          currentPNGTuber: getCurrentPNGTuberIndex(progress),
        }));
      }, 100);

      // Selecciona el modelo de voz según la opción elegida
      const modelId =
        options.model === "standard"
          ? "eleven_monolingual_v1"
          : options.model === "enhanced"
          ? "eleven_turbo_v2"
          : "eleven_multilingual_v2";

      // Llama a la API de ElevenLabs con las configuraciones elegidas
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}`,
        {
          text: options.text,
          model_id: modelId,
          voice_settings: {
            stability: options.stability ?? 0.7,
            similarity_boost: options.similarityBoost ?? 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            "xi-api-key": options.apiKey,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      // Crea un objeto de audio desde el blob recibido y lo reproduce
      const audioUrl = URL.createObjectURL(response.data);
      audioRef.current = new Audio(audioUrl);

      audioRef.current.addEventListener("ended", handleStop);
      audioRef.current.addEventListener("error", handleStop);

      await audioRef.current.play();
    } catch (error) {
      console.error("Error al reproducir TTS:", error);
      setPlayerState((prev) => ({
        ...prev,
        error: {
          type: "network",
          message: `Error en la API: ${(error as Error).message}`,
        },
        isPlaying: false,
      }));
      clearProgressInterval();
    }
  };

  /**
   * Hook de efecto que se ejecuta al desmontar el componente.
   * Se asegura de parar la reproducción y limpiar los eventos del audio para evitar fugas de memoria.
   */
  useEffect(() => {
    return () => {
      stop();
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleStop);
        audioRef.current.removeEventListener("error", handleStop);
      }
    };
  }, []);

  /**
   * Devuelve el estado y las funciones disponibles al consumir el hook:
   * - play: inicia la reproducción
   * - stop: detiene la reproducción
   * - toggleAutoAdvance: cambia el modo auto avance
   */
  return {
    ...playerState,
    play,
    stop,
    toggleAutoAdvance,
    isAutoAdvancing,
  };
}

/**
 * Lista de URLs de imágenes PNG para alternar mientras el personaje habla.
 * Esto simula un PNGTuber cambiando de expresión durante la lectura del texto.
 */
export const PNG_TUBERS = [beardGuy];
