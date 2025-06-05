declare module 'mespeak' {
  interface MeSpeakOptions {
    amplitude?: number;
    wordgap?: number;
    pitch?: number;
    speed?: number;
    variant?: string;
    // Add other options as needed
  }

  interface MeSpeak {
    loadConfig(config: any): void;
    loadVoice(voice: any): void;
    speak(text: string, options?: MeSpeakOptions): void;
    // Add other methods you plan to use
  }

  const meSpeak: MeSpeak;
  export default meSpeak;
}