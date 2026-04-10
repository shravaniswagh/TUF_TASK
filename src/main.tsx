import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./app/App.tsx";
import "./styles/index.css";

// Auth flow will handle routing now

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);