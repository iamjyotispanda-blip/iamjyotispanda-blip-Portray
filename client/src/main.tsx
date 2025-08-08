import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global error handler
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
  console.error("Error stack:", event.error?.stack);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
