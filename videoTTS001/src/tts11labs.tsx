import axios from "axios";
import { useState, useRef, useEffect } from "react";

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
  toggleAutoAdvance: () => void;
  isAutoAdvancing: boolean;
}

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

export function useTTSPlayer(options: TTSOptions): UseTTSResponse {
  const [playerState, setPlayerState] = useState<TTSPlayerState>({
    isPlaying: false,
    progress: 0,
    currentTuber: 0,
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

  const clearProgressInterval = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    startTimeRef.current = null;
  };

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
      currentTuber: 0,
    }));
  };

  const toggleAutoAdvance = () => {
    setIsAutoAdvancing((prev) => !prev);
  };

  const handleStop = () => {
    stop();
    options.onStop?.();

    if (isAutoAdvancingRef.current) {
      setTimeout(() => {
        setPlayerState((prev) => ({
          ...prev,
          isPlaying: false,
          progress: 100,
          currentTuber: 1,
        }));
      }, 100);
    }
  };

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

    stop(); // Detener cualquier reproducción previa

    try {
      setPlayerState({
        isPlaying: true,
        progress: 0,
        currentTuber: 0,
        error: null,
      });

      const wordCount = options.text.split(/\s+/).length;
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
          currentTuber: Math.floor(progress / 50) % 2,
        }));
      }, 100);

      const modelId =
        options.model === "standard"
          ? "eleven_monolingual_v1"
          : options.model === "enhanced"
          ? "eleven_turbo_v2"
          : "eleven_multilingual_v2";

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

  useEffect(() => {
    return () => {
      stop();
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleStop);
        audioRef.current.removeEventListener("error", handleStop);
      }
    };
  }, []);

  return {
    ...playerState,
    play,
    stop,
    toggleAutoAdvance,
    isAutoAdvancing,
  };
}

export const PNG_TUBERS = [
  "https://facturacion-electronica.ec/wp-content/uploads/2019/04/scratching_head_pc_800_clr_2723.png",
  "https://pbs.twimg.com/media/BqQ5S0iCQAACkRA.png",
];
