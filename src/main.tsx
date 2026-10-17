import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { recordPageView } from "./lib/pageViews";

// Count the document load even when entering through a deep hash link.
// Do not wait for the counter before starting the learning app.
void recordPageView();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
