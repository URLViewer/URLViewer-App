import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@web/App";
import { createBrowserMockApi } from "@web/utils/mockApi";
import "@web/styles/index.css";

if (!window.m3u8Viewer) {
  window.m3u8Viewer = createBrowserMockApi();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

