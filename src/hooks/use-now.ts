"use client";

import { useEffect, useState } from "react";

/**
 * Current time, starting from the server's render time to avoid hydration
 * mismatches, then ticking every 30 seconds.
 */
export function useNow(serverNow: number) {
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
