"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

function isInternalNav(href: string | null): boolean {
  if (!href || href === "" || href.startsWith("#")) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    return new URL(href, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

interface NavigationProgressContextValue {
  startNavigation: () => void;
}

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

export function useStartNavigation(): () => void {
  const ctx = useContext(NavigationProgressContext);
  return useCallback(() => {
    ctx?.startNavigation();
  }, [ctx]);
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  // Clear spinner when route has changed (new page is loading or loaded)
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Show spinner on any click that triggers an internal navigation
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element)?.closest("a");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (isInternalNav(href)) setIsNavigating(true);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <NavigationProgressContext.Provider value={{ startNavigation }}>
      {children}
      {isNavigating && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/80 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-stone-600 border-t-accent"
            role="status"
            aria-label="Loading"
          />
        </div>
      )}
    </NavigationProgressContext.Provider>
  );
}
