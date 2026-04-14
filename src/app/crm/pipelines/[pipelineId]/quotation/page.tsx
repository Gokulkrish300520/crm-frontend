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
  fileName?: string; // PDF file for subdeal
};

export type Quotation = {
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

type Negotiation = {
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
  subdeal_notes?: string;
  quotation_status: "Followup" | "Closed" | "Convert";
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

export default function QuotationListPage() {
  const params = useParams();
  const pipelineId = params?.pipelineId as string;
  const [items, setItems] = useState<Quotation[]>([]);
  
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    mode: 'none' as 'accept' | 'accept_with_subdeals' | 'reject' | 'delete' | 'success' | 'none',
    item: null as Quotation | null,
    message: '',
    title: '',
  });
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const storedData = localStorage.getItem("quotationData");
    if (storedData) {
        const parsedData: Quotation[] = JSON.parse(storedData);
        const sanitizedData = parsedData.map(item => ({
            ...item,
            subdeals: Array.isArray(item.subdeals) ? item.subdeals : [],
            stage_history: Array.isArray(item.stage_history) ? item.stage_history : [],
        }));
        setItems(sanitizedData);
    }
  }, []);

  const updateLocalStorage = (updatedItems: Quotation[]) => {
    localStorage.setItem("quotationData", JSON.stringify(updatedItems));
  };
  
  const navigate = (path: string) => {
      window.location.href = path;
  };

  const openAcceptDialog = (item: Quotation) => {
    if (item.subdeals && item.subdeals.length > 0) {
      setDialogState({ 
        isOpen: true, 
        mode: 'accept_with_subdeals', 
        item: item, 
        title: 'Move to Negotiation',
        message: `This will create ${item.subdeals.length} separate negotiation items, one for each subdeal. Proceed?`
      });
    } else {
      setDialogState({ 
        isOpen: true, 
        mode: 'accept', 
        item: item, 
        title: 'Accept Quotation',
        message: `What would you like to do with the quotation for "${item.company_name}"?`
      });
    }
  };

  const openRejectDialog = (item: Quotation) => {
    setRejectionReason("");
    setDialogState({ isOpen: true, mode: 'reject', item: item, title: 'Reject Quotation', message: `Provide a reason for rejecting the quotation from "${item.company_name}".`});
  };

  const openDeleteDialog = (item: Quotation) => {
    setDialogState({ isOpen: true, mode: 'delete', item: item, title: 'Confirm Deletion', message: `Are you sure you want to permanently delete the quotation for "${item.company_name}"?`});
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, mode: 'none', item: null, message: '', title: '' });
  };
  
  const handleNavigateToEdit = () => {
      const itemToEdit = dialogState.item;
      if (!itemToEdit) return;
      closeDialog();
      navigate(`/crm/pipelines/${pipelineId}/quotation/${itemToEdit.id}/edit`);
  };

  const handleMoveToNegotiation = () => {
    const itemToMove = dialogState.item;
    if (!itemToMove) return;

    const subdealsToProcess = itemToMove.subdeals.length > 0 
        ? itemToMove.subdeals 
        : [{ id: uuidv4(), department: itemToMove.department, notes: "Original department" }];
    
    const newNegotiationItems: Negotiation[] = subdealsToProcess.map(subdeal => ({
        id: uuidv4(), 
        date: new Date().toISOString(), 
        department: subdeal.department,
        company_name: itemToMove.company_name,
        contact: itemToMove.contact,
        state: itemToMove.state,
        deadline: itemToMove.deadline,
        description: itemToMove.description,
        fileName: itemToMove.fileName,
        source: itemToMove.source,
        priority: itemToMove.priority,
        customer_notes: itemToMove.customer_notes,
        subdeal_notes: subdeal.notes,
        quotation_status: "Followup",
        stage_history: [
            ...(itemToMove.stage_history || []),
            { stage: 'Moved to Negotiation', date: new Date().toISOString() }
        ],
    }));
    
    const negotiationData = JSON.parse(localStorage.getItem("negotiationData") || "[]");
    localStorage.setItem("negotiationData", JSON.stringify([...negotiationData, ...newNegotiationItems]));

    const updatedItems = items.filter(i => i.id !== itemToMove.id);
    setItems(updatedItems);
    updateLocalStorage(updatedItems);
    
    setDialogState({ isOpen: true, mode: 'success', item: null, title: 'Success', message: `Successfully moved ${newNegotiationItems.length} deal(s) for '${itemToMove.company_name}' to Negotiation.`});
  };

  const handleConfirmReject = () => {
    const itemToReject = dialogState.item;
    if (!itemToReject || rejectionReason.trim() === "") {
        alert("Rejection reason cannot be empty.");
        return;
    }
    const newItem: ClosedItem = { id: itemToReject.id, company_name: itemToReject.company_name, department: itemToReject.department, rejection_stage: "Quotation", rejection_reason: rejectionReason, closed_date: new Date().toISOString() };
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

  const Dialog = () => {
    if (!dialogState.isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
          <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
          <p className="mt-3 text-gray-600">{dialogState.message}</p>
          
          {dialogState.mode === 'reject' && (
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full p-2 mt-4 border rounded" rows={3}/>
          )}

          <div className="flex justify-end mt-6 space-x-4">
            {dialogState.mode === 'reject' && <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>}
            {dialogState.mode === 'delete' && <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>}

            {dialogState.mode === 'reject' && <button onClick={handleConfirmReject} className="px-5 py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700">Reject</button>}
            {dialogState.mode === 'delete' && <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>}
            {dialogState.mode === 'success' && <button onClick={closeDialog} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">OK</button>}
            
            {dialogState.mode === 'accept' && (
                <>
                    <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleNavigateToEdit} className="px-5 py-2 font-semibold text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Add Subdeal</button>
                    <button onClick={handleMoveToNegotiation} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Move without Subdeal</button>
                </>
            )}
            {dialogState.mode === 'accept_with_subdeals' && (
                <>
                    <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleMoveToNegotiation} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Move to Negotiation</button>
                </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Quotation Preparation</h1>
      <div className="overflow-x-auto border rounded shadow">
        <table className="w-full border-collapse">
          <thead className="text-green-800 bg-green-100">
            <tr>
              {["Date", "Company Name", "Department", "Source", "Priority", "Actions"].map(h => <th key={h} className="p-2 text-left border">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-green-50">
                <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                <td className="p-2 border">{item.company_name}</td>
                <td className="p-2 border">{item.department}</td>
                <td className="p-2 border">{item.source}</td>
                <td className="p-2 border">
                   <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ item.priority === "High" ? "bg-red-100 text-red-800" : item.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800" }`}>{item.priority || 'N/A'}</span>
                </td>
                <td className="p-2 border">
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => openAcceptDialog(item)} className="px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600">Accept</button>
                        <button onClick={() => openRejectDialog(item)} className="px-2 py-1 text-xs text-white bg-orange-500 rounded hover:bg-orange-600">Reject</button>
                        <button onClick={() => navigate(`/crm/pipelines/${pipelineId}/quotation/${item.id}/view`)} className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600">View</button>
                        <button onClick={() => navigate(`/crm/pipelines/${pipelineId}/quotation/${item.id}/edit`)} className="px-2 py-1 text-xs text-white bg-yellow-500 rounded hover:bg-yellow-600">Edit</button>
                        <button onClick={() => openDeleteDialog(item)} className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600">Delete</button>
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