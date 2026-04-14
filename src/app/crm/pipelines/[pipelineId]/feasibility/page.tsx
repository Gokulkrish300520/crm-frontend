"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// --- UPDATED TYPE DEFINITIONS ---
export type StageHistory = {
  stage: string;
  date: string;
};

export type Subdeal = {
  id: string;
  department: string;
  notes: string;
};

export type Feasibility = {
  id: string;
  pipelineId: string;
  date: string; 
  department: string; 
  company_name: string; 
  contact: string; 
  state: string;
  deadline: string; 
  description: string; 
  fileName?: string; 
  source: string; 
  priority: "High" | "Medium" | "Low";
  customer_notes: string;
  stage_history?: StageHistory[];
  subdeal?: "Yes" | "No";
  subdealRfqId?: string;
};

type Quotation = {
  id: string;
  date: string;
  department: string;
  company_name: string;
  contact: string;
  state: string;
  deadline: string;
  description: string;
  fileName?: string;
  source: string;
  priority: "High" | "Medium" | "Low";
  customer_notes: string;
  subdeals: Subdeal[];
  stage_history?: StageHistory[];
};

type ClosedItem = {
  id: string;
  company_name: string;
  department: string;
  rejection_stage: "RFQ" | "Feasibility" | "Quotation";
  rejection_reason: string;
  closed_date: string;
};

export default function FeasibilityListPage() {
  const params = useParams();
  const pipelineId = params?.pipelineId as string;
  const [items, setItems] = useState<Feasibility[]>([]);
  
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    mode: 'none' as 'accept' | 'reject' | 'delete' | 'validation' | 'success' | 'none',
    item: null as Feasibility | null,
    message: '',
    title: '',
  });
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const storedData = localStorage.getItem("feasibilityData");
    if (storedData) {
        const parsedData: Feasibility[] = JSON.parse(storedData);
        // Filter by pipelineId
        const filteredData = parsedData.filter(item => item.pipelineId === pipelineId);
        const sanitizedData = filteredData.map(item => ({
            ...item,
            stage_history: Array.isArray(item.stage_history) ? item.stage_history : [],
            subdeal: item.subdeal || "No", // Initialize subdeal if not present
        }));
        setItems(sanitizedData);
    }
  }, [pipelineId]);

  const updateLocalStorage = (updatedItems: Feasibility[]) => {
    // Get all feasibility items from localStorage
    const allItems: Feasibility[] = JSON.parse(localStorage.getItem("feasibilityData") || "[]");
    // Remove old items for this pipeline
    const otherPipelineItems = allItems.filter(item => item.pipelineId !== pipelineId);
    // Combine with updated items for this pipeline
    const finalItems = [...otherPipelineItems, ...updatedItems];
    localStorage.setItem("feasibilityData", JSON.stringify(finalItems));
  };
  
  const navigate = (path: string) => {
      window.location.href = path;
  };

  const openAcceptDialog = (item: Feasibility) => {
    if (item.customer_notes.trim() === "") {
      setDialogState({
        isOpen: true,
        mode: 'validation',
        item: item, 
        title: 'Update Required',
        message: 'Customer notes are required before accepting. Please add notes to proceed.'
      });
      return;
    }
    setDialogState({
      isOpen: true,
      mode: 'accept',
      item: item,
      title: 'Confirm Acceptance',
      message: `Accept feasibility for "${item.company_name}" and move to Quotation?`
    });
  };

  const openRejectDialog = (item: Feasibility) => {
    setRejectionReason("");
    setDialogState({
      isOpen: true,
      mode: 'reject',
      item: item,
      title: 'Reject Feasibility',
      message: `Please provide a reason for rejecting feasibility for "${item.company_name}".`
    });
  };

  const openDeleteDialog = (item: Feasibility) => {
    setDialogState({
      isOpen: true,
      mode: 'delete',
      item: item,
      title: 'Confirm Deletion',
      message: `Are you sure you want to permanently delete the item for "${item.company_name}"? This action cannot be undone.`
    });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, mode: 'none', item: null, message: '', title: '' });
  };

  const handleConfirmAccept = () => {
    const itemToMove = dialogState.item;
    if (!itemToMove) return;

    const newQuotationItem: Quotation = { 
      id: uuidv4(), 
      date: new Date().toISOString(),
      company_name: itemToMove.company_name,
      contact: itemToMove.contact,
      department: itemToMove.department,
      state: itemToMove.state,
      deadline: itemToMove.deadline,
      description: itemToMove.description,
      fileName: itemToMove.fileName,
      source: itemToMove.source,
      priority: itemToMove.priority,
      customer_notes: itemToMove.customer_notes,
      subdeals: [], 
      stage_history: [
        ...(itemToMove.stage_history || []), 
        { stage: 'Moved to Quotation', date: new Date().toISOString() }
      ],
    };
    const data = JSON.parse(localStorage.getItem("quotationData") || "[]");
    data.push(newQuotationItem);
    localStorage.setItem("quotationData", JSON.stringify(data));

    const updatedItems = items.filter(i => i.id !== itemToMove.id);
    setItems(updatedItems);
    updateLocalStorage(updatedItems);

    setDialogState({ isOpen: true, mode: 'success', item: null, title: 'Success', message: `Accepted. Moved '${itemToMove.company_name}' to Quotation Preparation.` });
  };

  const handleConfirmReject = () => {
    const itemToReject = dialogState.item;
    if (!itemToReject || rejectionReason.trim() === "") {
        alert("Rejection reason cannot be empty.");
        return;
    }
    
    const newItem: ClosedItem = { id: itemToReject.id, company_name: itemToReject.company_name, department: itemToReject.department, rejection_stage: "Feasibility", rejection_reason: rejectionReason, closed_date: new Date().toISOString() };
    const data = JSON.parse(localStorage.getItem("closedData") || "[]");
    data.push(newItem);
    localStorage.setItem("closedData", JSON.stringify(data));
    
    const updatedItems = items.filter(i => i.id !== itemToReject.id);
    setItems(updatedItems);
    updateLocalStorage(updatedItems);
    
    setDialogState({ isOpen: true, mode: 'success', item: null, title: 'Success', message: `'${itemToReject.company_name}' rejected and moved to Closed.` });
  };

  const handleConfirmDelete = () => {
    const itemToDelete = dialogState.item;
    if (!itemToDelete) return;

    const updatedItems = items.filter(i => i.id !== itemToDelete.id);
    setItems(updatedItems);
    updateLocalStorage(updatedItems);
    closeDialog();
  };

  const handleNavigateToEdit = () => {
    const itemToEdit = dialogState.item;
    if (!itemToEdit) return;
    
    closeDialog();
    navigate(`/crm/pipelines/${pipelineId}/feasibility/${itemToEdit.id}/edit`);
  };

  const Dialog = () => {
    if (!dialogState.isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
          <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
          <p className="mt-3 text-gray-600">{dialogState.message}</p>

          {dialogState.mode === 'reject' && (
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-2 mt-4 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Enter rejection reason here..."
              rows={3}
            />
          )}

          <div className="flex justify-end mt-6 space-x-4">
            {['accept', 'reject', 'delete', 'validation'].includes(dialogState.mode) && (
              <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                Cancel
              </button>
            )}

            {dialogState.mode === 'accept' && <button onClick={handleConfirmAccept} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Accept</button>}
            {dialogState.mode === 'reject' && <button onClick={handleConfirmReject} className="px-5 py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700">Reject</button>}
            {dialogState.mode === 'delete' && <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>}
            
            {dialogState.mode === 'validation' && (
              <button onClick={handleNavigateToEdit} className="px-5 py-2 font-semibold text-white bg-yellow-500 rounded-md hover:bg-yellow-600">
                Add Notes
              </button>
            )}
            
            {dialogState.mode === 'success' && <button onClick={closeDialog} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">OK</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Feasibility Check</h1>
      <div className="overflow-x-auto border rounded shadow">
        <table className="w-full border-collapse">
          <thead className="text-green-800 bg-green-100">
            <tr>
              {["Date", "Company Name", "Deadline", "Priority", "Decision", "Actions"].map(h => <th key={h} className="p-2 text-left border">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-green-50">
                <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                <td className="p-2 border">{item.company_name}</td>
                <td className="p-2 border">{format(new Date(item.deadline), "dd/MM/yyyy")}</td>
                 <td className="p-2 border">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ item.priority === "High" ? "bg-red-100 text-red-800" : item.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800" }`}>{item.priority}</span>
                </td>
                <td className="p-2 border">
                    <div className="flex gap-2">
                        <button onClick={() => openAcceptDialog(item)} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 w-full">Accept</button>
                        <button onClick={() => openRejectDialog(item)} className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded-md hover:bg-orange-600 w-full">Reject</button>
                    </div>
                </td>
                <td className="p-2 border">
                    <div className="flex gap-2">
                        <button onClick={() => navigate(`/crm/pipelines/${pipelineId}/feasibility/${item.id}/view`)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">View</button>
                        <button onClick={() => navigate(`/crm/pipelines/${pipelineId}/feasibility/${item.id}/edit`)} className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Edit</button>
                        <button onClick={() => openDeleteDialog(item)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog />
    </div>
  );
}