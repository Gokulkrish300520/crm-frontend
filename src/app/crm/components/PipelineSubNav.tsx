"use client";

import React from "react";

interface SubNavbarProps {
  active?: string; // highlight current tab
  onTabChange?: (tab: string) => void;
}

const SubNavbar: React.FC<SubNavbarProps> = ({
  active = "pipelines",
  onTabChange,
}) => {
  const tabs = [
    { id: "pipelines", label: "Pipelines" },
    { id: "deals", label: "Deals" },
    { id: "activities", label: "Activities" },
    { id: "contacts", label: "Contacts" },
  ];

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex space-x-6 px-6" aria-label="SubNavbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`py-3 text-sm font-medium ${
              active === tab.id
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SubNavbar;
