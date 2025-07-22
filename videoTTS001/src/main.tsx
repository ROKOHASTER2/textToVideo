import ReactDOM from "react-dom/client";
import { TextToVideo } from "./textToVideoPrueba";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<TextToVideo></TextToVideo>);
}
