"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// --- TYPE DEFINITIONS ---
// These types ensure data consistency from the previous stage
export type WorkingTimelineItem = { s_no: number; description: string; deadline: string; status: "Completed" | "Over Due"; approved: "Yes" | "Rework"; assigned_to?: string; };
export type ProjectTimelineItem = { s_no: number; description: string; deadline: string; status: "Completed" | "Over Due"; final_fileName?: string; };

export type PostProcessItem = {
  id: string; date: string; department: string; company_name: string; contact: string; state: string; deadline: string; description: string; fileName?: string; source: string; customer_notes: string; order_value: number; advance_payment: { amount: number; bank_details: string; date: string; }; expense: number; profit: number; balance_due: number; subdeal_department?: string; project_handled_by: string; working_timeline: WorkingTimelineItem[]; project_timeline: ProjectTimelineItem[]; expense_bill_format: string; post_process_status: "Pending" | "Completed";
};

export type PaymentPendingItem = Omit<PostProcessItem, 'post_process_status'> & {
    payment_status: 'Pending';
};

export type CompletedProjectItem = Omit<PaymentPendingItem, 'payment_status'> & {
    completion_date: string;
    final_status: 'Paid';
};


export default function CompletedProjectsListPage() {
  const router = useRouter();
  const params = useParams();
  const pipelineId = params.pipelineId as string;
  const [items, setItems] = useState<CompletedProjectItem[]>([]);
  const [dialogState, setDialogState] = useState({ 
    isOpen: false, 
    item: null as CompletedProjectItem | null
  });

  useEffect(() => {
    const storedData = localStorage.getItem("completedProjectsData");
    if (storedData) {
      setItems(JSON.parse(storedData));
    }
  }, []);

  const updateLocalStorage = (updatedItems: CompletedProjectItem[]) => {
      localStorage.setItem("completedProjectsData", JSON.stringify(updatedItems));
  };

  const navigate = (path: string) => {
    window.location.href = path;
  };
  
  const closeDialog = () => setDialogState({ isOpen: false, item: null });

  const openDeleteDialog = (item: CompletedProjectItem) => {
    setDialogState({ isOpen: true, item });
  };

  const handleConfirmDelete = () => {
    if (!dialogState.item) return;
    const updatedItems = items.filter((item) => item.id !== dialogState.item!.id);
    setItems(updatedItems);
    updateLocalStorage(updatedItems);
    closeDialog();
  };

  const formatCurrency = (value: number | undefined) => (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-green-700">Completed Projects Archive</h1>
      </div>

      <div className="overflow-x-auto border rounded shadow">
        <table className="w-full border-collapse">
          <thead className="text-green-800 bg-green-100">
            <tr>
              {["Completion Date", "Company", "Handled By", "Order Value", "Final Profit", "Status", "Actions"].map((h) => (
                <th key={h} className="p-2 text-left border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-green-50">
                  <td className="p-2 border">{format(new Date(item.completion_date), "dd/MM/yyyy")}</td>
                  <td className="p-2 border">{item.company_name}</td>
                  <td className="p-2 border">{item.project_handled_by}</td>
                  <td className="p-2 border">{formatCurrency(item.order_value)}</td>
                  <td className="p-2 border font-semibold text-green-700">{formatCurrency(item.profit)}</td>
                  <td className="p-2 border">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
                          {item.final_status}
                      </span>
                  </td>
                  <td className="p-2 border">
                      <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => navigate(`/crm/pipelines/${pipelineId}/completed-projects/${item.id}/view`)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">View</button>
                          <button onClick={() => openDeleteDialog(item)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button>
                      </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="p-4 text-center text-gray-500">No completed projects found in the archive.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                <h2 className="text-xl font-bold text-gray-800">Confirm Deletion</h2>
                <p className="mt-3 text-gray-600">{`Are you sure you want to permanently delete the archived project for "${dialogState.item?.company_name}"?`}</p>
                <div className="flex justify-end mt-6 space-x-4">
                    <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}