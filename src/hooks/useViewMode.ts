import { useEffect, useState } from "react";

export type ViewMode = "table" | "grid" | "list";

export function useViewMode(storageKey: string, defaultMode: ViewMode = "table") {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    const stored = window.localStorage.getItem(storageKey);
    return (stored as ViewMode) || defaultMode;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, mode);
    }
  }, [storageKey, mode]);

  return [mode, setMode] as const;
}
