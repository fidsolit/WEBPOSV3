"use client";

import { useEffect, useRef, useEffectEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PROTECTED_ROUTE_PREFIXES = [
  "/pos",
  "/inventory",
  "/cashiers",
  "/settings",
  "/reports",
];

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const resolveIdleTimeoutMs = () => {
  const secondsValue = Number(process.env.NEXT_PUBLIC_AUTH_IDLE_TIMEOUT_SECONDS);

  if (Number.isFinite(secondsValue) && secondsValue > 0) {
    return secondsValue * 1000;
  }

  const minutesValue = Number(process.env.NEXT_PUBLIC_AUTH_IDLE_TIMEOUT_MINUTES);

  if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
    return DEFAULT_IDLE_TIMEOUT_MS;
  }

  return minutesValue * 60 * 1000;
};

export function SessionTimeoutManager() {
  const pathname = usePathname();
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);
  const isSigningOutRef = useRef(false);

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const clearExistingTimeout = useEffectEvent(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });

  const signOutForInactivity = useEffectEvent(async () => {
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    clearExistingTimeout();

    await supabase.auth.signOut({ scope: "local" });
    router.replace("/auth/login?reason=expired");
  });

  const resetTimeout = useEffectEvent(() => {
    if (!isProtectedRoute || isSigningOutRef.current) {
      clearExistingTimeout();
      return;
    }

    clearExistingTimeout();
    timeoutRef.current = window.setTimeout(() => {
      void signOutForInactivity();
    }, resolveIdleTimeoutMs());
  });

  useEffect(() => {
    isSigningOutRef.current = false;

    if (!isProtectedRoute) {
      clearExistingTimeout();
      return;
    }

    const handleActivity = () => {
      resetTimeout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetTimeout();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    resetTimeout();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearExistingTimeout();
    };
  }, [isProtectedRoute]);

  return null;
}
