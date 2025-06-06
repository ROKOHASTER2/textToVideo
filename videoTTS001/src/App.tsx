// VideoGenerator.tsx
import React, { useState, useRef, useEffect } from "react";
import { textToSpeech, loadMeSpeak } from "./TTSManager";

const VideoGenerator: React.FC = () => {
  const [text, setText] = useState("Hello world");
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [meSpeakReady, setMeSpeakReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cargar meSpeak desde CDN
  useEffect(() => {
    loadMeSpeak().then((success) => {
      setMeSpeakReady(success);
      if (!success) {
        setStatus("Error loading speech engine");
      }
    });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getAudioDuration = (blob: Blob): number => {
    return text.length * 150; // estimación simple
  };

  const createAudioStream = async (blob: Blob): Promise<MediaStream> => {
    const audioContext = audioContextRef.current || new AudioContext();
    audioContextRef.current = audioContext;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const destination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.start();

    return destination.stream;
  };

  const createVideoWithAudio = async (imageUrl: string, audioUrl: string) => {
    setStatus("Creating video...");

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve) => (img.onload = resolve));

    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];

    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();
    const audioStream = await createAudioStream(audioBlob);
    const audioTrack = audioStream.getAudioTracks()[0];

    const combinedStream = new MediaStream([videoTrack, audioTrack]);

    mediaRecorderRef.current = new MediaRecorder(combinedStream, {
      mimeType: "video/webm;codecs=vp9",
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
    });

    const videoChunks: BlobPart[] = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunks.push(e.data);
      }
    };

    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: "video/webm" });
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
        setStatus("Video created successfully!");
        resolve(url);
      };

      const drawFrame = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      mediaRecorderRef.current!.start(100);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, getAudioDuration(audioBlob));
    });
  };

  const handleGenerateVideo = async () => {
    if (!image) {
      setStatus("Please upload an image first");
      return;
    }

    try {
      setStatus("Generating audio...");
      const audioUrlGenerated = await textToSpeech(text);
      if (!audioUrlGenerated) {
        setStatus("Failed to generate audio");
        return;
      }
      setAudioUrl(audioUrlGenerated);

      await createVideoWithAudio(image, audioUrlGenerated);
    } catch (error) {
      console.error("Error generating video:", error);
      setStatus("Error generating video");
    }
  };

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [videoUrl, audioUrl]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1>Text to Video Generator</h1>

      <label htmlFor="text-input" style={{ display: "block", marginBottom: 8 }}>
        Enter Text:
      </label>
      <textarea
        id="text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8, marginBottom: 20 }}
      />

      <label htmlFor="image-upload" style={{ display: "block", marginBottom: 8 }}>
        Upload Background Image:
      </label>
      <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} />

      <button
        onClick={handleGenerateVideo}
        disabled={!meSpeakReady || status.includes("Generating")}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          backgroundColor: !meSpeakReady || status.includes("Generating") ? "#ccc" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: !meSpeakReady || status.includes("Generating") ? "default" : "pointer",
          fontSize: 16,
        }}
      >
        {!meSpeakReady ? "Loading speech engine..." : status.includes("Generating") ? "Processing..." : "Generate Video"}
      </button>

      {status && (
        <p style={{ marginTop: 20, color: status.includes("success") ? "green" : "red" }}>{status}</p>
      )}

      {videoUrl && (
        <video controls src={videoUrl} style={{ width: "100%", marginTop: 20 }} />
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default VideoGenerator;
