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

export type RFQ = {
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
  stage_history?: StageHistory[];
  isSubdeal?: boolean;
  parentFeasibilityId?: string;
};

type Feasibility = {
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
  status: "Pending" | "Approved" | "Rejected";
  customer_notes: string;
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

export default function RFQListPage() {
  const params = useParams();
  const pipelineId = params?.pipelineId as string;
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [subdeals, setSubdeals] = useState<RFQ[]>([]);
  
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    mode: 'none' as 'accept' | 'reject' | 'delete' | 'success' | 'accept_success' | 'none',
    item: null as RFQ | null,
    message: '',
    title: '',
  });
  const [rejectionReason, setRejectionReason] = useState("");


  useEffect(() => {
    const storedData = localStorage.getItem("rfqData");
    if (storedData) {
        const parsedData: RFQ[] = JSON.parse(storedData);
        // Filter RFQs by pipelineId
        const filteredData = parsedData.filter(item => item.pipelineId === pipelineId);
        const sanitizedData = filteredData.map(item => ({
            ...item,
            stage_history: Array.isArray(item.stage_history) ? item.stage_history : [],
        }));
        
        // Separate main RFQs and sub-deals
        const mainRfqs = sanitizedData.filter(item => !item.isSubdeal);
        const subdealRfqs = sanitizedData.filter(item => item.isSubdeal);
        
        setRfqs(mainRfqs);
        setSubdeals(subdealRfqs);
    }
  }, [pipelineId]);
  
  const updateLocalStorage = (updatedRfqs: RFQ[], updatedSubdeals: RFQ[]) => {
      // Get all RFQs from localStorage
      const allRfqs: RFQ[] = JSON.parse(localStorage.getItem("rfqData") || "[]");
      // Remove old RFQs for this pipeline
      const otherPipelineRfqs = allRfqs.filter(item => item.pipelineId !== pipelineId);
      // Combine with updated RFQs for this pipeline (both main and subdeals)
      const finalRfqs = [...otherPipelineRfqs, ...updatedRfqs, ...updatedSubdeals];
      localStorage.setItem("rfqData", JSON.stringify(finalRfqs));
  };

  const navigate = (path: string) => {
    window.location.href = path;
  };

  const openAcceptDialog = (rfq: RFQ) => {
    setDialogState({ 
      isOpen: true, 
      mode: 'accept', 
      item: rfq, 
      title: 'Confirm Acceptance',
      message: `Are you sure you want to accept the RFQ for "${rfq.company_name}" and move it to Feasibility Check?`
    });
  };

  const openRejectDialog = (rfq: RFQ) => {
    setRejectionReason("");
    setDialogState({
      isOpen: true,
      mode: 'reject',
      item: rfq,
      title: 'Reject RFQ',
      message: `Please provide a reason for rejecting the RFQ from "${rfq.company_name}".`
    });
  };

  const openDeleteDialog = (rfq: RFQ) => {
    setDialogState({
      isOpen: true,
      mode: 'delete',
      item: rfq,
      title: 'Confirm Deletion',
      message: 'Are you sure you want to permanently delete this RFQ? This action cannot be undone.'
    });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, mode: 'none', item: null, message: '', title: '' });
  };
  
  const handleConfirmAccept = () => {
    const rfqToMove = dialogState.item;
    if (!rfqToMove) return;

    const initialHistory = rfqToMove.stage_history?.length 
        ? rfqToMove.stage_history 
        : [{ stage: 'RFQ Created', date: rfqToMove.date }];

    const newFeasibilityItem: Feasibility = { 
        ...rfqToMove, 
        status: "Pending", 
        customer_notes: "",
        stage_history: [
            ...initialHistory,
            { stage: 'Moved to Feasibility', date: new Date().toISOString() }
        ]
    };

    const feasibilityData = JSON.parse(localStorage.getItem("feasibilityData") || "[]");
    feasibilityData.push(newFeasibilityItem);
    localStorage.setItem("feasibilityData", JSON.stringify(feasibilityData));

    const updatedRfqs = rfqs.filter(r => r.id !== rfqToMove.id);
    const updatedSubdeals = subdeals.filter(r => r.id !== rfqToMove.id);
    setRfqs(updatedRfqs);
    setSubdeals(updatedSubdeals);
    updateLocalStorage(updatedRfqs, updatedSubdeals);

    setDialogState({ 
        isOpen: true, 
        mode: 'accept_success',
        item: null, 
        title: 'Success', 
        message: `'${rfqToMove.company_name}' accepted and moved to Feasibility Check.` 
    });
  };

  const handleConfirmReject = () => {
    const rfqToReject = dialogState.item;
    if (!rfqToReject || rejectionReason.trim() === "") {
        alert("Rejection reason cannot be empty.");
        return;
    }

    const newClosedItem: ClosedItem = {
      id: rfqToReject.id,
      company_name: rfqToReject.company_name,
      department: rfqToReject.department,
      rejection_stage: "RFQ",
      rejection_reason: rejectionReason,
      closed_date: new Date().toISOString(),
    };
    
    const closedData = JSON.parse(localStorage.getItem("closedData") || "[]");
    closedData.push(newClosedItem);
    localStorage.setItem("closedData", JSON.stringify(closedData));
    
    const updatedRfqs = rfqs.filter(r => r.id !== rfqToReject.id);
    const updatedSubdeals = subdeals.filter(r => r.id !== rfqToReject.id);
    setRfqs(updatedRfqs);
    setSubdeals(updatedSubdeals);
    updateLocalStorage(updatedRfqs, updatedSubdeals);
    
    setDialogState({ isOpen: true, mode: 'success', item: null, title: 'Success', message: `'${rfqToReject.company_name}' has been rejected and moved to Closed.` });
  };

  const handleConfirmDelete = () => {
      const rfqToDelete = dialogState.item;
      if (!rfqToDelete) return;

      const updatedRfqs = rfqs.filter(r => r.id !== rfqToDelete.id);
      const updatedSubdeals = subdeals.filter(r => r.id !== rfqToDelete.id);
      setRfqs(updatedRfqs);
      setSubdeals(updatedSubdeals);
      updateLocalStorage(updatedRfqs, updatedSubdeals);
      closeDialog();
  };
  
  const handleSuccessAndNavigate = () => {
    closeDialog();
    navigate(`/crm/pipelines/${pipelineId}/feasibility`); 
  };

  const Dialog = () => {
    if (!dialogState.isOpen) return null;

    const isRejectMode = dialogState.mode === 'reject';
    const isSuccessMode = dialogState.mode === 'success' || dialogState.mode === 'accept_success';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
          <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
          <p className="mt-3 text-gray-600">{dialogState.message}</p>

          {isRejectMode && (
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-2 mt-4 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Enter rejection reason here..."
              rows={3}
            />
          )}

          <div className="flex justify-end mt-6 space-x-4">
            {!isSuccessMode && (
              <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                Cancel
              </button>
            )}

            {dialogState.mode === 'accept' && <button onClick={handleConfirmAccept} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Accept</button>}
            {dialogState.mode === 'reject' && <button onClick={handleConfirmReject} className="px-5 py-2 font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700">Reject</button>}
            {dialogState.mode === 'delete' && <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>}
            
            {dialogState.mode === 'success' && <button onClick={closeDialog} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">OK</button>}
            {dialogState.mode === 'accept_success' && <button onClick={handleSuccessAndNavigate} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">OK</button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-green-700">RFQ (Request for Quotation)</h1>
        <button onClick={() => navigate(`/crm/pipelines/${pipelineId}/rfq/new`)} className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">+ Add RFQ</button>
      </div>
      
      {/* Main RFQs Table */}
      <div className="overflow-x-auto border rounded shadow mb-8">
        <table className="w-full border-collapse">
          <thead className="text-green-800 bg-green-100">
            <tr>
              {["Date", "Company Name", "Deadline", "Priority", "Decision", "Actions"].map(h => <th key={h} className="p-2 text-left border">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rfqs.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">No RFQs found.</td></tr>
            ) : (
                rfqs.map((rfq) => (
              <tr key={rfq.id} className="border-b hover:bg-green-50">
                <td className="p-2 border">{format(new Date(rfq.date), "dd/MM/yyyy")}</td>
                <td className="p-2 border">{rfq.company_name}</td>
                <td className="p-2 border">{format(new Date(rfq.deadline), "dd/MM/yyyy")}</td>
                <td className="p-2 border">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ rfq.priority === "High" ? "bg-red-100 text-red-800" : rfq.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{rfq.priority}</span>
                </td>
                <td className="p-2 border"><div className="flex gap-2"><button onClick={() => openAcceptDialog(rfq)} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 w-full">Accept</button><button onClick={() => openRejectDialog(rfq)} className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded-md hover:bg-orange-600 w-full">Reject</button></div></td>
                <td className="p-2 border"><div className="flex gap-2"><button onClick={() => navigate(`/crm/pipelines/${pipelineId}/rfq/${rfq.id}/view`)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">View</button><button onClick={() => navigate(`/crm/pipelines/${pipelineId}/rfq/${rfq.id}/edit`)} className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Edit</button><button onClick={() => openDeleteDialog(rfq)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button></div></td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      
      {/* Sub-Deals Section */}
      {subdeals.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-blue-700 mb-4">Sub-Deals (Alternate Solutions from Feasibility)</h2>
          <div className="overflow-x-auto border border-blue-300 rounded shadow">
            <table className="w-full border-collapse">
              <thead className="text-blue-800 bg-blue-100">
                <tr>
                  {["Date", "Company Name", "Deadline", "Priority", "Decision", "Actions"].map(h => <th key={h} className="p-2 text-left border">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {subdeals.map((rfq) => (
                  <tr key={rfq.id} className="border-b hover:bg-blue-50">
                    <td className="p-2 border">{format(new Date(rfq.date), "dd/MM/yyyy")}</td>
                    <td className="p-2 border">
                      <div>
                        <div>{rfq.company_name}</div>
                        <div className="text-xs text-blue-600">📌 Sub-Deal</div>
                      </div>
                    </td>
                    <td className="p-2 border">{format(new Date(rfq.deadline), "dd/MM/yyyy")}</td>
                    <td className="p-2 border">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ rfq.priority === "High" ? "bg-red-100 text-red-800" : rfq.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{rfq.priority}</span>
                    </td>
                    <td className="p-2 border"><div className="flex gap-2"><button onClick={() => openAcceptDialog(rfq)} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 w-full">Accept</button><button onClick={() => openRejectDialog(rfq)} className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded-md hover:bg-orange-600 w-full">Reject</button></div></td>
                    <td className="p-2 border"><div className="flex gap-2"><button onClick={() => navigate(`/crm/pipelines/${pipelineId}/rfq/${rfq.id}/view`)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">View</button><button onClick={() => navigate(`/crm/pipelines/${pipelineId}/rfq/${rfq.id}/edit`)} className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Edit</button><button onClick={() => openDeleteDialog(rfq)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <Dialog />
    </div>
  );
}