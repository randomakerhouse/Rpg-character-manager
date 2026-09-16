import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.js";
import { initCloudSyncIfConfigured } from "./state/firebase.js";
import "./index.css";

initCloudSyncIfConfigured();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
