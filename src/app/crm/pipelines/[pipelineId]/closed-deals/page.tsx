"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

// A generic type for any item closed from the pipeline
export type ClosedItem = {
  id: string;
  company_name: string;
  department: string;
  rejection_stage: "RFQ" | "Feasibility" | "Quotation";
  rejection_reason: string;
  closed_date: string;
};

export default function ClosedListPage() {
  const [items, setItems] = useState<ClosedItem[]>([]);

  useEffect(() => {
    const storedData = localStorage.getItem("closedData");
    if (storedData) setItems(JSON.parse(storedData));
  }, []);

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Closed / Rejected Items</h1>
      <div className="overflow-x-auto border rounded shadow">
        <table className="w-full border-collapse">
          <thead className="text-green-800 bg-green-100">
            <tr>
              {["Date Closed", "Company", "Rejected At", "Reason"].map(h => <th key={h} className="p-2 text-left border">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-green-50">
                  <td className="p-2 border">{format(new Date(item.closed_date), "dd/MM/yyyy")}</td>
                  <td className="p-2 border">{item.company_name}</td>
                  <td className="p-2 border">
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">{item.rejection_stage}</span>
                  </td>
                  <td className="p-2 border">{item.rejection_reason}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">No rejected items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}