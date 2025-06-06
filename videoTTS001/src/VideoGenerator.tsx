import React, { useState, useRef, useEffect } from "react";
import { VideoGeneratorLogic } from "./VideoGeneratorLogic";

const VideoGenerator: React.FC = () => {
  const [text, setText] = useState("Hello world");
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [language, setLanguage] = useState("en"); // Default to English

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoGeneratorRef = useRef(new VideoGeneratorLogic());

  useEffect(() => {
    videoGeneratorRef.current.initialize(language).then((success) => {
      if (!success) {
        setStatus("Error loading speech engine");
      }
    });
  }, [language]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    const imageUrl = await videoGeneratorRef.current.handleImageUpload(file);
    setImage(imageUrl);
  };

  const handleGenerateVideo = async () => {
    if (!image) {
      setStatus("Please upload an image first");
      return;
    }

    if (!canvasRef.current) return;

    try {
      setStatus("Generating audio...");
      const audioUrlGenerated = await videoGeneratorRef.current.generateAudio(text);
      if (!audioUrlGenerated) {
        setStatus("Failed to generate audio");
        return;
      }
      setAudioUrl(audioUrlGenerated);

      setStatus("Creating video...");
      const videoUrl = await videoGeneratorRef.current.createVideoWithAudio(
        canvasRef.current,
        image,
        audioUrlGenerated,
        text
      );
      setVideoUrl(videoUrl);
      setStatus("Video created successfully!");
    } catch (error) {
      console.error("Error generating video:", error);
      setStatus("Error generating video");
    }
  };

  useEffect(() => {
    return () => {
      const urls = [];
      if (videoUrl) urls.push(videoUrl);
      if (audioUrl) urls.push(audioUrl);
      videoGeneratorRef.current.cleanup(urls);
    };
  }, [videoUrl, audioUrl]);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1>Tonacho</h1>

      <div style={{ marginBottom: 20 }}>
        <label htmlFor="language-select" style={{ display: 'block', marginBottom: 8 }}>
          Select Language:
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label htmlFor="text-input" style={{ display: 'block', marginBottom: 8 }}>
          Enter Text:
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{ 
            width: "100%", 
            padding: 8, 
            borderRadius: 4,
            border: '1px solid #ccc'
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label htmlFor="image-upload" style={{ display: 'block', marginBottom: 8 }}>
          Upload Background Image:
        </label>
        <input 
          id="image-upload" 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          style={{ display: 'block' }}
        />
      </div>

      <button
        onClick={handleGenerateVideo}
        disabled={!videoGeneratorRef.current.isMeSpeakReady() || status.includes("Generating")}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          backgroundColor: !videoGeneratorRef.current.isMeSpeakReady() || status.includes("Generating") ? "#ccc" : "#4caf50",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: !videoGeneratorRef.current.isMeSpeakReady() || status.includes("Generating") ? "default" : "pointer",
          fontSize: 16,
          width: '100%'
        }}
      >
        {!videoGeneratorRef.current.isMeSpeakReady()
          ? "Loading speech engine..."
          : status.includes("Generating")
          ? "Processing..."
          : "Generate Video"}
      </button>

      {status && (
        <p style={{ 
          marginTop: 20, 
          color: status.includes("success") ? "green" : "red",
          textAlign: 'center'
        }}>
          {status}
        </p>
      )}

      {videoUrl && (
        <div style={{ marginTop: 20 }}>
          <video 
            controls 
            src={videoUrl} 
            style={{ 
              width: "100%", 
              borderRadius: 4,
              border: '1px solid #ccc'
            }} 
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default VideoGenerator;