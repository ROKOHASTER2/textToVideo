import { useState } from "react";
import { translateText } from "./utils";

const useSpeechSync = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translatedText, setTranslatedText] = useState("");

  const playSentence = async (text: string, language: string) => {
    setIsSpeaking(true);
    try {
      const translated = await translateText(text, language);
      setTranslatedText(translated);

      const utterance = new SpeechSynthesisUtterance(translated);
      utterance.lang = language;
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  };

  return { playSentence, isSpeaking, translatedText };
};

export default useSpeechSync;
