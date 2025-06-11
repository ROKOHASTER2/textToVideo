declare global {
  interface Window { meSpeak: any; }
}

const langMap: Record<string, string> = {
  en: "voices/en/en.json",
  es: "voices/es.json",
  fr: "voices/fr.json",
  zh: "voices/zh.json"
};

export const loadMeSpeak = (language: string = "en"): Promise<boolean> => {
  return new Promise((resolve) => {
    const voicePath = langMap[language] || langMap.en;
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mespeak/mespeak.min.js";
    script.async = true;
    script.onload = () => {
      if (window.meSpeak) {
        window.meSpeak.loadConfig("https://cdn.jsdelivr.net/npm/mespeak/mespeak_config.json");
        window.meSpeak.loadVoice(`https://cdn.jsdelivr.net/npm/mespeak/${voicePath}`, () => resolve(true));
      } else {
        console.error("meSpeak no se cargó correctamente");
        resolve(false);
      }
    };
    script.onerror = () => {
      console.error("Error al cargar mespeak.js");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const textToSpeech = async (text: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!window.meSpeak) {
      console.error("meSpeak no está disponible");
      return resolve("");
    }
    try {
      const audioData = window.meSpeak.speak(text, {
        rawdata: "arraybuffer",
        amplitude: 90,
        wordgap: 1,
        pitch: 50,
        speed: 150,
        variant: "f2",
      });
      if (!audioData) {
        console.error("Error al generar audio");
        return resolve("");
      }
      resolve(URL.createObjectURL(new Blob([audioData], { type: "audio/wav" })));
    } catch (error) {
      console.error("Error en textToSpeech:", error);
      resolve("");
    }
  });
};
