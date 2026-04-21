"use client";

import { setIndexedDbItem } from "@/utils/indexedDbStorage";
import { format, isPast } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// --- UPDATED TYPE DEFINITIONS ---
export type StageHistory = {
    stage: string;
    date: string;
};

export type WorkingTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    status?: "Completed" | "Over Due" | "Working Within Deadline";
    approved?: "Yes" | "Rework";
    notes?: string;
    admin_status?: "Not Approved" | "Approved" | "Rework";
    admin_remark?: string;
};

export type ProjectTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    status?: "Completed" | "Over Due" | "Working Within Deadline";
    notes?: string;
    admin_status?: "Not Approved" | "Approved" | "Rework";
    admin_remark?: string;
    final_fileName?: string;
};

export type SupplierDetail = {
    s_no: number;
    component_type: "Active" | "Passive";
    manufacturer_part_number: string;
    vendor_details: string;
    currency: string;
    percentage: number;
    req_quantity: number;
    excise_quantity: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    qc2_status?: "Not Sent" | "Pending QC2" | "QC2 Rework Required" | "Approved" | "Rejected";
    qc2_remark?: string;
    qc2_file?: string;
    qc2_file_url?: string;
    payment_request_status?: "Not Requested" | "Pending Approval" | "Paid";
    payment_request_id?: string;
};

export type PostProcessItem = {
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
    customer_notes: string;
    order_value: number;
    advance_payment: { amount: number; bank_details: string; date: string; };
    expense: number;
    profit: number;
    balance_due: number;
    subdeal_department?: string;
    project_handled_by: string;
    working_timeline: WorkingTimelineItem[];
    project_timeline: ProjectTimelineItem[];
    supplier_details?: SupplierDetail[];
    quotation_upload_reference?: string;
    po_document?: string;
    expense_bill_format: string;
    post_process_status: "Pending" | "Completed";
    stage_history?: StageHistory[]; // Added field
};


export default function PostProcessListPage() {
    const router = useRouter();
    const params = useParams();
    const pipelineId = params?.pipelineId as string;
    const [items, setItems] = useState<PostProcessItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedRowsByItem, setSelectedRowsByItem] = useState<Record<string, number[]>>({});
    const [invoiceDraftByItem, setInvoiceDraftByItem] = useState<Record<string, { name: string; dataUrl: string }>>({});
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        item: null as PostProcessItem | null,
        mode: 'none' as 'delete' | 'none'
    });

    useEffect(() => {
        const storedData = localStorage.getItem("postprocessData");
        if (storedData) {
            // Corrected: Replaced 'any' with a more specific partial type for safety
            const parsedData: PostProcessItem[] = JSON.parse(storedData).map((item: Partial<PostProcessItem>) => ({
                ...item,
                id: item.id || uuidv4(),
                working_timeline: Array.isArray(item.working_timeline) ? item.working_timeline : [],
                project_timeline: Array.isArray(item.project_timeline) ? item.project_timeline : [],
                stage_history: Array.isArray(item.stage_history) ? item.stage_history : [], // Added sanitization
            } as PostProcessItem)); // Asserting the final shape after sanitization
            setItems(parsedData);
        }
    }, []);

    const updateLocalStorage = (updatedItems: PostProcessItem[]) => {
        localStorage.setItem("postprocessData", JSON.stringify(updatedItems));
    };

    const closeDialog = () => setDialogState({ isOpen: false, item: null, mode: 'none' });

    const openDeleteDialog = (item: PostProcessItem) => {
        setDialogState({ isOpen: true, item, mode: 'delete' });
    };

    const handleConfirmDelete = () => {
        if (!dialogState.item) return;
        const updatedItems = items.filter((item) => item.id !== dialogState.item!.id);
        setItems(updatedItems);
        updateLocalStorage(updatedItems);
        closeDialog();
    };

    const formatCurrency = (value: number) => (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const toggleView = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const toggleSupplierSelection = (itemId: string, rowNo: number) => {
        setSelectedRowsByItem((prev) => {
            const selected = prev[itemId] || [];
            const exists = selected.includes(rowNo);
            return {
                ...prev,
                [itemId]: exists ? selected.filter((no) => no !== rowNo) : [...selected, rowNo],
            };
        });
    };

    const handleInvoiceChange = (itemId: string, file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            setInvoiceDraftByItem((prev) => ({
                ...prev,
                [itemId]: {
                    name: file.name,
                    dataUrl,
                },
            }));
        };
        reader.readAsDataURL(file);
    };

    const sendPaymentRequest = async (item: PostProcessItem) => {
        const selectedRows = selectedRowsByItem[item.id] || [];
        const invoice = invoiceDraftByItem[item.id];

        if (selectedRows.length === 0) {
            alert("Please select at least one component.");
            return;
        }
        if (!invoice?.dataUrl) {
            alert("Please upload invoice for selected components.");
            return;
        }

        const now = new Date().toISOString();
        const requestId = crypto.randomUUID();
        const fileKey = `payment_invoice_postprocess_${item.id}_${Date.now()}`;
        await setIndexedDbItem(fileKey, invoice.dataUrl);

        const selectedDetails = (item.supplier_details || []).filter((row) => selectedRows.includes(row.s_no));
        const currentUser = localStorage.getItem("currentUser") || item.project_handled_by || "Employee";

        const allRequests = JSON.parse(localStorage.getItem("paymentRequests") || "[]");
        allRequests.push({
            id: requestId,
            pipelineId,
            source_stage: "postprocess",
            source_item_id: item.id,
            company_name: item.company_name,
            requested_by: currentUser,
            requested_date: now,
            status: "Pending",
            invoice_name: invoice.name,
            invoice_file_key: fileKey,
            component_snos: selectedRows,
            components: selectedDetails,
        });
        localStorage.setItem("paymentRequests", JSON.stringify(allRequests));

        const updatedItems = items.map((entry) => {
            if (entry.id !== item.id) return entry;
            return {
                ...entry,
                supplier_details: (entry.supplier_details || []).map((row) =>
                    selectedRows.includes(row.s_no)
                        ? {
                              ...row,
                            payment_request_status: "Pending Approval" as const,
                              payment_request_id: requestId,
                          }
                        : row
                ),
                stage_history: [...(entry.stage_history || []), { stage: "Payment Requested", date: now }],
            };
        });

        setItems(updatedItems);
        updateLocalStorage(updatedItems);
        setSelectedRowsByItem((prev) => ({ ...prev, [item.id]: [] }));
        setInvoiceDraftByItem((prev) => {
            const next = { ...prev };
            delete next[item.id];
            return next;
        });
        alert("Payment request sent to admin.");
    };

    const openFile = (fileUrl?: string) => {
        if (!fileUrl) return;
        if (!fileUrl.startsWith("data:")) {
            window.open(fileUrl, "_blank", "noopener,noreferrer");
            return;
        }

        try {
            const [meta, base64] = fileUrl.split(",");
            if (!meta || !base64) {
                window.open(fileUrl, "_blank", "noopener,noreferrer");
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
            window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
    };

    const getProjectStatus = (item: PostProcessItem) => {
        const allTimelines = [...item.working_timeline, ...item.project_timeline];
        if (allTimelines.length === 0) return { text: "In Progress", color: "blue" };
        const isOverdue = allTimelines.some((t) => t.deadline && isPast(new Date(t.deadline)));
        if (isOverdue) return { text: "At Risk", color: "red" };
        return { text: "Completed", color: "green" };
    };

    const getQc2Status = (item: PostProcessItem) => {
        const rows = Array.isArray(item.supplier_details) ? item.supplier_details : [];
        if (rows.length === 0) return { text: "Not Sent", color: "gray" as const };

        const statuses = rows.map((row) => row.qc2_status || "Not Sent");
        if (statuses.some((s) => s === "Pending QC2")) return { text: "Pending QC2", color: "yellow" as const };
        if (statuses.some((s) => s === "QC2 Rework Required" || s === "Rejected")) return { text: "Not Approved", color: "red" as const };
        if (statuses.some((s) => s === "Approved")) return { text: "QC2 Approved", color: "green" as const };
        return { text: "Not Sent", color: "gray" as const };
    };

    return (
        <div className="min-h-screen p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-green-700">Post Process (Ongoing Projects)</h1>
            </div>

            <div className="overflow-x-auto border rounded shadow">
                <table className="w-full border-collapse">
                    <thead className="text-green-800 bg-green-100">
                        <tr>{["Date", "Company", "Balance Due", "Project Status", "QC2 Status", "Actions"].map((h) => (<th key={h} className="p-2 text-left border">{h}</th>))}</tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((item) => {
                                const status = getProjectStatus(item);
                                const qc2Status = getQc2Status(item);
                                const rowClass = status.text === "At Risk" ? 'bg-red-50 border-l-4 border-red-500' : 'border-b';

                                return (
                                    <Fragment key={item.id}>
                                        <tr className={`${rowClass} hover:bg-green-50`}>
                                            <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                                            <td className="p-2 border">{item.company_name}</td>
                                            <td className="p-2 border font-semibold text-orange-600">{formatCurrency(item.balance_due)}</td>
                                            <td className="p-2 border">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color === 'red' ? 'bg-red-100 text-red-800' : status.color === 'green' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                            <td className="p-2 border">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    qc2Status.color === 'yellow'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : qc2Status.color === 'red'
                                                        ? 'bg-red-100 text-red-800'
                                                        : qc2Status.color === 'green'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {qc2Status.text}
                                                </span>
                                            </td>
                                            <td className="p-2 border">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button onClick={() => toggleView(item.id)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600 inline-flex items-center gap-1">
                                                        {expandedId === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                        {expandedId === item.id ? "Hide" : "View"}
                                                    </button>
                                                    <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/postprocess/${item.id}/edit`)} className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Edit</button>
                                                    <button onClick={() => openDeleteDialog(item)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button>
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedId === item.id && (
                                            <tr className="bg-gray-50 border-b">
                                                <td colSpan={7} className="p-4 border">
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <div>
                                                                <p className="text-xs text-gray-500">Date</p>
                                                                <p className="font-medium text-gray-800">{item.date ? format(new Date(item.date), "dd/MM/yyyy") : "-"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Department</p>
                                                                <p className="font-medium text-gray-800">{item.department || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">Contact</p>
                                                                <p className="font-medium text-gray-800">{item.contact || "-"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500">State</p>
                                                                <p className="font-medium text-gray-800">{item.state || "-"}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                                                            <div className="bg-blue-50 border border-blue-100 rounded p-3">
                                                                <p className="text-xs text-blue-700">Order Value</p>
                                                                <p className="font-semibold text-blue-900">{formatCurrency(item.order_value)}</p>
                                                            </div>
                                                            <div className="bg-yellow-50 border border-yellow-100 rounded p-3">
                                                                <p className="text-xs text-yellow-700">Advance Payment</p>
                                                                <p className="font-semibold text-yellow-900">{formatCurrency(item.advance_payment?.amount || 0)}</p>
                                                            </div>
                                                            <div className="bg-red-50 border border-red-100 rounded p-3">
                                                                <p className="text-xs text-red-700">Expense</p>
                                                                <p className="font-semibold text-red-900">{formatCurrency(item.expense)}</p>
                                                            </div>
                                                            <div className="bg-purple-50 border border-purple-100 rounded p-3">
                                                                <p className="text-xs text-purple-700">Profit</p>
                                                                <p className="font-semibold text-purple-900">{formatCurrency(item.profit)}</p>
                                                            </div>
                                                            <div className="bg-orange-50 border border-orange-100 rounded p-3">
                                                                <p className="text-xs text-orange-700">Balance Due</p>
                                                                <p className="font-semibold text-orange-900">{formatCurrency(item.balance_due)}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50 border border-blue-100 rounded p-3">
                                                            <p><span className="font-semibold text-blue-700">Quotation Upload Reference:</span> {item.quotation_upload_reference || item.fileName || "Not uploaded"}</p>
                                                            <p><span className="font-semibold text-blue-700">Email Confirmation / PO:</span> {item.po_document || "Not uploaded"}</p>
                                                        </div>

                                                        {item.working_timeline.length > 0 && (
                                                            <div className="border rounded bg-white">
                                                                <div className="px-3 py-2 border-b bg-gray-100">
                                                                    <p className="text-sm font-semibold text-gray-800">Working Timeline</p>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="p-2 text-left">S.No</th>
                                                                                <th className="p-2 text-left">Description</th>
                                                                                <th className="p-2 text-left">Deadline</th>
                                                                                <th className="p-2 text-left">Super Admin Status</th>
                                                                                <th className="p-2 text-left">Super Admin Remark</th>
                                                                                <th className="p-2 text-left">Notes</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {item.working_timeline.map((row, idx) => (
                                                                                <tr key={idx} className="border-t">
                                                                                    <td className="p-2">{row.s_no}</td>
                                                                                    <td className="p-2">{row.description || "-"}</td>
                                                                                    <td className="p-2">{row.deadline ? format(new Date(row.deadline), "dd/MM/yyyy") : "-"}</td>
                                                                                    <td className="p-2">{row.admin_status || "Not Approved"}</td>
                                                                                    <td className="p-2">{row.admin_remark || "-"}</td>
                                                                                    <td className="p-2">{row.notes || "-"}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.project_timeline.length > 0 && (
                                                            <div className="border rounded bg-white">
                                                                <div className="px-3 py-2 border-b bg-gray-100">
                                                                    <p className="text-sm font-semibold text-gray-800">Project Timeline</p>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="p-2 text-left">S.No</th>
                                                                                <th className="p-2 text-left">Description</th>
                                                                                <th className="p-2 text-left">Deadline</th>
                                                                                <th className="p-2 text-left">Super Admin Status</th>
                                                                                <th className="p-2 text-left">Super Admin Remark</th>
                                                                                <th className="p-2 text-left">Notes</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {item.project_timeline.map((row, idx) => (
                                                                                <tr key={idx} className="border-t">
                                                                                    <td className="p-2">{row.s_no}</td>
                                                                                    <td className="p-2">{row.description || "-"}</td>
                                                                                    <td className="p-2">{row.deadline ? format(new Date(row.deadline), "dd/MM/yyyy") : "-"}</td>
                                                                                    <td className="p-2">{row.admin_status || "Not Approved"}</td>
                                                                                    <td className="p-2">{row.admin_remark || "-"}</td>
                                                                                    <td className="p-2">{row.notes || "-"}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {Array.isArray(item.supplier_details) && item.supplier_details.length > 0 && (
                                                            <div className="border rounded bg-white">
                                                                <div className="px-3 py-2 border-b bg-gray-100">
                                                                    <p className="text-sm font-semibold text-gray-800">Supplier Details</p>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full min-w-[900px] text-sm">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="p-2 text-left">Select</th>
                                                                                <th className="p-2 text-left">S.No</th>
                                                                                <th className="p-2 text-left">Type</th>
                                                                                <th className="p-2 text-left">Manufacturer - Part Number</th>
                                                                                <th className="p-2 text-left">Vendor</th>
                                                                                <th className="p-2 text-left">Currency</th>
                                                                                <th className="p-2 text-right">Percentage</th>
                                                                                <th className="p-2 text-right">Quantity</th>
                                                                                <th className="p-2 text-right">Req Qty</th>
                                                                                <th className="p-2 text-right">Excise Qty</th>
                                                                                <th className="p-2 text-right">Unit Price</th>
                                                                                <th className="p-2 text-right">Total</th>
                                                                                <th className="p-2 text-left">QC2 Status</th>
                                                                                <th className="p-2 text-left">QC2 Remark</th>
                                                                                <th className="p-2 text-left">QC2 File</th>
                                                                                <th className="p-2 text-left">Payment</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {item.supplier_details.map((row, idx) => (
                                                                                <tr
                                                                                    key={idx}
                                                                                    className={`border-t ${
                                                                                        row.payment_request_status === "Paid"
                                                                                            ? "bg-green-50"
                                                                                            : row.payment_request_status === "Pending Approval"
                                                                                            ? "bg-yellow-50"
                                                                                            : ""
                                                                                    }`}
                                                                                >
                                                                                    <td className="p-2">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={(selectedRowsByItem[item.id] || []).includes(row.s_no)}
                                                                                            onChange={() => toggleSupplierSelection(item.id, row.s_no)}
                                                                                        />
                                                                                    </td>
                                                                                    <td className="p-2">{row.s_no}</td>
                                                                                    <td className="p-2">{row.component_type || "-"}</td>
                                                                                    <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                                                                                    <td className="p-2">{row.vendor_details || "-"}</td>
                                                                                    <td className="p-2">{row.currency || "INR"}</td>
                                                                                    <td className="p-2 text-right">{row.percentage || 0}%</td>
                                                                                    <td className="p-2 text-right">{row.quantity || 0}</td>
                                                                                    <td className="p-2 text-right">{row.req_quantity || 0}</td>
                                                                                    <td className="p-2 text-right">{row.excise_quantity || 0}</td>
                                                                                    <td className="p-2 text-right">{(row.unit_price || 0).toLocaleString("en-IN")}</td>
                                                                                    <td className="p-2 text-right">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                                                                                    <td className="p-2">{row.qc2_status === "QC2 Rework Required" || row.qc2_status === "Rejected" ? "Not Approved" : row.qc2_status || "Not Sent"}</td>
                                                                                    <td className="p-2">{row.qc2_remark || "-"}</td>
                                                                                    <td className="p-2">
                                                                                        {row.qc2_file ? (
                                                                                            <div className="space-y-1">
                                                                                                <p className="text-xs text-gray-700 truncate" title={row.qc2_file}>{row.qc2_file}</p>
                                                                                                {row.qc2_file_url && (
                                                                                                    <button type="button" onClick={() => openFile(row.qc2_file_url)} className="text-xs text-blue-600 hover:underline">
                                                                                                        View file
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            "-"
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="p-2">
                                                                                        <span
                                                                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                                                                row.payment_request_status === "Paid"
                                                                                                    ? "bg-green-100 text-green-800"
                                                                                                    : row.payment_request_status === "Pending Approval"
                                                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                                                    : "bg-gray-100 text-gray-700"
                                                                                            }`}
                                                                                        >
                                                                                            {row.payment_request_status || "Not Requested"}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                <div className="px-3 py-3 border-t bg-gray-50 flex flex-wrap items-center gap-3">
                                                                    <input
                                                                        type="file"
                                                                        onChange={(e) => handleInvoiceChange(item.id, e.target.files?.[0] || null)}
                                                                        className="text-xs"
                                                                    />
                                                                    {invoiceDraftByItem[item.id]?.name && (
                                                                        <span className="text-xs text-gray-600">Invoice: {invoiceDraftByItem[item.id]?.name}</span>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => sendPaymentRequest(item)}
                                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                                                                    >
                                                                        Send Selected For Payment Request
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        ) : (
                            <tr><td colSpan={6} className="p-4 text-center text-gray-500">No projects in Post Process.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {dialogState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800">Confirm Deletion</h2>
                        <p className="mt-3 text-gray-600">{`Are you sure you want to delete this project for "${dialogState.item?.company_name}"?`}</p>
                        <div className="flex justify-end mt-6 space-x-4">
                            <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                            {dialogState.mode === 'delete' && <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

