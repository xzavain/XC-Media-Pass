import { createContext, useContext, useState, useEffect, useCallback } from "react";

const DebugContext = createContext(null);
const STORAGE_KEY = "xc_debug_mode_enabled";

export function DebugProvider({ children }) {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setIsDebugMode((prev) => {
          const next = !prev;
          try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <DebugContext.Provider value={{ isDebugMode, toggleDebugMode, setIsDebugMode }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebugContext() {
  const ctx = useContext(DebugContext);
  if (!ctx) return { isDebugMode: false, toggleDebugMode: () => {}, setIsDebugMode: () => {} };
  return ctx;
}