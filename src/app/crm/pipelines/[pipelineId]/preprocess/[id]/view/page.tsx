"use client";

import { format } from "date-fns";
import { AlertCircle, ArrowLeft, Building2, Calendar, CheckCircle, Clock, DollarSign, FileText, MapPin, Phone, TrendingUp, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SupplierDetail = {
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
    qc_status?: "Pending" | "Approved" | "Rejected";
    qc_remark?: string;
    qc_file?: string;
};

type QcHistoryEntry = {
    reviewed_at: string;
    reviewed_by: string;
    result: "QC1 Approved" | "QC1 Rework Required";
    summary: string;
    decisions: Array<{
        s_no: number;
        status: "Pending" | "Approved" | "Rejected";
        remark?: string;
        file?: string;
    }>;
};

type WorkingTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    approved: "Yes" | "Rework";
    upload_file?: string;
    notes?: string;
};

type ProjectTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    upload_file?: string;
    notes?: string;
};

type PreprocessItem = {
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
    qc_status?: "Not Sent" | "Pending QC1" | "QC1 Rework Required" | "QC1 Approved";
    qc_review_summary?: string;
    qc_history?: QcHistoryEntry[];
    approval_status: "Modification" | "Pending Approval" | "Approved" | "Rejected";
    approval_requested_date?: string;
    approval_requested_by?: string;
    last_reminder_date?: string;
    rejection_reason?: string;
    pipelineId?: string;
};

export default function ViewPreprocessPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    const [item, setItem] = useState<PreprocessItem | null>(null);

    useEffect(() => {
        if (id) {
            const storedData = localStorage.getItem("preprocessData") || "[]";
            const data: PreprocessItem[] = JSON.parse(storedData);
            const foundItem = data.find((item) => item.id === id);

            if (foundItem) {
                setItem(foundItem);
            } else {
                alert("Item not found!");
                router.push(`/crm/pipelines/${pipelineId}/preprocess`);
            }
        }
    }, [id, pipelineId, router]);

    if (!item) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    const getStatusBadge = (status: string) => {
        const statusColors = {
            "Modification": "bg-gray-100 text-gray-800",
            "Pending Approval": "bg-yellow-100 text-yellow-800",
            "Approved": "bg-green-100 text-green-800",
            "Rejected": "bg-red-100 text-red-800",
        };
        return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
    };

    const supplierDetails: SupplierDetail[] = Array.isArray(item.supplier_details)
        ? item.supplier_details
        : [];

    const supplierStats = supplierDetails.reduce(
        (acc, row) => {
            acc.totalRows += 1;
            acc.totalReqQty += Number(row.req_quantity) || 0;
            acc.totalQty += Number(row.quantity) || 0;
            acc.totalAmount += Number(row.total_price) || 0;
            return acc;
        },
        { totalRows: 0, totalReqQty: 0, totalQty: 0, totalAmount: 0 }
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/crm/pipelines/${pipelineId}/preprocess`)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Preprocess Details</h1>
                            <p className="text-gray-600">{item.company_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push(`/crm/pipelines/${pipelineId}/preprocess/${id}/edit`)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        Edit
                    </button>
                </div>

                {/* Approval Status Banner */}
                <div className={`mb-6 rounded-lg p-4 border-l-4 ${
                    item.approval_status === "Approved" ? "bg-green-50 border-green-500" :
                    item.approval_status === "Pending Approval" ? "bg-yellow-50 border-yellow-500" :
                    item.approval_status === "Rejected" ? "bg-red-50 border-red-500" :
                    "bg-gray-50 border-gray-500"
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {item.approval_status === "Approved" ? <CheckCircle className="text-green-600" size={24} /> :
                             item.approval_status === "Pending Approval" ? <Clock className="text-yellow-600" size={24} /> :
                             item.approval_status === "Rejected" ? <AlertCircle className="text-red-600" size={24} /> :
                             <FileText className="text-gray-600" size={24} />}
                            <div>
                                <p className="font-semibold text-gray-900">Approval Status: {item.approval_status}</p>
                                {item.approval_requested_by && (
                                    <p className="text-sm text-gray-600">
                                        Requested by {item.approval_requested_by} on {format(new Date(item.approval_requested_date!), "MMM dd, yyyy")}
                                    </p>
                                )}
                                {item.rejection_reason && (
                                    <p className="text-sm text-red-700 mt-1">
                                        <strong>Rejection Reason:</strong> {item.rejection_reason}
                                    </p>
                                )}
                            </div>
                        </div>
                        <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusBadge(item.approval_status)}`}>
                            {item.approval_status}
                        </span>
                    </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 className="text-blue-600" />
                        Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm text-gray-600">Date</label>
                            <p className="font-semibold text-gray-900">{format(new Date(item.date), "MMM dd, yyyy")}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Company Name</label>
                            <p className="font-semibold text-gray-900">{item.company_name}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Department</label>
                            <p className="font-semibold text-gray-900">{item.department}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Contact</label>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                <Phone size={16} className="text-gray-500" />
                                {item.contact}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">State</label>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin size={16} className="text-gray-500" />
                                {item.state}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Deadline</label>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar size={16} className="text-gray-500" />
                                {format(new Date(item.deadline), "MMM dd, yyyy")}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Source</label>
                            <p className="font-semibold text-gray-900">{item.source}</p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Project Handled By</label>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                <User size={16} className="text-gray-500" />
                                {item.project_handled_by}
                            </p>
                        </div>
                        {item.subdeal_department && (
                            <div>
                                <label className="text-sm text-gray-600">Subdeal Department</label>
                                <p className="font-semibold text-gray-900">{item.subdeal_department}</p>
                            </div>
                        )}
                    </div>
                    
                    {item.description && (
                        <div className="mt-4">
                            <label className="text-sm text-gray-600">Description</label>
                            <p className="font-semibold text-gray-900 mt-1">{item.description}</p>
                        </div>
                    )}
                    
                    {item.customer_notes && (
                        <div className="mt-4">
                            <label className="text-sm text-gray-600">Customer Notes</label>
                            <p className="font-semibold text-gray-900 mt-1 p-3 bg-gray-50 rounded">{item.customer_notes}</p>
                        </div>
                    )}
                </div>

                {/* Financials & Billing */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <DollarSign className="text-green-600" />
                        Financials & Billing
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <label className="text-sm text-blue-700">Order Value – Quotation subtotal</label>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(item.order_value)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <label className="text-sm text-red-700">Total Expense</label>
                            <p className="text-2xl font-bold text-red-900">{formatCurrency(item.expense)}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <label className="text-sm text-purple-700">Profit</label>
                            <p className="text-2xl font-bold text-purple-900">{formatCurrency(item.profit)}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <label className="text-sm text-orange-700">Balance Due</label>
                            <p className="text-2xl font-bold text-orange-900">{formatCurrency(item.balance_due)}</p>
                        </div>
                    </div>

                    {/* Supplier Details */}
                    {supplierDetails.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-gray-900 mb-3">Supplier Details</h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="rounded-lg border bg-gray-50 p-3">
                                    <p className="text-xs text-gray-500">Rows</p>
                                    <p className="text-lg font-bold text-gray-900">{supplierStats.totalRows}</p>
                                </div>
                                <div className="rounded-lg border bg-gray-50 p-3">
                                    <p className="text-xs text-gray-500">Total Req Qty</p>
                                    <p className="text-lg font-bold text-gray-900">{supplierStats.totalReqQty}</p>
                                </div>
                                <div className="rounded-lg border bg-gray-50 p-3">
                                    <p className="text-xs text-gray-500">Total Quantity</p>
                                    <p className="text-lg font-bold text-gray-900">{supplierStats.totalQty}</p>
                                </div>
                                <div className="rounded-lg border bg-gray-50 p-3">
                                    <p className="text-xs text-gray-500">Total Supplier Amount</p>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(supplierStats.totalAmount)}</p>
                                </div>
                            </div>

                            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full border-collapse min-w-[1200px]">
                                    <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
                                        <tr>
                                            <th className="p-3 text-left">S.No</th>
                                            <th className="p-3 text-left">Type</th>
                                            <th className="p-3 text-left">Manufacturer - Part Number</th>
                                            <th className="p-3 text-left">Vendor</th>
                                            <th className="p-3 text-left">Currency</th>
                                            <th className="p-3 text-right">%</th>
                                            <th className="p-3 text-right">Req Qty</th>
                                            <th className="p-3 text-right">Excise Qty</th>
                                            <th className="p-3 text-right">Qty</th>
                                            <th className="p-3 text-right">Unit Price</th>
                                            <th className="p-3 text-right">Total</th>
                                            <th className="p-3 text-left">QC Status</th>
                                            <th className="p-3 text-left">QC Remark</th>
                                            <th className="p-3 text-left">QC File</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplierDetails.map((detail, index) => (
                                            <tr key={index} className="border-t border-gray-200 hover:bg-gray-50 text-sm">
                                                <td className="p-3 font-medium">{detail.s_no}</td>
                                                <td className="p-3">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                                        detail.component_type === "Active"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-blue-100 text-blue-800"
                                                    }`}>
                                                        {detail.component_type}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-medium text-gray-900">{detail.manufacturer_part_number || "-"}</td>
                                                <td className="p-3 text-gray-700">{detail.vendor_details || "-"}</td>
                                                <td className="p-3">{detail.currency}</td>
                                                <td className="p-3 text-right">{detail.percentage}%</td>
                                                <td className="p-3 text-right">{detail.req_quantity}</td>
                                                <td className="p-3 text-right">{detail.excise_quantity}</td>
                                                <td className="p-3 text-right">{detail.quantity}</td>
                                                <td className="p-3 text-right">{formatCurrency(detail.unit_price)}</td>
                                                <td className="p-3 text-right font-bold text-gray-900">{formatCurrency(detail.total_price)}</td>
                                                <td className="p-3">{detail.qc_status || "Pending"}</td>
                                                <td className="p-3">{detail.qc_remark || "-"}</td>
                                                <td className="p-3">{detail.qc_file || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden space-y-3">
                                {supplierDetails.map((detail, index) => (
                                    <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-gray-900">Row #{detail.s_no}</p>
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                                detail.component_type === "Active"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-blue-100 text-blue-800"
                                            }`}>
                                                {detail.component_type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium">{detail.manufacturer_part_number || "-"}</p>
                                        <p className="text-xs text-gray-500 mt-1">Vendor: {detail.vendor_details || "-"}</p>

                                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                            <div className="rounded bg-gray-50 p-2">Currency: <span className="font-semibold">{detail.currency}</span></div>
                                            <div className="rounded bg-gray-50 p-2">%: <span className="font-semibold">{detail.percentage}</span></div>
                                            <div className="rounded bg-gray-50 p-2">Req Qty: <span className="font-semibold">{detail.req_quantity}</span></div>
                                            <div className="rounded bg-gray-50 p-2">Excise Qty: <span className="font-semibold">{detail.excise_quantity}</span></div>
                                            <div className="rounded bg-gray-50 p-2">Qty: <span className="font-semibold">{detail.quantity}</span></div>
                                            <div className="rounded bg-gray-50 p-2">Unit: <span className="font-semibold">{formatCurrency(detail.unit_price)}</span></div>
                                            <div className="rounded bg-gray-50 p-2">QC: <span className="font-semibold">{detail.qc_status || "Pending"}</span></div>
                                            <div className="rounded bg-gray-50 p-2 col-span-2">Remark: <span className="font-semibold">{detail.qc_remark || "-"}</span></div>
                                            <div className="rounded bg-gray-50 p-2 col-span-2">QC File: <span className="font-semibold">{detail.qc_file || "-"}</span></div>
                                        </div>

                                        <div className="mt-3 text-right">
                                            <p className="text-xs text-gray-500">Total</p>
                                            <p className="text-base font-bold text-gray-900">{formatCurrency(detail.total_price)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-2">Files From Negotiation</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <p><span className="font-medium text-blue-800">Quotation Upload Reference:</span> {item.quotation_upload_reference || item.fileName || "Not uploaded"}</p>
                                    <p><span className="font-medium text-blue-800">Email Confirmation / PO:</span> {item.po_document || "Not uploaded"}</p>
                                </div>
                            </div>

                            {item.qc_review_summary && (
                                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded">
                                    <p className="text-sm font-semibold text-indigo-800 mb-1">QC1 Summary</p>
                                    <p className="text-sm text-indigo-700">{item.qc_review_summary}</p>
                                </div>
                            )}

                            {Array.isArray(item.qc_history) && item.qc_history.length > 0 && (
                                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                                    <h4 className="font-semibold text-gray-900 mb-3">QC1 History</h4>
                                    <div className="space-y-3">
                                        {[...item.qc_history].reverse().map((entry, idx) => (
                                            <div key={idx} className="border rounded-md p-3 bg-gray-50">
                                                <div className="flex flex-wrap items-center gap-2 justify-between">
                                                    <p className="text-sm font-semibold text-gray-900">{entry.result}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {entry.reviewed_by} • {format(new Date(entry.reviewed_at), "dd/MM/yyyy hh:mm a")}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-gray-700 mt-1">{entry.summary}</p>
                                                <div className="mt-2 overflow-x-auto">
                                                    <table className="w-full text-xs border">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="p-2 text-left">S.No</th>
                                                                <th className="p-2 text-left">Status</th>
                                                                <th className="p-2 text-left">Remark</th>
                                                                <th className="p-2 text-left">File</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {entry.decisions.map((d, i) => (
                                                                <tr key={i} className="border-t">
                                                                    <td className="p-2">{d.s_no}</td>
                                                                    <td className="p-2">{d.status}</td>
                                                                    <td className="p-2">{d.remark || "-"}</td>
                                                                    <td className="p-2">{d.file || "-"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Working Timeline */}
                {item.working_timeline && item.working_timeline.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="text-blue-600" />
                            Working Timeline
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="border p-2 text-left">S.No</th>
                                        <th className="border p-2 text-left">Description</th>
                                        <th className="border p-2 text-left">Deadline</th>
                                        <th className="border p-2 text-left">Approved</th>
                                        <th className="border p-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.working_timeline.map((timeline, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="border p-2">{timeline.s_no}</td>
                                            <td className="border p-2">{timeline.description}</td>
                                            <td className="border p-2">{format(new Date(timeline.deadline), "MMM dd, yyyy")}</td>
                                            <td className="border p-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    timeline.approved === "Yes" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                                                }`}>
                                                    {timeline.approved}
                                                </span>
                                            </td>
                                            <td className="border p-2">{timeline.notes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Project Timeline */}
                {item.project_timeline && item.project_timeline.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="text-purple-600" />
                            Project Timeline
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="border p-2 text-left">S.No</th>
                                        <th className="border p-2 text-left">Description</th>
                                        <th className="border p-2 text-left">Deadline</th>
                                        <th className="border p-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.project_timeline.map((timeline, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="border p-2">{timeline.s_no}</td>
                                            <td className="border p-2">{timeline.description}</td>
                                            <td className="border p-2">{format(new Date(timeline.deadline), "MMM dd, yyyy")}</td>
                                            <td className="border p-2">{timeline.notes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                    <button
                        onClick={() => router.push(`/crm/pipelines/${pipelineId}/preprocess`)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                    >
                        Back to List
                    </button>
                    <button
                        onClick={() => router.push(`/crm/pipelines/${pipelineId}/preprocess/${id}/edit`)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        Edit Details
                    </button>
                </div>
            </div>
        </div>
    );
}

