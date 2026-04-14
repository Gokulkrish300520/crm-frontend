"use client";

import React from 'react';

export default function RFQLayout({ children }: { children: React.ReactNode }) {
  // Simple layout to ensure consistent UI during redirects
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}