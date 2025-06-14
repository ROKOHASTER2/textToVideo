import * as sdk from "microsoft-cognitiveservices-speech-sdk";

// Configuration - you might want to move these to environment variables
const SPEECH_KEY = "6rnaBstGq8ZxIF1g1b5MRMPNCE1E1HEUDHlsC8IRvzUDM0fcCoiSJQQJ99BFAC5RqLJXJ3w3AAAYACOGxUsU";
const SPEECH_REGION = "westeurope";
const DEFAULT_VOICE = "es-ES-ElviraNeural";

let synthesizer: sdk.SpeechSynthesizer | null = null;

// Initialize the TTS system (similar to loadMeSpeak but for MS Cognitive Services)
export async function loadMeSpeak(language: string = "en"): Promise<boolean> {
    // For MS Cognitive Services, initialization is lightweight
    // We just validate credentials here
    try {
        const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
        speechConfig.speechSynthesisVoiceName = getVoiceForLanguage(language);
        return true;
    } catch (error) {
        console.error("Failed to initialize Microsoft Cognitive Services TTS:", error);
        return false;
    }
}

// Helper function to select appropriate voice based on language
function getVoiceForLanguage(language: string): string {
    const voices: Record<string, string> = {
        "en": "en-US-JennyNeural",
        "es": "es-ES-AlvaroNeural",
        "fr": "fr-FR-DeniseNeural",
        "de": "de-DE-KatjaNeural",
        "it": "it-IT-ElsaNeural",
        "ja": "ja-JP-NanamiNeural",
        "zh": "zh-CN-XiaoxiaoNeural"
    };
    
    return voices[language] || DEFAULT_VOICE;
}

// Main text-to-speech function
export async function textToSpeech(text: string, language: string = "en"): Promise<string> {
    return new Promise((resolve, reject) => {
        const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
        speechConfig.speechSynthesisVoiceName = getVoiceForLanguage(language);
        
        // We'll output to a blob rather than a file
        const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
        
        synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
        
        synthesizer.speakTextAsync(
            text,
            result => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    // For MS Cognitive Services, we need to handle the audio data differently
                    // since we're not saving to a file
                    const audioData = result.audioData;
                    const audioBlob = new Blob([audioData], { type: "audio/wav" });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    resolve(audioUrl);
                } else {
                    reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
                }
                synthesizer?.close();
                synthesizer = null;
            },
            error => {
                console.error("Error in speech synthesis:", error);
                synthesizer?.close();
                synthesizer = null;
                reject(error);
            }
        );
    });
}

// Cleanup function
export function cleanup() {
    if (synthesizer) {
        synthesizer.close();
        synthesizer = null;
    }
}