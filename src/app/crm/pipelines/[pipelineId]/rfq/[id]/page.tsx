"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { HierarchicalPipeline, PipelineItem, pipelineHelpers } from "@/types/pipeline";

// --- Main Page Component ---
export default function DynamicRFQPage() {
  const params = useParams();
  const router = useRouter();
  const pipelineId = params?.id as string || "";
  
  const [pipeline, setPipeline] = useState<HierarchicalPipeline | null>(null);
  const [rfqStage, setRfqStage] = useState<{ id: string; name: string; items: PipelineItem[] } | null>(null);
  
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    mode: 'none' as 'accept' | 'reject' | 'delete' | 'success' | 'accept_success' | 'none',
    item: null as PipelineItem | null,
    message: '',
    title: '',
  });
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadPipeline();
  }, [pipelineId]);

  const loadPipeline = () => {
    const stored = localStorage.getItem("hierarchicalPipelines");
    if (stored) {
      try {
        const flatPipelines = JSON.parse(stored);
        const tree = pipelineHelpers.buildTree(flatPipelines);
        const found = pipelineHelpers.findById(tree, pipelineId);
        
        if (found) {
          setPipeline(found);
          const stage = found.stages.find(s => s.name === "RFQ");
          if (stage) {
            setRfqStage(stage);
          }
        }
      } catch (error) {
        console.error("Failed to load pipeline:", error);
      }
    }
  };

  const savePipeline = (updated: HierarchicalPipeline) => {
    const stored = localStorage.getItem("hierarchicalPipelines");
    if (stored) {
      try {
        const flatPipelines = JSON.parse(stored);
        const tree = pipelineHelpers.buildTree(flatPipelines);
        
        const updateInTree = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
          return nodes.map(node => {
            if (node.id === pipelineId) {
              return { ...updated, updatedAt: new Date().toISOString() };
            }
            if (node.children.length > 0) {
              return { ...node, children: updateInTree(node.children) };
            }
            return node;
          });
        };

        const updatedTree = updateInTree(tree);
        const flatUpdated = pipelineHelpers.flattenTree(updatedTree);
        localStorage.setItem("hierarchicalPipelines", JSON.stringify(flatUpdated));
        setPipeline(updated);
        
        const stage = updated.stages.find(s => s.name === "RFQ");
        if (stage) {
          setRfqStage(stage);
        }
      } catch (error) {
        console.error("Failed to save pipeline:", error);
      }
    }
  };

  const openAcceptDialog = (item: PipelineItem) => {
    setDialogState({ 
      isOpen: true, 
      mode: 'accept', 
      item, 
      title: 'Confirm Acceptance',
      message: `Are you sure you want to accept the RFQ for "${item.company_name}" and move it to Feasibility?`
    });
  };

  const openRejectDialog = (item: PipelineItem) => {
    setRejectionReason("");
    setDialogState({
      isOpen: true,
      mode: 'reject',
      item,
      title: 'Reject RFQ',
      message: `Please provide a reason for rejecting the RFQ from "${item.company_name}".`
    });
  };

  const openDeleteDialog = (item: PipelineItem) => {
    setDialogState({
      isOpen: true,
      mode: 'delete',
      item,
      title: 'Confirm Deletion',
      message: 'Are you sure you want to permanently delete this RFQ? This action cannot be undone.'
    });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, mode: 'none', item: null, message: '', title: '' });
  };
  
  const handleConfirmAccept = () => {
    if (!pipeline || !rfqStage || !dialogState.item) return;

    const itemToMove = dialogState.item;
    
    // Move item from RFQ to Feasibility stage
    const updated = {
      ...pipeline,
      stages: pipeline.stages.map(stage => {
        if (stage.name === "RFQ") {
          return { ...stage, items: stage.items.filter(item => item.id !== itemToMove.id) };
        }
        if (stage.name === "Feasibility") {
          return { ...stage, items: [...stage.items, itemToMove] };
        }
        return stage;
      })
    };

    savePipeline(updated);
    
    setDialogState({ 
      isOpen: true, 
      mode: 'accept_success',
      item: null, 
      title: 'Success', 
      message: `'${itemToMove.company_name}' accepted and moved to Feasibility.` 
    });
  };

  const handleConfirmReject = () => {
    if (!pipeline || !rfqStage || !dialogState.item) return;
    if (rejectionReason.trim() === "") {
      alert("Rejection reason cannot be empty.");
      return;
    }

    const itemToReject = dialogState.item;
    
    // Move to Closed Deals stage with rejection info
    const updated = {
      ...pipeline,
      stages: pipeline.stages.map(stage => {
        if (stage.name === "RFQ") {
          return { ...stage, items: stage.items.filter(item => item.id !== itemToReject.id) };
        }
        if (stage.name === "Closed Deals") {
          const rejectedItem = {
            ...itemToReject,
            state: "Rejected",
            description: `${itemToReject.description}\n\nRejection Reason: ${rejectionReason}`
          };
          return { ...stage, items: [...stage.items, rejectedItem] };
        }
        return stage;
      })
    };

    savePipeline(updated);
    
    setDialogState({ 
      isOpen: true, 
      mode: 'success', 
      item: null, 
      title: 'Success', 
      message: `'${itemToReject.company_name}' has been rejected and moved to Closed Deals.` 
    });
  };

  const handleConfirmDelete = () => {
    if (!pipeline || !rfqStage || !dialogState.item) return;

    const updated = {
      ...pipeline,
      stages: pipeline.stages.map(stage =>
        stage.name === "RFQ"
          ? { ...stage, items: stage.items.filter(item => item.id !== dialogState.item?.id) }
          : stage
      )
    };

    savePipeline(updated);
    closeDialog();
  };
  
  const handleSuccessAndNavigate = () => {
    closeDialog();
    router.push(`/crm/pipelines/${pipelineId}/feasibility`);
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

  if (!pipeline || !rfqStage) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Pipeline not found.</p>
          <button
            onClick={() => router.push('/crm/pipelines')}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Back to Pipelines
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-700">RFQ (Request for Quotation)</h1>
          <p className="text-sm text-gray-600 mt-1">Pipeline: {pipeline.name}</p>
        </div>
        <button 
          onClick={() => router.push(`/crm/pipelines/${pipelineId}/rfq/new`)} 
          className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700"
        >
          + Add RFQ
        </button>
      </div>
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
            {rfqStage.items.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No RFQs found.</td></tr>
            ) : (
              rfqStage.items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-green-50">
                  <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                  <td className="p-2 border">{item.company_name}</td>
                  <td className="p-2 border">
                    {item.deadline ? format(new Date(item.deadline), "dd/MM/yyyy") : "-"}
                  </td>
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
                        onClick={() => router.push(`/crm/pipelines/${pipelineId}/rfq/${item.id}/view`)} 
                        className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => router.push(`/crm/pipelines/${pipelineId}/rfq/${item.id}/edit`)} 
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
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <Dialog />
    </div>
  );
}
