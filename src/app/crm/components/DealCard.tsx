"use client";

import React from "react";

interface DealCardProps {
  title: string;
  owner: string;
  amount: string | number;
  date: string;
}

const DealCard: React.FC<DealCardProps> = ({ title, owner, amount, date }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2 hover:shadow-sm transition">
      {/* Title */}
      <h3 className="text-sm font-medium text-gray-800 truncate">{title}</h3>

      {/* Owner */}
      <p className="text-xs text-gray-500">{owner}</p>

      {/* Amount & Date */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-green-600">{amount}</span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>{date}</span>
          <span className="w-2 h-2 bg-gray-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default DealCard;
