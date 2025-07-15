import { useState, useEffect, useRef, useCallback } from "react";
import { useSpeech } from "react-text-to-speech";
import type { HeritageItem } from "./ctrlFun";
import { PNG_TUBERS } from "./bgFun";

export const useAudioFun = (
  currentItem: HeritageItem,
  descriptionLength: "short" | "extended",
  onNextRequested?: () => void // Nueva prop para solicitar el siguiente item
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTuber, setCurrentTuber] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const estimatedDurationRef = useRef<number>(0);
  const onFinishedCallback = useRef<(() => void) | null>(null);

  const displayText = currentItem.description.local[descriptionLength];

  const { start, stop, speechStatus } = useSpeech({
    text: displayText,
    lang: "es-ES",
    onStop: () => {
      if (onFinishedCallback.current) {
        onFinishedCallback.current();
      }
      // Llamar a la función para pasar al siguiente item
      if (onNextRequested) {
        onNextRequested();
      }
    },
  });

  const handlePlay = useCallback(
    (onFinished?: () => void) => {
      if (
        !displayText.trim() ||
        displayText === "Ingrese un JSON válido para comenzar"
      ) {
        alert("No hay contenido para reproducir");
        return;
      }

      onFinishedCallback.current = onFinished || null;

      const wordCount = displayText.split(/\s+/).length;
      estimatedDurationRef.current = wordCount / 2.5;
      startTimeRef.current = Date.now();

      setProgress(0);
      setCurrentTuber(0);

      progressInterval.current && clearInterval(progressInterval.current);

      progressInterval.current = setInterval(() => {
        if (!startTimeRef.current) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const currentProgress = Math.min(
          (elapsed / estimatedDurationRef.current) * 100,
          100
        );
        setProgress(currentProgress);

        const currentChar = Math.floor(
          (displayText.length * currentProgress) / 100
        );
        const sentenceEnds = [...displayText.matchAll(/[.!?]/g)].map(
          (m) => m.index!
        );
        sentenceEnds.forEach((endPos, index) => {
          if (
            currentChar >= endPos &&
            currentTuber === index % PNG_TUBERS.length
          ) {
            setCurrentTuber((index + 1) % PNG_TUBERS.length);
          }
        });

        if (currentProgress >= 100) {
          progressInterval.current && clearInterval(progressInterval.current);
          if (onFinishedCallback.current) {
            onFinishedCallback.current();
          }
        }
      }, 100);

      onFinishedCallback.current = onFinished || null;
      start();
    },
    [displayText, currentTuber]
  );

  const handleStop = useCallback(() => {
    stop();
    setProgress(0);
    setCurrentTuber(0);
    startTimeRef.current = null;
    progressInterval.current && clearInterval(progressInterval.current);
    onFinishedCallback.current = null;
  }, [stop]);

  useEffect(() => {
    setIsPlaying(speechStatus === "started");

    if (speechStatus === "stopped") {
      if (progress >= 95 && onFinishedCallback.current) {
        onFinishedCallback.current();
      }
      startTimeRef.current = null;
      progressInterval.current && clearInterval(progressInterval.current);
    }
  }, [speechStatus, progress]);

  useEffect(() => {
    return () => {
      progressInterval.current && clearInterval(progressInterval.current);
    };
  }, []);

  return {
    isPlaying,
    progress,
    currentTuber,
    displayText,
    handlePlay,
    handleStop,
  };
};
