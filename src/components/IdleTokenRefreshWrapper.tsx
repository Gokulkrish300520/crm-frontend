"use client";

import dynamic from "next/dynamic";

const IdleTokenRefreshClient = dynamic(
  () => import("@/components/IdleTokenRefreshClient"),
  { ssr: false }
);

export default function IdleTokenRefreshWrapper() {
  return <IdleTokenRefreshClient />;
}
