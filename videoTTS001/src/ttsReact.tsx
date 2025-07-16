import { useState, useRef, useEffect } from "react";
import { useSpeech } from "react-text-to-speech";

interface TTSError {
  type: "audio" | "synthesis" | "network";
  message: string;
}

interface TTSPlayerState {
  isPlaying: boolean;
  progress: number;
  currentTuber: number;
  error: TTSError | null;
}

interface UseTTSResponse extends TTSPlayerState {
  play: () => void;
  stop: () => void;
}

export const useTTSPlayer = (
  text: string,
  lang: "fr" | "en" | "es",
  onStopCallback?: () => void
): UseTTSResponse => {
  const [playerState, setPlayerState] = useState<TTSPlayerState>({
    isPlaying: false,
    progress: 0,
    currentTuber: 0,
    error: null,
  });

  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const estimatedDurationRef = useRef<number>(0);

  const { start, stop, speechStatus } = useSpeech({
    text,
    lang,
    onStop: () => {
      clearProgressInterval();
      setPlayerState((prev) => ({
        ...prev,
        progress: 100,
        currentTuber: 1, // Cambiado a 1 para usar solo el segundo VTuber al final
        isPlaying: false,
      }));
      onStopCallback?.();
    },
    onError: (error) => {
      setPlayerState((prev) => ({
        ...prev,
        error: {
          type: "synthesis",
          message: `Error en TTS: ${error.message}`,
        },
        isPlaying: false,
      }));
      clearProgressInterval();
    },
  });

  const clearProgressInterval = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    startTimeRef.current = null;
  };

  const play = () => {
    if (!text.trim()) {
      setPlayerState((prev) => ({
        ...prev,
        error: {
          type: "synthesis",
          message: "No hay contenido para reproducir",
        },
      }));
      return;
    }

    clearProgressInterval();

    try {
      start();
      setPlayerState({
        isPlaying: true,
        progress: 0,
        currentTuber: 0,
        error: null,
      });

      const wordCount = text.split(/\s+/).length;
      estimatedDurationRef.current = wordCount / 2.5;
      startTimeRef.current = Date.now();

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
          currentTuber: Math.floor(progress / 50) % 2, // Cambiado para alternar entre 2 VTubers
        }));
      }, 100);
    } catch (error) {
      setPlayerState((prev) => ({
        ...prev,
        error: {
          type: "synthesis",
          message: `Error al iniciar TTS: ${(error as Error).message}`,
        },
        isPlaying: false,
      }));
    }
  };

  const stopPlayer = () => {
    stop();
    clearProgressInterval();
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: false,
      progress: 0,
      currentTuber: 0,
    }));
  };

  useEffect(() => {
    return () => clearProgressInterval();
  }, []);

  useEffect(() => {
    if (speechStatus === "started") {
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    } else if (speechStatus === "stopped") {
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [speechStatus]);

  return {
    ...playerState,
    play,
    stop: stopPlayer,
  };
};

export const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];
