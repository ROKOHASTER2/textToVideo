import React from "react";
import ReactDOM from "react-dom/client";
import { TextToVideo } from "./textToVideo";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <TextToVideo />
    </React.StrictMode>
  );
}
