import React from "react";
import ReactDOM from "react-dom/client";
import { UiFun } from "./uiFun";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <UiFun />
    </React.StrictMode>
  );
}
