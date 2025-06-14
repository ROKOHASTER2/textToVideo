import { textToSpeech, loadMeSpeak } from "./TTSManager";

export class VideoGeneratorLogic {
  private meSpeakReady = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;

  private language = "en";        
  async initialize(language: string = "en") {
    this.language = language;           // store it
    this.meSpeakReady = await loadMeSpeak(language);
    return this.meSpeakReady;
  }
  isMeSpeakReady() {
    return this.meSpeakReady;
  }

  handleImageUpload(file: File | null): Promise<string | null> {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  private getAudioDuration(text: string): number {
    return text.length * 100;
  }

  private async createAudioStream(blob: Blob): Promise<MediaStream> {
    this.audioContext = this.audioContext || new AudioContext();
    const buffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(buffer);
    const destination = this.audioContext.createMediaStreamDestination();
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.start();
    return destination.stream;
  }

  async createVideoWithAudio(canvas: HTMLCanvasElement, imageUrl: string, audioUrl: string, text: string): Promise<string> {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    canvas.width = 800;
    canvas.height = 600;

    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve) => (img.onload = resolve));

    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];

    const audioBlob = await (await fetch(audioUrl)).blob();
    const audioTrack = (await this.createAudioStream(audioBlob)).getAudioTracks()[0];
    const combinedStream = new MediaStream([videoTrack, audioTrack]);

    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm;codecs=vp9",
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
    });

    const videoChunks: BlobPart[] = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunks.push(e.data);
    };

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: "video/webm" });
        resolve(URL.createObjectURL(videoBlob));
      };

      const drawFrame = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      this.mediaRecorder!.start(100);
      setTimeout(() => {
        if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
      }, this.getAudioDuration(text));
    });
  }

  async generateAudio(text: string): Promise<string | null> {
  return await textToSpeech(text, this.language);
}
  async createVideoLINK(imageUrl: string, text: string): Promise<string> {
  if (!this.meSpeakReady) {
    throw new Error("TTS engine not initialized. Call initialize() first.");
  }

    const audioUrl = await textToSpeech(text, this.language);
  if (!audioUrl) throw new Error("Failed to generate audio from text.");

  const canvas = document.createElement("canvas");

  return await this.createVideoWithAudio(canvas, imageUrl, audioUrl, text);
}


  cleanup(urls: string[]) {
    urls.forEach(url => URL.revokeObjectURL(url));
  }
}
