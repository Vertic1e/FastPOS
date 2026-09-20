import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { preloadTheme } from "@/lib/theme";
import "./index.css";

// Apply the cached theme before the first paint to avoid a flash of the wrong colours.
preloadTheme();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
