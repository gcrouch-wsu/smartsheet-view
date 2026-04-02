"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "smartsheets_view_display_tz";

type DisplayTimezoneContextValue = {
  timeZone: string;
  setTimeZone: (tz: string) => void;
};

const DisplayTimezoneContext = createContext<DisplayTimezoneContextValue | null>(null);

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function DisplayTimezoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZoneState] = useState("America/Los_Angeles");

  useEffect(() => {
    const apply = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isValidTimeZone(stored)) {
          setTimeZoneState(stored);
          return;
        }
      } catch {
        /* ignore */
      }
      const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browser && isValidTimeZone(browser)) {
        setTimeZoneState(browser);
      }
    };
    queueMicrotask(apply);
  }, []);

  const setTimeZone = useCallback((tz: string) => {
    if (!isValidTimeZone(tz)) {
      return;
    }
    setTimeZoneState(tz);
    try {
      localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ timeZone, setTimeZone }), [timeZone, setTimeZone]);

  return <DisplayTimezoneContext.Provider value={value}>{children}</DisplayTimezoneContext.Provider>;
}

export function useDisplayTimezone(): DisplayTimezoneContextValue {
  const ctx = useContext(DisplayTimezoneContext);
  if (!ctx) {
    return {
      timeZone: "America/Los_Angeles",
      setTimeZone: () => {},
    };
  }
  return ctx;
}
