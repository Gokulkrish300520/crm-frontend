"use client";

import { getIndexedDbItem, setIndexedDbItem } from "@/utils/indexedDbStorage";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PaymentApprovalRequest = {
    id: string;
    postprocessId: string;
    pipelineId: string;
    supplierIndex: number;
    supplierRow: any;
    requestedDate: string;
    requestedBy: string;
    status: "Pending" | "Approved";
    paymentReceiptName?: string;
    paymentReceiptFileKey?: string;
    approvedDate?: string;
    approvedBy?: string;
};

function sanitizeSupplierRow(supplierRow: any) {
    if (!supplierRow) return supplierRow;

    const { payment_receipt_url, qc2_image_upload_url, test_report_upload_url, ...safeRow } = supplierRow;
    return safeRow;
}

async function dataUrlToBlob(dataUrl: string) {
    const response = await fetch(dataUrl);
    return response.blob();
}

export default function PaymentApprovalsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<PaymentApprovalRequest[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        void loadRequests();
    }, []);

    const loadRequests = async () => {
        const stored = localStorage.getItem("paymentApprovalRequests") || "[]";
        const parsedRequests: any[] = JSON.parse(stored);

        let needsPersist = false;
        const normalizedRequests = await Promise.all(
            parsedRequests.map(async (request) => {
                const nextRequest = {
                    ...request,
                    supplierRow: sanitizeSupplierRow(request.supplierRow),
                };

                if (request.paymentReceiptUrl && !request.paymentReceiptFileKey) {
                    const fileKey = `payment_receipt_${request.id}`;

                    try {
                        await setIndexedDbItem(fileKey, await dataUrlToBlob(request.paymentReceiptUrl));
                        nextRequest.paymentReceiptFileKey = fileKey;
                        needsPersist = true;
                    } catch (error) {
                        console.error("Failed to migrate payment receipt into IndexedDB", error);
                    }
                }

                if (request.paymentReceiptUrl || nextRequest.supplierRow !== request.supplierRow) {
                    needsPersist = true;
                }

                delete nextRequest.paymentReceiptUrl;
                return nextRequest;
            })
        );

        if (needsPersist) {
            localStorage.setItem("paymentApprovalRequests", JSON.stringify(normalizedRequests));
        }

        setRequests(normalizedRequests as PaymentApprovalRequest[]);
    };

    const handleApprovePayment = (requestId: string, file: File | null) => {
        if (!file) {
            alert("Please upload a payment receipt.");
            return;
        }

        setProcessingId(requestId);
        void (async () => {
            const request = requests.find((r) => r.id === requestId);
            if (!request) {
                setProcessingId(null);
                return;
            }

            const now = new Date().toISOString();
            const currentUser = localStorage.getItem("currentUser") || "Current User";
            const fileKey = `payment_receipt_${requestId}`;

            try {
                await setIndexedDbItem(fileKey, file);

                const updatedRequests = requests.map((r) =>
                    r.id === requestId
                        ? {
                              ...r,
                              supplierRow: sanitizeSupplierRow(r.supplierRow),
                              status: "Approved" as const,
                              paymentReceiptName: file.name,
                              paymentReceiptFileKey: fileKey,
                              approvedDate: now,
                              approvedBy: currentUser,
                          }
                        : {
                              ...r,
                              supplierRow: sanitizeSupplierRow(r.supplierRow),
                          }
                );

                setRequests(updatedRequests);
                localStorage.setItem("paymentApprovalRequests", JSON.stringify(updatedRequests));

                const postprocessData: any[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
                const updatedPostprocess = postprocessData.map((item) => {
                    if (item.id !== request.postprocessId) return item;

                    const updatedSuppliers = (item.supplier_details || []).map((supplier: any, index: number) => {
                        if (index !== request.supplierIndex) return supplier;

                        return {
                            ...supplier,
                            payment_request_status: "Payment Completed",
                            payment_completed_date: now,
                            payment_completed_by: currentUser,
                        };
                    });

                    return { ...item, supplier_details: updatedSuppliers };
                });

                localStorage.setItem("postprocessData", JSON.stringify(updatedPostprocess));

                setProcessingId(null);
                alert("Payment approved and receipt uploaded successfully.");
                await loadRequests();
            } catch (error) {
                console.error("Error approving payment:", error);
                alert("Failed to approve payment. Storage limit may be exceeded.");
                setProcessingId(null);
            }
        })();
    };

    const openFile = async (fileKey?: string) => {
        if (!fileKey) return;

        try {
            const storedValue = await getIndexedDbItem<Blob | string>(fileKey);

            if (!storedValue) {
                alert("File not found.");
                return;
            }

            if (storedValue instanceof Blob) {
                const blobUrl = URL.createObjectURL(storedValue);
                window.open(blobUrl, "_blank", "noopener,noreferrer");
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                return;
            }

            if (!storedValue.startsWith("data:")) {
                window.open(storedValue, "_blank", "noopener,noreferrer");
                return;
            }

            try {
                const [meta, base64] = storedValue.split(",");
                if (!meta || !base64) {
                    window.open(storedValue, "_blank", "noopener,noreferrer");
                    return;
                }

                const mimeMatch = meta.match(/data:(.*?);base64/);
                const mime = mimeMatch?.[1] || "application/octet-stream";
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) {
                    bytes[i] = binary.charCodeAt(i);
                }

                const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
                window.open(blobUrl, "_blank", "noopener,noreferrer");
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
            } catch {
                window.open(storedValue, "_blank", "noopener,noreferrer");
            }
        } catch (error) {
            console.error("Error opening file:", error);
            alert("Failed to open file.");
        }
    };

    const pendingRequests = requests.filter((r) => r.status === "Pending");
    const approvedRequests = requests.filter((r) => r.status === "Approved");

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-green-700">Payment Approval Requests</h1>
                    <p className="text-gray-600 mt-2">Manage payment approval requests from QC2 approved items</p>
                </header>

                {/* Pending Requests */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Pending Approvals ({pendingRequests.length})</h2>
                    {pendingRequests.length === 0 ? (
                        <div className="p-6 bg-white border rounded-lg text-center text-gray-500">
                            No pending payment approval requests.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingRequests.map((request) => (
                                <div key={request.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                        className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">
                                                Supplier: {request.supplierRow?.vendor_details || "Unknown"}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Requested on {new Date(request.requestedDate).toLocaleDateString()} by {request.requestedBy}
                                            </p>
                                        </div>
                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 mr-4">
                                            Pending Approval
                                        </span>
                                        {expandedId === request.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>

                                    {expandedId === request.id && (
                                        <div className="px-4 pb-4 border-t">
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <label className="block text-gray-600 font-medium">Component Type</label>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded">{request.supplierRow?.component_type || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-600 font-medium">Manufacturer - Part Number</label>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded break-words">{request.supplierRow?.manufacturer_part_number || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-600 font-medium">Vendor Details</label>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded break-words">{request.supplierRow?.vendor_details || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-600 font-medium">Currency</label>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded">{request.supplierRow?.currency || "-"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-600 font-medium">Quantity (Excise)</label>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded">{request.supplierRow?.excise_quantity ?? 0}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-600 font-medium">Total Price</label>
                                                    <p className="mt-1 p-2 bg-gray-50 rounded font-semibold">
                                                        {(request.supplierRow?.total_price || 0).toLocaleString("en-IN")}
                                                    </p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-gray-600 font-medium">QC2 Image</label>
                                                    <div className="mt-1 p-2 bg-gray-50 rounded">
                                                        {request.supplierRow?.qc2_image_upload ? (
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-gray-600">{request.supplierRow.qc2_image_upload}</p>
                                                                {request.supplierRow?.qc2_image_upload_url && (
                                                                    <button type="button" onClick={() => openFile(request.supplierRow.qc2_image_upload_url)} className="text-xs text-blue-600 hover:underline">View Image</button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-red-500 font-semibold">Missing</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 border rounded-lg p-4 bg-blue-50">
                                                <h3 className="font-semibold text-gray-800 mb-3">Approve & Upload Payment Receipt</h3>
                                                <div className="space-y-3">
                                                    <input
                                                        type="file"
                                                        id={`receipt-${request.id}`}
                                                        onChange={(e) => {
                                                            if (processingId !== request.id) {
                                                                handleApprovePayment(request.id, e.target.files?.[0] || null);
                                                            }
                                                        }}
                                                        className="w-full p-2 border rounded bg-white text-sm"
                                                        disabled={processingId === request.id}
                                                    />
                                                    <p className="text-xs text-gray-600">Upload payment receipt/invoice</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Approved Requests */}
                {approvedRequests.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Completed Approvals ({approvedRequests.length})</h2>
                        <div className="space-y-3">
                            {approvedRequests.map((request) => (
                                <div key={request.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                        className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800">
                                                Supplier: {request.supplierRow?.vendor_details || "Unknown"}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Approved on {new Date(request.approvedDate || "").toLocaleDateString()} by {request.approvedBy}
                                            </p>
                                        </div>
                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mr-4">
                                            Completed
                                        </span>
                                        {expandedId === request.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>

                                    {expandedId === request.id && (
                                        <div className="px-4 pb-4 border-t">
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2">Payment Receipt:</p>
                                                {request.paymentReceiptFileKey ? (
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-gray-600">{request.paymentReceiptName}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => openFile(request.paymentReceiptFileKey)}
                                                            className="text-xs text-blue-600 hover:underline"
                                                        >
                                                            View Receipt
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No receipt uploaded</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
