import { useEffect, useRef } from "react";

// Keeps the screen awake while a class is live (best-effort; ignored if unsupported).
export const useWakeLock = (active) => {
  const lockRef = useRef(null);

  useEffect(() => {
    let released = false;

    const request = async () => {
      try {
        if ("wakeLock" in navigator && active) {
          lockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* ignore */
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && active && !released) {
        request();
      }
    };

    if (active) {
      request();
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      try {
        lockRef.current?.release();
      } catch {
        /* ignore */
      }
      lockRef.current = null;
    };
  }, [active]);
};
