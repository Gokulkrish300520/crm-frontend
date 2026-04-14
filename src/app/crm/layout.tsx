"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./components/Sidebar";
import TopNavbar from "./components/TopNavbar";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar - appears on all CRM pages */}
      <TopNavbar onOpenSidebar={() => setMobileSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Desktop sidebar (visible md and up) */}
        <div className="hidden md:block border-r border-gray-200">
          <Sidebar />
        </div>

        {/* Mobile sidebar (only visible on small screens) */}
        <div className="md:hidden">
          <Sidebar
            isMobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
        </div>

        {/* Page Content - children will include their own navbars if needed */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
