"use client";

import { Bell, Plus, Search, Settings, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TopNavbar({ onLogout, onOpenSidebar }: { onLogout?: () => void; onOpenSidebar?: () => void } = {}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full h-12 bg-green-700 flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left: Brand + Workspace */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger - visible on small screens only */}
        <button
          className="p-2 rounded-md mr-2 md:hidden"
          onClick={() => onOpenSidebar && onOpenSidebar()}
          aria-label="Open sidebar"
        >
          <Menu size={18} className="text-white" />
        </button>
        <span className="text-white font-semibold">Glonix Elecronics</span>
        <select className="bg-green-600 text-white text-sm px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-white">
          <option>A</option>
          <option>B</option>
        </select>
      </div>

      {/* Center: Search */}
      {/* Center: Search - full on md+, compact on mobile */}
      <div className="flex-1 max-w-lg mx-4 relative flex items-center justify-center">
        <div className="hidden md:block w-full relative">
          <input
            type="text"
            placeholder="Search (ctrl + k)"
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search size={16} className="absolute left-2 top-2.5 text-gray-500" />
        </div>

        {/* Mobile search icon & input */}
        <div className="md:hidden flex items-center w-full">
          {!mobileSearchOpen && (
            <button
              aria-label="Open search"
              className="p-2 rounded-md"
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search size={18} className="text-white" />
            </button>
          )}

          {mobileSearchOpen && (
            <div className="flex items-center w-full">
              <input
                autoFocus
                type="text"
                placeholder="Search"
                className="w-full pl-3 pr-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                className="ml-2 p-2"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        <button className="p-2 rounded-full hover:bg-green-600">
          <Plus size={18} className="text-white" />
        </button>
        <button className="p-2 rounded-full hover:bg-green-600">
          <Bell size={18} className="text-white" />
        </button>
        <button className="p-2 rounded-full hover:bg-green-600 hidden sm:inline-flex">
          <Settings size={18} className="text-white" />
        </button>

        {/* User Profile */}
        <div
          className="w-8 h-8 rounded-full bg-gray-200 cursor-pointer"
          onClick={() => setDropdownOpen((prev) => !prev)}
        />

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-12 w-40 bg-white shadow-md rounded-md py-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <LayoutDashboard size={16} />
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}