import React from "react";

interface Props {
  sentence: string;
  translatedText: string;
  isSpeaking: boolean;
  onPlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const UI: React.FC<Props> = ({
  sentence,
  translatedText,
  isSpeaking,
  onPlay,
  onNext,
  onPrev,
}) => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Story Player</h1>
      <p style={styles.text}>{sentence}</p>
      <p style={styles.subtitle}>{translatedText}</p>
      <div style={styles.controls}>
        <button onClick={onPrev} disabled={isSpeaking}>
          ←
        </button>
        <button onClick={onPlay} disabled={isSpeaking}>
          ▶
        </button>
        <button onClick={onNext} disabled={isSpeaking}>
          →
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: 20,
    fontFamily: "sans-serif",
    textAlign: "center",
    backgroundColor: "#f0f0f0",
    height: "100vh",
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
  },
  text: {
    fontSize: 22,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    fontStyle: "italic",
    margin: "10px 0",
    color: "#555",
  },
  controls: {
    marginTop: 20,
  },
};

export default UI;
