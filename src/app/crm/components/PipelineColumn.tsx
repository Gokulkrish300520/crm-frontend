"use client";

import React from "react";
import DealCard from "./DealCard";

interface Deal {
  title: string;
  owner: string;
  amount: string;
  date: string;
}

interface PipelineColumnProps {
  title: string;
  total: string;
  count: number;
  deals?: Deal[];
}

const PipelineColumn: React.FC<PipelineColumnProps> = ({
  title,
  total,
  count,
  deals = [],
}) => {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] bg-gray-50 border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">
            {total} • {count} Deal{count !== 1 && "s"}
          </p>
        </div>
        <button
          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 
                     text-gray-500 hover:bg-gray-200 transition"
        >
          +
        </button>
      </div>

      {/* Deal cards */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
        {deals.length > 0 ? (
          deals.map((deal, idx) => (
            <DealCard
              key={idx}
              title={deal.title}
              owner={deal.owner}
              amount={deal.amount}
              date={deal.date}
            />
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400">This stage is empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineColumn;
