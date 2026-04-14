"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle, XCircle, Eye, Clock, Bell } from "lucide-react";

type ApprovalRequest = {
    id: string;
    type: string;
    company_name: string;
    department: string;
    requested_by: string;
    requested_date: string;
    last_reminder?: string;
    pipelineId: string;
};

type PreprocessItem = {
    id: string;
    company_name: string;
    department: string;
    order_value: number;
    approval_status: string;
    approval_requested_date?: string;
    approval_requested_by?: string;
    last_reminder_date?: string;
    project_handled_by: string;
    [key: string]: any;
};

export default function ApprovalsPage() {
    const router = useRouter();
    const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
    const [preprocessData, setPreprocessData] = useState<PreprocessItem[]>([]);
    const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; itemId: string; pipelineId: string }>({ 
        isOpen: false, 
        itemId: '', 
        pipelineId: '' 
    });
    const [rejectionReason, setRejectionReason] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const requests = JSON.parse(localStorage.getItem("approvalRequests") || "[]");
        const preprocess = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        
        // Filter for pending approvals only
        const pendingRequests = requests.filter((req: ApprovalRequest) => {
            const item = preprocess.find((p: PreprocessItem) => p.id === req.id);
            return item && item.approval_status === "Pending Approval";
        });
        
        setApprovalRequests(pendingRequests);
        setPreprocessData(preprocess);
    };

    const handleApprove = (itemId: string, pipelineId: string) => {
        const data = [...preprocessData];
        const itemIndex = data.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            const approvedItem = data[itemIndex];
            
            // Move to postprocess
            const postprocessData = JSON.parse(localStorage.getItem("postprocessData") || "[]");
            
            // Create postprocess item with stage history
            const postprocessItem = {
                ...approvedItem,
                post_process_status: "Pending",
                stage_history: [
                    ...(approvedItem.stage_history || []),
                    {
                        stage: "Preprocess",
                        date: new Date().toISOString()
                    },
                    {
                        stage: "Postprocess",
                        date: new Date().toISOString()
                    }
                ],
                approved_date: new Date().toISOString(),
                approved_by: "Admin" // In production, use actual admin name
            };
            
            // Remove approval_status from postprocess item (not needed in postprocess)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { approval_status, approval_requested_date, approval_requested_by, last_reminder_date, ...itemWithoutApprovalFields } = postprocessItem;
            
            postprocessData.push(itemWithoutApprovalFields);
            localStorage.setItem("postprocessData", JSON.stringify(postprocessData));
            
            // REMOVE the item from preprocess data (it's now in postprocess)
            data.splice(itemIndex, 1);
            localStorage.setItem("preprocessData", JSON.stringify(data));
            
            // Remove from approval requests
            const requests = approvalRequests.filter(req => req.id !== itemId);
            localStorage.setItem("approvalRequests", JSON.stringify(requests));
            
            loadData();
            alert("Item approved successfully and moved to Post Process!");
        }
    };

    const handleReject = (itemId: string, pipelineId: string) => {
        setRejectionModal({ isOpen: true, itemId, pipelineId });
    };

    const confirmReject = () => {
        if (!rejectionReason.trim()) {
            alert("Please provide a reason for rejection");
            return;
        }

        const { itemId } = rejectionModal;
        const data = [...preprocessData];
        const itemIndex = data.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            data[itemIndex] = {
                ...data[itemIndex],
                approval_status: "Rejected",
                rejection_reason: rejectionReason,
            };
            
            localStorage.setItem("preprocessData", JSON.stringify(data));
            
            // Remove from approval requests
            const requests = approvalRequests.filter(req => req.id !== itemId);
            localStorage.setItem("approvalRequests", JSON.stringify(requests));
            
            setRejectionModal({ isOpen: false, itemId: '', pipelineId: '' });
            setRejectionReason("");
            loadData();
            alert("Item rejected. The user has been notified.");
        }
    };

    const handleView = (itemId: string, pipelineId: string) => {
        router.push(`/crm/pipelines/${pipelineId}/preprocess/${itemId}/edit`);
    };

    const getItemDetails = (requestId: string) => {
        return preprocessData.find(item => item.id === requestId);
    };

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-purple-700">Approval Requests</h1>
                    <p className="text-gray-600 mt-1">Review and approve preprocessing items</p>
                </header>

                {approvalRequests.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <CheckCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Approvals</h3>
                        <p className="text-gray-500">All approval requests have been processed.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {approvalRequests.map(request => {
                            const item = getItemDetails(request.id);
                            if (!item) return null;

                            return (
                                <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <h3 className="text-xl font-semibold text-gray-800">{item.company_name}</h3>
                                                <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Pending Approval
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">Department</p>
                                                    <p className="font-medium text-gray-800">{item.department}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Order Value</p>
                                                    <p className="font-medium text-gray-800">
                                                        {(item.order_value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Handled By</p>
                                                    <p className="font-medium text-gray-800">{item.project_handled_by}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Requested By</p>
                                                    <p className="font-medium text-gray-800">{request.requested_by}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span>
                                                    <strong>Requested:</strong> {format(new Date(request.requested_date), "MMM dd, yyyy 'at' hh:mm a")}
                                                </span>
                                                {request.last_reminder && (
                                                    <span className="flex items-center gap-1 text-orange-600">
                                                        <Bell className="h-4 w-4" />
                                                        <strong>Last Reminder:</strong> {format(new Date(request.last_reminder), "MMM dd, yyyy")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => handleView(request.id, request.pipelineId)}
                                                className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-2"
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleApprove(request.id, request.pipelineId)}
                                                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700 flex items-center gap-2"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(request.id, request.pipelineId)}
                                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700 flex items-center gap-2"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            {rejectionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Reject Approval Request</h2>
                        <p className="text-gray-600 mb-4">Please provide a reason for rejecting this request:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setRejectionModal({ isOpen: false, itemId: '', pipelineId: '' });
                                    setRejectionReason("");
                                }}
                                className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
