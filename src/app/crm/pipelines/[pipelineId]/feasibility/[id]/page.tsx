"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { HierarchicalPipeline, PipelineItem, pipelineHelpers } from "@/types/pipeline";

export default function FeasibilityCustomPage() {
  const params = useParams();
  const pipelineId = params?.id as string;

  const [items, setItems] = useState<PipelineItem[]>([]);
  const [pipelineName, setPipelineName] = useState<string>("");
  
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    mode: 'none' as 'accept' | 'reject' | 'delete' | 'validation' | 'success' | 'none',
    item: null as PipelineItem | null,
    message: '',
    title: '',
  });
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!pipelineId) return;

    const pipeline = loadPipeline(pipelineId);
    if (pipeline) {
      setPipelineName(pipeline.name);
      const feasibilityStage = pipeline.stages?.find(s => s.name === "Feasibility");
      if (feasibilityStage) {
        setItems(feasibilityStage.items || []);
      }
    }
  }, [pipelineId]);

  const loadPipeline = (id: string): HierarchicalPipeline | null => {
    const stored = localStorage.getItem("hierarchicalPipelines");
    if (!stored) return null;

    try {
      const flatPipelines = JSON.parse(stored);
      const tree = pipelineHelpers.buildTree(flatPipelines);
      return pipelineHelpers.findById(tree, id);
    } catch {
      return null;
    }
  };

  const savePipeline = (updatedPipeline: HierarchicalPipeline) => {
    const stored = localStorage.getItem("hierarchicalPipelines");
    if (!stored) return;

    try {
      const flatPipelines = JSON.parse(stored);
      const tree = pipelineHelpers.buildTree(flatPipelines);
      
      const updateInTree = (pipelines: HierarchicalPipeline[]): HierarchicalPipeline[] => {
        return pipelines.map(p => {
          if (p.id === updatedPipeline.id) {
            return updatedPipeline;
          }
          if (p.children.length > 0) {
            return { ...p, children: updateInTree(p.children) };
          }
          return p;
        });
      };

      const updatedTree = updateInTree(tree);
      const flattenedTree = pipelineHelpers.flattenTree(updatedTree);
      localStorage.setItem("hierarchicalPipelines", JSON.stringify(flattenedTree));
    } catch (error) {
      console.error("Failed to save pipeline:", error);
    }
  };
  
  const navigate = (path: string) => {
    window.location.href = path;
  };

  const openAcceptDialog = (item: PipelineItem) => {
    const notes = typeof item.customer_notes === 'string' ? item.customer_notes : '';
    if (notes.trim() === "") {
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

  const openRejectDialog = (item: PipelineItem) => {
    setRejectionReason("");
    setDialogState({
      isOpen: true,
      mode: 'reject',
      item: item,
      title: 'Reject Feasibility',
      message: `Please provide a reason for rejecting feasibility for "${item.company_name}".`
    });
  };

  const openDeleteDialog = (item: PipelineItem) => {
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

    const pipeline = loadPipeline(pipelineId);
    if (!pipeline) return;

    // Add stage history
    const existingHistory = Array.isArray(itemToMove.stage_history) ? itemToMove.stage_history : [];
    const updatedItem: PipelineItem = {
      ...itemToMove,
      stage_history: [
        ...existingHistory,
        { stage: 'Moved to Quotation', date: new Date().toISOString() }
      ]
    };

    // Remove from Feasibility
    const feasibilityStage = pipeline.stages?.find(s => s.name === "Feasibility");
    if (feasibilityStage) {
      feasibilityStage.items = feasibilityStage.items.filter(i => i.id !== itemToMove.id);
    }

    // Add to Quotation
    const quotationStage = pipeline.stages?.find(s => s.name === "Quotation");
    if (quotationStage) {
      quotationStage.items = quotationStage.items || [];
      quotationStage.items.push(updatedItem);
    }

    savePipeline(pipeline);
    setItems(feasibilityStage?.items || []);

    setDialogState({ 
      isOpen: true, 
      mode: 'success', 
      item: null, 
      title: 'Success', 
      message: `Accepted. Moved '${itemToMove.company_name}' to Quotation.` 
    });
  };

  const handleConfirmReject = () => {
    const itemToReject = dialogState.item;
    if (!itemToReject || rejectionReason.trim() === "") {
      alert("Rejection reason cannot be empty.");
      return;
    }
    
    const pipeline = loadPipeline(pipelineId);
    if (!pipeline) return;

    // Add rejection info and stage history
    const existingHistory = Array.isArray(itemToReject.stage_history) ? itemToReject.stage_history : [];
    const rejectedItem: PipelineItem = {
      ...itemToReject,
      rejection_reason: rejectionReason,
      rejection_stage: "Feasibility",
      closed_date: new Date().toISOString(),
      stage_history: [
        ...existingHistory,
        { stage: 'Rejected from Feasibility', date: new Date().toISOString() }
      ]
    };

    // Remove from Feasibility
    const feasibilityStage = pipeline.stages?.find(s => s.name === "Feasibility");
    if (feasibilityStage) {
      feasibilityStage.items = feasibilityStage.items.filter(i => i.id !== itemToReject.id);
    }

    // Add to Closed Deals
    const closedStage = pipeline.stages?.find(s => s.name === "Closed Deals");
    if (closedStage) {
      closedStage.items = closedStage.items || [];
      closedStage.items.push(rejectedItem);
    }

    savePipeline(pipeline);
    setItems(feasibilityStage?.items || []);
    
    setDialogState({ 
      isOpen: true, 
      mode: 'success', 
      item: null, 
      title: 'Success', 
      message: `'${itemToReject.company_name}' rejected and moved to Closed Deals.` 
    });
  };

  const handleConfirmDelete = () => {
    const itemToDelete = dialogState.item;
    if (!itemToDelete) return;

    const pipeline = loadPipeline(pipelineId);
    if (!pipeline) return;

    const feasibilityStage = pipeline.stages?.find(s => s.name === "Feasibility");
    if (feasibilityStage) {
      feasibilityStage.items = feasibilityStage.items.filter(i => i.id !== itemToDelete.id);
    }

    savePipeline(pipeline);
    setItems(feasibilityStage?.items || []);
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
      <h1 className="text-2xl font-bold text-green-700 mb-4">
        Feasibility Check - {pipelineName}
      </h1>
      <div className="overflow-x-auto border rounded shadow">
        <table className="w-full border-collapse">
          <thead className="text-green-800 bg-green-100">
            <tr>
              {["Date", "Company Name", "Deadline", "Priority", "Decision", "Actions"].map(h => 
                <th key={h} className="p-2 text-left border">{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-green-50">
                <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                <td className="p-2 border">{item.company_name}</td>
                <td className="p-2 border">{format(new Date(item.deadline), "dd/MM/yyyy")}</td>
                <td className="p-2 border">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.priority === "High" ? "bg-red-100 text-red-800" : 
                    item.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : 
                    "bg-blue-100 text-blue-800"
                  }`}>
                    {item.priority}
                  </span>
                </td>
                <td className="p-2 border">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openAcceptDialog(item)} 
                      className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-md hover:bg-green-600 w-full"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => openRejectDialog(item)} 
                      className="px-3 py-1 text-xs font-semibold text-white bg-orange-500 rounded-md hover:bg-orange-600 w-full"
                    >
                      Reject
                    </button>
                  </div>
                </td>
                <td className="p-2 border">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/crm/pipelines/${pipelineId}/feasibility/${item.id}/view`)} 
                      className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => navigate(`/crm/pipelines/${pipelineId}/feasibility/${item.id}/edit`)} 
                      className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-md hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => openDeleteDialog(item)} 
                      className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600"
                    >
                      Delete
                    </button>
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
