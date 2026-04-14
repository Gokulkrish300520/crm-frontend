"use client";

import { format } from "date-fns";
import { Bell, CheckCircle, ChevronDown, ChevronUp, Clock, Eye, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

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
    const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
    const [preprocessData, setPreprocessData] = useState<PreprocessItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
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

    const handleView = (itemId: string) => {
        setExpandedId(prev => (prev === itemId ? null : itemId));
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
                        <div className="hidden md:grid md:grid-cols-6 gap-3 bg-white border rounded-lg px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <p>Request</p>
                            <p>Requested By</p>
                            <p>Requested Date & Time</p>
                            <p>Status</p>
                            <p>Updated Status Time</p>
                            <p className="text-right">Action</p>
                        </div>

                        {approvalRequests.map(request => {
                            const item = getItemDetails(request.id);
                            if (!item) return null;

                            const statusUpdatedAt = item.last_reminder_date || request.last_reminder || item.approval_requested_date || request.requested_date;

                            return (
                                <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => handleView(request.id)}
                                        className="w-full text-left px-4 py-4"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start md:items-center">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">New Admin Request</p>
                                                <p className="text-xs text-gray-500 md:hidden">Request</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-800">{request.requested_by || item.project_handled_by || "-"}</p>
                                                <p className="text-xs text-gray-500 md:hidden">Requested By</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-800">{format(new Date(request.requested_date), "dd/MM/yyyy hh:mm a")}</p>
                                                <p className="text-xs text-gray-500 md:hidden">Requested Date & Time</p>
                                            </div>
                                            <div>
                                                <span className="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full inline-flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Pending Approval
                                                </span>
                                                <p className="text-xs text-gray-500 md:hidden mt-1">Status</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-800">{statusUpdatedAt ? format(new Date(statusUpdatedAt), "dd/MM/yyyy hh:mm a") : "-"}</p>
                                                <p className="text-xs text-gray-500 md:hidden">Updated Status Time</p>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 text-blue-700 font-semibold text-sm">
                                                <Eye className="h-4 w-4" />
                                                {expandedId === request.id ? "Hide Details" : "View Details"}
                                                {expandedId === request.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </div>
                                        </div>
                                    </button>

                                    {expandedId === request.id && (
                                        <div className="border-t px-4 pb-4">
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">Company</p>
                                                    <p className="font-medium text-gray-800">{item.company_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Department</p>
                                                    <p className="font-medium text-gray-800">{item.department}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Order Value</p>
                                                    <p className="font-medium text-gray-800">
                                                        {(item.order_value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Handled By</p>
                                                    <p className="font-medium text-gray-800">{item.project_handled_by || "-"}</p>
                                                </div>
                                            </div>

                                            {!!request.last_reminder && (
                                                <div className="mb-4 inline-flex items-center gap-1 text-orange-600 text-sm">
                                                    <Bell className="h-4 w-4" />
                                                    <span><strong>Last Reminder:</strong> {format(new Date(request.last_reminder), "MMM dd, yyyy hh:mm a")}</span>
                                                </div>
                                            )}

                                            {Array.isArray(item.working_timeline) && item.working_timeline.length > 0 && (
                                                <div className="mb-4 border rounded-lg p-3">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Working Timeline</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="p-2 text-left">S.No</th>
                                                                    <th className="p-2 text-left">Description</th>
                                                                    <th className="p-2 text-left">Deadline</th>
                                                                    <th className="p-2 text-left">Approved</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.working_timeline.map((row: any, idx: number) => (
                                                                    <tr key={idx} className="border-t">
                                                                        <td className="p-2">{row.s_no}</td>
                                                                        <td className="p-2">{row.description || "-"}</td>
                                                                        <td className="p-2">{row.deadline ? format(new Date(row.deadline), "dd/MM/yyyy") : "-"}</td>
                                                                        <td className="p-2">{row.approved || "-"}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {Array.isArray(item.project_timeline) && item.project_timeline.length > 0 && (
                                                <div className="mb-4 border rounded-lg p-3">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Project Timeline</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="p-2 text-left">S.No</th>
                                                                    <th className="p-2 text-left">Description</th>
                                                                    <th className="p-2 text-left">Deadline</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.project_timeline.map((row: any, idx: number) => (
                                                                    <tr key={idx} className="border-t">
                                                                        <td className="p-2">{row.s_no}</td>
                                                                        <td className="p-2">{row.description || "-"}</td>
                                                                        <td className="p-2">{row.deadline ? format(new Date(row.deadline), "dd/MM/yyyy") : "-"}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {Array.isArray(item.supplier_details) && item.supplier_details.length > 0 && (
                                                <div className="mb-4 border rounded-lg p-3">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Supplier Details</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full min-w-[900px] text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="p-2 text-left">S.No</th>
                                                                    <th className="p-2 text-left">Type</th>
                                                                    <th className="p-2 text-left">Manufacturer - Part Number</th>
                                                                    <th className="p-2 text-left">Vendor</th>
                                                                    <th className="p-2 text-right">Req Qty</th>
                                                                    <th className="p-2 text-right">Excise Qty</th>
                                                                    <th className="p-2 text-right">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.supplier_details.map((row: any, idx: number) => (
                                                                    <tr key={idx} className="border-t">
                                                                        <td className="p-2">{row.s_no}</td>
                                                                        <td className="p-2">{row.component_type || "-"}</td>
                                                                        <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                                                                        <td className="p-2">{row.vendor_details || "-"}</td>
                                                                        <td className="p-2 text-right">{row.req_quantity || 0}</td>
                                                                        <td className="p-2 text-right">{row.excise_quantity || 0}</td>
                                                                        <td className="p-2 text-right">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 justify-end">
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
                                    )}
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
