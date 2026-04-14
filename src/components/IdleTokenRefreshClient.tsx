"use client";

import React from "react";
import { useIdleTokenRefresh } from "@/hooks/useIdleTokenRefresh";

export default function IdleTokenRefreshClient() {
  const { promptVisible, refreshSession } = useIdleTokenRefresh();

  if (!promptVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full text-center">
        <p className="mb-4">Your session is about to expire. Are you still here?</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={refreshSession}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Yes, keep me logged in
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            No, log me out
          </button>
        </div>
      </div>
    </div>
  );
}
