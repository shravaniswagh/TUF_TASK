import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./app/App.tsx";
import "./styles/index.css";

// Automatically generate a unique board if arriving at the base URL
const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.get("board")) {
  const newBoardId = Math.random().toString(36).substring(2, 10);
  window.location.replace(`/?board=${newBoardId}`);
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);