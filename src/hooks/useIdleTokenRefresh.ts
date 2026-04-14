"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { refreshAccessToken } from "@/auth/tokenservice";

// Define the token and prompt timings in milliseconds to match the backend.
const ACCESS_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes
const PROMPT_BEFORE_EXPIRY = 2 * 60 * 1000; // 2 minutes before access token expiry

// Calculate the idle time threshold. This is when the prompt should appear.
const IDLE_TIME_THRESHOLD = ACCESS_TOKEN_EXPIRY - PROMPT_BEFORE_EXPIRY;

export function useIdleTokenRefresh() {
  const [promptVisible, setPromptVisible] = useState(false);
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);
  const promptTimer = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (promptTimer.current) clearTimeout(promptTimer.current);
  };

  const resetTimers = useCallback(() => {
    setPromptVisible(false);
    clearTimers();

    // Schedule the prompt to appear before the access token expires.
    promptTimer.current = setTimeout(() => {
      setPromptVisible(true);

      // Schedule the automatic logout if the user is still inactive after the prompt is shown.
      logoutTimer.current = setTimeout(() => {
        localStorage.clear();
        window.location.href = "/login";
      }, PROMPT_BEFORE_EXPIRY);
    }, IDLE_TIME_THRESHOLD);
  }, []);

  useEffect(() => {
    // Reset the timers on the first render.
    resetTimers();

    const events = ["mousemove", "keydown", "wheel", "touchstart"];
    
    // Create a wrapper function to check the state before resetting timers.
    const handleUserActivity = () => {
      // CRITICAL FIX: Only reset timers if the prompt is NOT currently visible.
      // This prevents mouse movements on the prompt itself from dismissing it.
      if (!promptVisible) {
        resetTimers();
      }
    };

    for (const event of events) {
      window.addEventListener(event, handleUserActivity);
    }

    // Clean up event listeners and timers when the component unmounts.
    return () => {
      clearTimers();
      for (const event of events) {
        window.removeEventListener(event, handleUserActivity);
      }
    };
  }, [promptVisible, resetTimers]); // Add promptVisible to dependency array

  const refreshSession = async () => {
    try {
      await refreshAccessToken();
      setPromptVisible(false);
      resetTimers();
    } catch (e) {
      // The refreshAccessToken function already handles logout, but this
      // is a good fallback in case of other errors.
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  return { promptVisible, refreshSession };
}
