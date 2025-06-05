import React, { useState, useRef, useEffect } from 'react';
declare global {
  interface Window {
    meSpeak: any;
  }
}
// DEFINICION DE VARIABLES
const VideoGenerator: React.FC = () => {
  const [text, setText] = useState<string>("Hello world");
  const [status, setStatus] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [meSpeakReady, setMeSpeakReady] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meSpeakRef = useRef<any>(null);

  // Load meSpeak library
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mespeak/mespeak.min.js";
    script.async = true;

    script.onload = () => {
      if (!window.meSpeak) {
        setStatus("meSpeak failed to load");
        return;
      }
      window.meSpeak.loadConfig(
        "https://cdn.jsdelivr.net/npm/mespeak/mespeak_config.json"
      );
      window.meSpeak.loadVoice(
        "https://cdn.jsdelivr.net/npm/mespeak/voices/en/en.json"
      );
      meSpeakRef.current = window.meSpeak;
      setMeSpeakReady(true);
    };

    script.onerror = () => {
      setStatus("Error loading meSpeak script");
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Text-to-speech using meSpeak
  const textToSpeech = async (text: string): Promise<string> => {
    return new Promise((resolve) => {
      setStatus("Generating audio...");
      
      if (!meSpeakReady) {
        setStatus("Speech engine is still loading, please wait...");
        return resolve("");
      }

      try {
        const audioData = meSpeakRef.current.speak(text, {
          rawdata: "arraybuffer",
          amplitude: 90,
          wordgap: 1,
          pitch: 50,
          speed: 150,
          variant: "f2",
        });

        if (!audioData) {
          setStatus("Failed to generate audio");
          return resolve("");
        }

        const blob = new Blob([audioData], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        resolve(url);
      } catch (error) {
        console.error("Error generating audio:", error);
        setStatus("Error generating audio");
        resolve("");
      }
    });
  };

  // Create video from image and audio
  const createVideoWithAudio = async (imageUrl: string, audioUrl: string) => {
    setStatus("Creating video...");
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 600;
    
    // Draw image to canvas
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    
    // Create video stream from canvas
    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    
    // Get audio stream
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();
    const audioStream = await createAudioStream(audioBlob);
    const audioTrack = audioStream.getAudioTracks()[0];
    
    // Combine streams
    const combinedStream = new MediaStream([videoTrack, audioTrack]);
    mediaRecorderRef.current = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9',
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000
    });
    
    const videoChunks: BlobPart[] = [];
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunks.push(e.data);
      }
    };
    
    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
        setStatus("Video created successfully!");
        resolve(url);
      };
      
      // Draw the static image continuously
      const drawFrame = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
      
      mediaRecorderRef.current!.start(100); // Collect data every 100ms
      
      // Stop recording after audio duration
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, getAudioDuration(audioBlob));
    });
  };

  const getAudioDuration = (blob: Blob): number => {
    // This is a placeholder - in a real app you'd need to analyze the audio
    return text.length * 150; // Same rough estimate as before
  };

  const createAudioStream = async (blob: Blob): Promise<MediaStream> => {
    const audioContext = audioContextRef.current || new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const destination = audioContext.createMediaStreamDestination();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.start();
    
    return destination.stream;
  };

  const handleGenerateVideo = async () => {
    if (!image) {
      setStatus("Please upload an image first");
      return;
    }
    
    try {
      const audioUrl = await textToSpeech(text);
      if (!audioUrl) return;
      
      await createVideoWithAudio(image, audioUrl);
    } catch (error) {
      console.error("Error generating video:", error);
      setStatus("Error generating video");
    }
  };

  // Clean up
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [videoUrl, audioUrl]);

  return (
    <div className="video-generator" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Text to Video Generator</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="text-input" style={{ display: 'block', marginBottom: '8px' }}>
          Enter Text:
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="image-upload" style={{ display: 'block', marginBottom: '8px' }}>
          Upload Background Image:
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>
      
      <button
        onClick={handleGenerateVideo}
        disabled={status.includes("Generating") || !meSpeakReady}
        style={{
          padding: '10px 20px',
          backgroundColor: (status.includes("Generating") || !meSpeakReady) ? '#cccccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        {!meSpeakReady ? "Loading speech engine..." : 
         status.includes("Generating") ? "Processing..." : "Generate Video"}
      </button>
      
      {status && (
        <p style={{ marginTop: '20px', color: status.includes('success') ? 'green' : 'red' }}>
          {status}
        </p>
      )}
      
      {videoUrl && (
        <div style={{ marginTop: '20px' }}>
          <video
            ref={videoRef}
            controls
            src={videoUrl}
            style={{ width: '100%', marginTop: '20px' }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                console.log(`Video duration: ${videoRef.current.duration}`);
              }
            }}
          />
        </div>
      )}
      
      {/* Hidden canvas for video generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default VideoGenerator;