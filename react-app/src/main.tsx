import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import TTSVideoGenerator from "./TTSVideoGenerator";
import "bootstrap/dist/css/bootstrap.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TTSVideoGenerator/>
  </React.StrictMode>
);
