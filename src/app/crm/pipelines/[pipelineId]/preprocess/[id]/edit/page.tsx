"use client";

import { Pencil, Trash2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type StageHistory = {
    stage: string;
    date: string;
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
    qc_status?: "Pending" | "Approved" | "Rejected";
    qc_remark?: string;
    qc_file?: string;
    qc_file_url?: string;
};

export type WorkingTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    approved: "Yes" | "Rework";
    notes?: string;
};

export type ProjectTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    notes?: string;
};

export type QcHistoryEntry = {
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

export type PreprocessItem = {
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
    advance_payment?: { amount: number; bank_details: string; date: string; };
    expense: number;
    profit: number;
    balance_due: number;
    subdeal_department?: string;
    project_handled_by: string;
    quotation_upload_reference?: string;
    quotation_upload_reference_url?: string;
    po_document?: string;
    po_document_url?: string;
    working_timeline: WorkingTimelineItem[];
    project_timeline: ProjectTimelineItem[];
    supplier_details: SupplierDetail[];
    qc_status?: "Not Sent" | "Pending QC1" | "QC1 Rework Required" | "QC1 Approved";
    qc_submitted_date?: string;
    qc_submitted_by?: string;
    qc_reviewed_date?: string;
    qc_reviewed_by?: string;
    qc_review_summary?: string;
    qc_history?: QcHistoryEntry[];
    approval_status: "Modification" | "Pending Approval" | "Approved" | "Rejected";
    approval_requested_date?: string;
    approval_requested_by?: string;
    last_reminder_date?: string;
    rejection_reason?: string;
    stage_history?: StageHistory[];
};

export type PostProcessItem = Omit<PreprocessItem, "approval_status"> & {
    post_process_status: "Pending";
    stage_history?: StageHistory[];
};

const currencyOptions = ["INR", "USD", "EUR", "AED", "GBP", "JPY", "SGD", "AUD", "CAD"];

export default function EditPreprocessPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    const [formData, setFormData] = useState<PreprocessItem | null>(null);
    const [dialogState, setDialogState] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} });
    const [currentUser, setCurrentUser] = useState<string>("");
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplierIndex, setEditingSupplierIndex] = useState<number | null>(null);
    const [newSupplierRow, setNewSupplierRow] = useState<SupplierDetail>({
        s_no: 1,
        component_type: "Active",
        manufacturer_part_number: "",
        vendor_details: "",
        currency: "INR",
        percentage: 0,
        req_quantity: 0,
        excise_quantity: 0,
        quantity: 0,
        unit_price: 0,
        total_price: 0,
    });

    const openQcFile = (fileUrl?: string) => {
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
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch {
            window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
    };

    useEffect(() => {
        const user = localStorage.getItem("currentUser") || "Current User";
        setCurrentUser(user);
    }, []);

    useEffect(() => {
        if (!id) return;

        const storedData = localStorage.getItem("preprocessData") || "[]";
        const data: any[] = JSON.parse(storedData);
        const itemToEdit = data.find((item) => item.id === id);
        if (!itemToEdit) return;

        const legacyExpenseDetails = Array.isArray(itemToEdit.expense_details) ? itemToEdit.expense_details : [];
        const supplierDetails: SupplierDetail[] = Array.isArray(itemToEdit.supplier_details)
            ? itemToEdit.supplier_details.map((row: SupplierDetail) => ({
                  ...row,
                  qc_status: row.qc_status || "Pending",
                  qc_remark: row.qc_remark || "",
                  qc_file: row.qc_file || "",
                qc_file_url: row.qc_file_url || "",
              }))
            : legacyExpenseDetails.map((row: any, index: number) => {
                  const qty = Number(row.quantity || 0);
                  const unitPrice = Number(row.unit_price || 0);
                  return {
                      s_no: Number(row.s_no || index + 1),
                      component_type: "Active",
                      manufacturer_part_number: String(row.description || ""),
                      vendor_details: String(row.supplier_details || ""),
                      currency: "INR",
                      percentage: 0,
                      req_quantity: qty,
                      excise_quantity: 0,
                      quantity: qty,
                      unit_price: unitPrice,
                      total_price: Number(row.total_price || qty * unitPrice || 0),
                      qc_status: "Pending",
                      qc_remark: "",
                      qc_file: "",
                      qc_file_url: "",
                  };
              });

        const sanitizedItem: PreprocessItem = {
            ...itemToEdit,
            order_value: Number(itemToEdit.order_value || 0),
            expense: Number(itemToEdit.expense || 0),
            profit: Number(itemToEdit.profit || 0),
            balance_due: Number(itemToEdit.balance_due || 0),
            project_handled_by: String(itemToEdit.project_handled_by || ""),
            working_timeline: Array.isArray(itemToEdit.working_timeline) ? itemToEdit.working_timeline : [],
            project_timeline: Array.isArray(itemToEdit.project_timeline) ? itemToEdit.project_timeline : [],
            supplier_details: supplierDetails,
            stage_history: Array.isArray(itemToEdit.stage_history) ? itemToEdit.stage_history : [],
            qc_status: itemToEdit.qc_status || "Not Sent",
            qc_submitted_date: itemToEdit.qc_submitted_date,
            qc_submitted_by: itemToEdit.qc_submitted_by,
            qc_reviewed_date: itemToEdit.qc_reviewed_date,
            qc_reviewed_by: itemToEdit.qc_reviewed_by,
            qc_review_summary: itemToEdit.qc_review_summary,
            qc_history: Array.isArray(itemToEdit.qc_history) ? itemToEdit.qc_history : [],
            approval_status: itemToEdit.approval_status || "Modification",
            advance_payment: itemToEdit.advance_payment || { amount: 0, bank_details: "", date: "" },
        };

        setFormData(sanitizedItem);
    }, [id]);

    useEffect(() => {
        if (!formData) return;

        const totalExpense = formData.supplier_details.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
        const profit = (Number(formData.order_value) || 0) - totalExpense;
        const balanceDue = Number(formData.order_value) || 0;

        if (formData.expense !== totalExpense || formData.profit !== profit || formData.balance_due !== balanceDue) {
            setFormData((prev) => {
                if (!prev) return null;
                return { ...prev, expense: totalExpense, profit, balance_due: balanceDue };
            });
        }
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === "number";
        setFormData((prev) => (prev ? { ...prev, [name]: isNumber ? parseFloat(value) || 0 : value } : null));
    };

    const handleTimelineChange = (
        index: number,
        field: keyof WorkingTimelineItem | keyof ProjectTimelineItem,
        value: string | number,
        timelineType: "working_timeline" | "project_timeline"
    ) => {
        setFormData((prev) => {
            if (!prev) return null;
            const updatedTimeline = prev[timelineType].map((item, i) => (i === index ? { ...item, [field]: value } : item));
            return { ...prev, [timelineType]: updatedTimeline };
        });
    };

    const addTimelineRow = (timelineType: "working_timeline" | "project_timeline") => {
        setFormData((prev) => {
            if (!prev) return null;
            if (timelineType === "working_timeline") {
                const newRow: WorkingTimelineItem = {
                    s_no: prev.working_timeline.length + 1,
                    description: "",
                    deadline: "",
                    approved: "Rework",
                    notes: "",
                };
                return { ...prev, working_timeline: [...prev.working_timeline, newRow] };
            }
            const newRow: ProjectTimelineItem = {
                s_no: prev.project_timeline.length + 1,
                description: "",
                deadline: "",
                notes: "",
            };
            return { ...prev, project_timeline: [...prev.project_timeline, newRow] };
        });
    };

    const removeTimelineRow = (indexToRemove: number, timelineType: "working_timeline" | "project_timeline") => {
        setFormData((prev) => {
            if (!prev) return null;
            const newTimeline = prev[timelineType]
                .filter((_, i) => i !== indexToRemove)
                .map((row, i) => ({ ...row, s_no: i + 1 }));
            return { ...prev, [timelineType]: newTimeline };
        });
    };

    const updateDerivedSupplierFields = (row: SupplierDetail): SupplierDetail => {
        const reqQty = Number(row.req_quantity) || 0;
        const pct = Number(row.percentage) || 0;
        const unitPrice = Number(row.unit_price) || 0;
        const exciseQuantity = Number((reqQty + (reqQty * pct) / 100).toFixed(2));

        return {
            ...row,
            excise_quantity: exciseQuantity,
            total_price: Number((exciseQuantity * unitPrice).toFixed(2)),
        };
    };

    const handleSupplierDetailChange = (
        index: number,
        field: keyof SupplierDetail,
        value: string | number
    ) => {
        setFormData((prev) => {
            if (!prev) return null;
            const updatedRows = prev.supplier_details.map((item, i) => {
                if (i !== index) return item;
                const updatedItem = updateDerivedSupplierFields({ ...item, [field]: value });
                return updatedItem;
            });
            return { ...prev, supplier_details: updatedRows };
        });
    };

    const openSupplierModal = () => {
        const nextSNo = (formData?.supplier_details.length || 0) + 1;
        setEditingSupplierIndex(null);
        setNewSupplierRow({
            s_no: nextSNo,
            component_type: "Active",
            manufacturer_part_number: "",
            vendor_details: "",
            currency: "INR",
            percentage: 0,
            req_quantity: 0,
            excise_quantity: 0,
            quantity: 0,
            unit_price: 0,
            total_price: 0,
            qc_status: "Pending",
            qc_remark: "",
            qc_file: "",
        });
        setIsSupplierModalOpen(true);
    };

    const openEditSupplierModal = (index: number) => {
        if (!formData) return;
        const row = formData.supplier_details[index];
        if (!row) return;
        setEditingSupplierIndex(index);
        setNewSupplierRow(row);
        setIsSupplierModalOpen(true);
    };

    const handleNewSupplierChange = (field: keyof SupplierDetail, value: string | number) => {
        setNewSupplierRow((prev) => updateDerivedSupplierFields({ ...prev, [field]: value }));
    };

    const saveSupplierModalRow = () => {
        setFormData((prev) => {
            if (!prev) return null;
            if (editingSupplierIndex !== null) {
                const updatedRows = prev.supplier_details.map((row, index) =>
                    index === editingSupplierIndex
                        ? updateDerivedSupplierFields({ ...newSupplierRow, s_no: row.s_no })
                        : row
                );
                return { ...prev, supplier_details: updatedRows };
            }

            const rowToAdd = updateDerivedSupplierFields({ ...newSupplierRow, s_no: prev.supplier_details.length + 1 });
            return { ...prev, supplier_details: [...prev.supplier_details, rowToAdd] };
        });
        setEditingSupplierIndex(null);
        setIsSupplierModalOpen(false);
    };

    const removeSupplierDetailRow = (indexToRemove: number) => {
        setFormData((prev) => {
            if (!prev) return null;
            const newRows = prev.supplier_details
                .filter((_, i) => i !== indexToRemove)
                .map((row, i) => ({ ...row, s_no: i + 1 }));
            return { ...prev, supplier_details: newRows };
        });
    };

    const closeDialog = () =>
        setDialogState({ isOpen: false, title: "", message: "", onConfirm: () => {} });

    const proceedWithUpdate = () => {
        if (!formData) return;
        const data = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        const updatedData = data.map((item: PreprocessItem) => (item.id === id ? formData : item));
        localStorage.setItem("preprocessData", JSON.stringify(updatedData));
        router.push(`/crm/pipelines/${pipelineId}/preprocess`);
    };

    const proceedToApprove = () => {
        if (!formData) return;
        const { approval_status: _, ...rest } = formData;
        const newPostProcessItem: PostProcessItem = {
            ...rest,
            post_process_status: "Pending",
            stage_history: [...(formData.stage_history || []), { stage: "Moved to Post Process", date: new Date().toISOString() }],
        };

        const postProcessData = JSON.parse(localStorage.getItem("postprocessData") || "[]");
        localStorage.setItem("postprocessData", JSON.stringify([...postProcessData, newPostProcessItem]));

        const preprocessData = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        const updatedPreprocess = preprocessData.filter((item: PreprocessItem) => item.id !== id);
        localStorage.setItem("preprocessData", JSON.stringify(updatedPreprocess));
        router.push(`/crm/pipelines/${pipelineId}/preprocess`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        let confirmAction = () => proceedWithUpdate();
        let message = "Are you sure you want to save these changes?";

        if (formData.approval_status === "Approved") {
            message = "This will approve the item and move it to Post Process. This action cannot be undone. Proceed?";
            confirmAction = () => proceedToApprove();
        }

        setDialogState({ isOpen: true, title: "Confirm Update", message, onConfirm: confirmAction });
    };

    const proceedWithSendForQcApproval = () => {
        if (!formData) return;

        const updatedFormData = {
            ...formData,
            qc_status: "Pending QC1" as const,
            qc_submitted_date: new Date().toISOString(),
            qc_submitted_by: currentUser,
            stage_history: [...(formData.stage_history || []), { stage: "Sent for QC1 Approval", date: new Date().toISOString() }],
        };

        const data = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        const updatedData = data.map((item: PreprocessItem) => (item.id === id ? updatedFormData : item));
        localStorage.setItem("preprocessData", JSON.stringify(updatedData));

        closeDialog();
        router.push(`/crm/pipelines/${pipelineId}/preprocess`);
    };

    const proceedWithSendForAdminApproval = () => {
        if (!formData) return;

        const updatedFormData = {
            ...formData,
            approval_status: "Pending Approval" as const,
            approval_requested_date: new Date().toISOString(),
            approval_requested_by: currentUser,
            stage_history: [...(formData.stage_history || []), { stage: "Sent for Admin Approval", date: new Date().toISOString() }],
        };

        const data = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        const updatedData = data.map((item: PreprocessItem) => (item.id === id ? updatedFormData : item));
        localStorage.setItem("preprocessData", JSON.stringify(updatedData));

        const approvalRequests = JSON.parse(localStorage.getItem("approvalRequests") || "[]");
        approvalRequests.push({
            id: formData.id,
            type: "preprocess",
            company_name: formData.company_name,
            department: formData.department,
            requested_by: currentUser,
            requested_date: new Date().toISOString(),
            pipelineId,
        });
        localStorage.setItem("approvalRequests", JSON.stringify(approvalRequests));

        closeDialog();
        router.push(`/crm/pipelines/${pipelineId}/preprocess`);
    };

    const handleSendForQcApproval = () => {
        if (!formData) return;

        const invalidWorkingTimeline = formData.working_timeline.some((item) => !item.description || !item.deadline);
        const invalidProjectTimeline = formData.project_timeline.some((item) => !item.description || !item.deadline);

        if (invalidWorkingTimeline || invalidProjectTimeline) {
            let errorMessage = "Please fill in all required fields before sending for approval:\n\n";
            if (invalidWorkingTimeline) errorMessage += "• Working Timeline: All rows must have Description and Deadline filled.\n";
            if (invalidProjectTimeline) errorMessage += "• Project Timeline: All rows must have Description and Deadline filled.\n";
            setDialogState({
                isOpen: true,
                title: "Validation Error",
                message: errorMessage,
                onConfirm: () => closeDialog(),
            });
            return;
        }

        setDialogState({
            isOpen: true,
            title: "Send for QC1 Approval",
            message: "Are you sure you want to send this for QC1 approval?",
            onConfirm: () => proceedWithSendForQcApproval(),
        });
    };

    const handleSendForAdminApproval = () => {
        if (!formData) return;

        const allQcApproved =
            formData.supplier_details.length > 0 &&
            formData.supplier_details.every((row) => row.qc_status === "Approved");

        if (!allQcApproved) {
            alert("All supplier items must be approved by QC1 before sending to admin approval.");
            return;
        }

        setDialogState({
            isOpen: true,
            title: "Send for Admin Approval",
            message: "All supplier items are QC1 approved. Send for admin approval now?",
            onConfirm: () => proceedWithSendForAdminApproval(),
        });
    };

    const handleSendReminder = () => {
        if (!formData) return;

        const updatedFormData = {
            ...formData,
            last_reminder_date: new Date().toISOString(),
        };

        const data = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        const updatedData = data.map((item: PreprocessItem) => (item.id === id ? updatedFormData : item));
        localStorage.setItem("preprocessData", JSON.stringify(updatedData));
        setFormData(updatedFormData);

        const approvalRequests = JSON.parse(localStorage.getItem("approvalRequests") || "[]");
        const updatedRequests = approvalRequests.map((req: any) =>
            req.id === formData.id ? { ...req, last_reminder: new Date().toISOString() } : req
        );
        localStorage.setItem("approvalRequests", JSON.stringify(updatedRequests));

        alert("Reminder sent to admin successfully!");
    };

    if (!formData) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-green-700">Edit Preprocess Item</h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-gray-600">Original Details</legend>
                        <div className="grid grid-cols-1 gap-5 mt-4 md:grid-cols-4">
                            <div><label className="text-sm font-medium text-gray-500">Company</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.company_name}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Contact</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.contact}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">State</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.state}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Source</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.source}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Project Handled By</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.project_handled_by || "-"}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Deadline</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.deadline || "-"}</p></div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Quotation Upload Reference</label>
                                <div className="p-2 mt-1 bg-gray-100 rounded">
                                    <p>{formData.quotation_upload_reference || formData.fileName || "-"}</p>
                                    {formData.quotation_upload_reference_url && (
                                        <button type="button" onClick={() => openQcFile(formData.quotation_upload_reference_url)} className="text-xs text-blue-600 hover:underline mt-1">
                                            View file
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Email Confirmation / PO</label>
                                <div className="p-2 mt-1 bg-gray-100 rounded">
                                    <p>{formData.po_document || "-"}</p>
                                    {formData.po_document_url && (
                                        <button type="button" onClick={() => openQcFile(formData.po_document_url)} className="text-xs text-blue-600 hover:underline mt-1">
                                            View file
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Financials & Billing</legend>
                        <div className="grid grid-cols-1 gap-6 mt-4">
                            <div>
                                <label className="block font-medium">Order Value - Quotation Subtotal</label>
                                <input
                                    type="number"
                                    name="order_value"
                                    value={formData.order_value}
                                    onChange={handleChange}
                                    className="w-full p-2 mt-1 border rounded"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block font-medium text-orange-600">Total Expense (Auto-calculated)</label>
                                    <input
                                        type="text"
                                        value={(formData.expense || 0).toLocaleString("en-IN")}
                                        readOnly
                                        className="w-full p-2 mt-1 bg-orange-50 border-orange-200 rounded text-orange-800 font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-blue-600">Profit (Auto-calculated)</label>
                                    <input
                                        type="text"
                                        value={(formData.profit || 0).toLocaleString("en-IN")}
                                        readOnly
                                        className="w-full p-2 mt-1 bg-blue-50 border-blue-200 rounded text-blue-800 font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-red-600">Balance Due</label>
                                    <input
                                        type="text"
                                        value={(formData.balance_due || 0).toLocaleString("en-IN")}
                                        readOnly
                                        className="w-full p-2 mt-1 bg-red-50 border-red-200 rounded text-red-800 font-semibold"
                                    />
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Working Timeline</legend>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                                        <th className="p-2">S.No</th>
                                        <th className="p-2">Description <span className="text-red-500">*</span></th>
                                        <th className="p-2">Deadline <span className="text-red-500">*</span></th>
                                        <th className="p-2">Approved</th>
                                        <th className="p-2">Notes</th>
                                        <th className="p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.working_timeline.map((row, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-2"><input type="number" value={row.s_no} onChange={(e) => handleTimelineChange(index, "s_no", parseInt(e.target.value) || 0, "working_timeline")} className="w-16 p-2 border rounded"/></td>
                                            <td className="p-2"><input type="text" value={row.description} onChange={(e) => handleTimelineChange(index, "description", e.target.value, "working_timeline")} required className="w-full p-2 border rounded"/></td>
                                            <td className="p-2"><input type="date" value={row.deadline} onChange={(e) => handleTimelineChange(index, "deadline", e.target.value, "working_timeline")} required className="w-full p-2 border rounded"/></td>
                                            <td className="p-2">
                                                <select value={row.approved} onChange={(e) => handleTimelineChange(index, "approved", e.target.value as WorkingTimelineItem["approved"], "working_timeline")} className="w-full p-2 border rounded bg-white">
                                                    <option>Rework</option>
                                                    <option>Yes</option>
                                                </select>
                                            </td>
                                            <td className="p-2"><textarea value={row.notes || ""} onChange={(e) => handleTimelineChange(index, "notes", e.target.value, "working_timeline")} rows={2} className="w-full p-2 border rounded text-sm"/></td>
                                            <td className="p-2"><button type="button" onClick={() => removeTimelineRow(index, "working_timeline")} className="p-2 text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" onClick={() => addTimelineRow("working_timeline")} className="mt-4 px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700">+ Add Working Row</button>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Project Timeline</legend>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                                        <th className="p-2">S.No</th>
                                        <th className="p-2">Description <span className="text-red-500">*</span></th>
                                        <th className="p-2">Deadline <span className="text-red-500">*</span></th>
                                        <th className="p-2">Notes</th>
                                        <th className="p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.project_timeline.map((row, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-2"><input type="number" value={row.s_no} onChange={(e) => handleTimelineChange(index, "s_no", parseInt(e.target.value) || 0, "project_timeline")} className="w-16 p-2 border rounded"/></td>
                                            <td className="p-2"><input type="text" value={row.description} onChange={(e) => handleTimelineChange(index, "description", e.target.value, "project_timeline")} required className="w-full p-2 border rounded"/></td>
                                            <td className="p-2"><input type="date" value={row.deadline} onChange={(e) => handleTimelineChange(index, "deadline", e.target.value, "project_timeline")} required className="w-full p-2 border rounded"/></td>
                                            <td className="p-2"><textarea value={row.notes || ""} onChange={(e) => handleTimelineChange(index, "notes", e.target.value, "project_timeline")} rows={2} className="w-full p-2 border rounded text-sm"/></td>
                                            <td className="p-2"><button type="button" onClick={() => removeTimelineRow(index, "project_timeline")} className="p-2 text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" onClick={() => addTimelineRow("project_timeline")} className="mt-4 px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700">+ Add Project Row</button>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Supplier Details</legend>
                        <div className="overflow-x-auto mt-4 w-full">
                            <table className="w-full min-w-[1100px] table-fixed">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                                        <th className="p-2">S.No</th>
                                        <th className="p-2">Component Type</th>
                                        <th className="p-2">Manufacturer - Part Number</th>
                                        <th className="p-2">Vendor Details</th>
                                        <th className="p-2">Currency</th>
                                        <th className="p-2">Percentage</th>
                                        <th className="p-2">Req Quantity</th>
                                        <th className="p-2">Excise Quantity</th>
                                        <th className="p-2">Quantity</th>
                                        <th className="p-2">Unit Price</th>
                                        <th className="p-2">Total Price</th>
                                        <th className="p-2">QC Status</th>
                                        <th className="p-2">QC Remark</th>
                                        <th className="p-2">QC File</th>
                                        <th className="p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.supplier_details.map((row, index) => (
                                        <tr key={index} className="border-t text-sm">
                                            <td className="p-2 font-semibold">{row.s_no}</td>
                                            <td className="p-2">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                                    row.component_type === "Active" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                                                }`}>
                                                    {row.component_type}
                                                </span>
                                            </td>
                                            <td className="p-2 max-w-[240px] truncate" title={row.manufacturer_part_number || ""}>{row.manufacturer_part_number || "-"}</td>
                                            <td className="p-2 max-w-[220px] truncate" title={row.vendor_details || ""}>{row.vendor_details || "-"}</td>
                                            <td className="p-2">{row.currency}</td>
                                            <td className="p-2 text-right">{row.percentage}%</td>
                                            <td className="p-2 text-right">{row.req_quantity}</td>
                                            <td className="p-2 text-right">{row.excise_quantity}</td>
                                            <td className="p-2 text-right">{row.quantity}</td>
                                            <td className="p-2 text-right">{(row.unit_price || 0).toLocaleString("en-IN")}</td>
                                            <td className="p-2 text-right font-semibold">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                                            <td className="p-2">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                                    row.qc_status === "Approved"
                                                        ? "bg-green-100 text-green-800"
                                                        : row.qc_status === "Rejected"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                }`}>
                                                    {row.qc_status || "Pending"}
                                                </span>
                                            </td>
                                            <td className="p-2 max-w-[180px] truncate" title={row.qc_remark || ""}>{row.qc_remark || "-"}</td>
                                            <td className="p-2 max-w-[220px]">
                                                {row.qc_file ? (
                                                    <div className="space-y-1">
                                                        <p className="truncate" title={row.qc_file || ""}>{row.qc_file}</p>
                                                        {row.qc_file_url && (
                                                            <button type="button" onClick={() => openQcFile(row.qc_file_url)} className="text-xs text-blue-600 hover:underline">
                                                                View file
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => openEditSupplierModal(index)} className="p-2 text-blue-500 hover:text-blue-700" title="Edit row">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button type="button" onClick={() => removeSupplierDetailRow(index)} className="p-2 text-red-500 hover:text-red-700" title="Delete row">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex gap-3 flex-wrap">
                            <button type="button" onClick={openSupplierModal} className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700">+ Add Supplier Row</button>
                            <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/preprocess/${id}/upload-suppliers`)} className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 inline-flex items-center gap-2">
                                <Upload size={16} />
                                Upload from Excel
                            </button>
                        </div>

                        <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">Files From Negotiation</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-blue-700 font-medium">Quotation Upload Reference</p>
                                    <p className="text-gray-800">{formData.quotation_upload_reference || formData.fileName || "Not uploaded"}</p>
                                    {formData.quotation_upload_reference_url && (
                                        <button type="button" onClick={() => openQcFile(formData.quotation_upload_reference_url)} className="text-xs text-blue-600 hover:underline mt-1">
                                            View file
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <p className="text-blue-700 font-medium">Email Confirmation / PO</p>
                                    <p className="text-gray-800">{formData.po_document || "Not uploaded"}</p>
                                    {formData.po_document_url && (
                                        <button type="button" onClick={() => openQcFile(formData.po_document_url)} className="text-xs text-blue-600 hover:underline mt-1">
                                            View file
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Approval Status</legend>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block font-medium mb-2">Current Status</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`px-4 py-2 rounded-full font-semibold ${
                                        formData.approval_status === "Approved" ? "bg-green-100 text-green-800" :
                                        formData.approval_status === "Pending Approval" ? "bg-yellow-100 text-yellow-800" :
                                        formData.approval_status === "Rejected" ? "bg-red-100 text-red-800" :
                                        "bg-gray-100 text-gray-800"
                                    }`}>
                                        Admin: {formData.approval_status}
                                    </span>
                                    <span className={`px-4 py-2 rounded-full font-semibold ${
                                        formData.qc_status === "QC1 Approved"
                                            ? "bg-green-100 text-green-800"
                                            : formData.qc_status === "Pending QC1"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : formData.qc_status === "QC1 Rework Required"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}>
                                        QC1: {formData.qc_status || "Not Sent"}
                                    </span>
                                </div>
                            </div>

                            {formData.qc_review_summary && (
                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
                                    <p className="text-sm font-semibold text-indigo-800 mb-1">QC1 Review Summary:</p>
                                    <p className="text-sm text-indigo-700">{formData.qc_review_summary}</p>
                                </div>
                            )}

                            {Array.isArray(formData.qc_history) && formData.qc_history.length > 0 && (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                                    <p className="text-sm font-semibold text-gray-800 mb-2">QC1 History</p>
                                    <div className="space-y-2 max-h-56 overflow-auto">
                                        {[...formData.qc_history].reverse().map((entry, idx) => (
                                            <div key={idx} className="border rounded p-2 bg-white">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <p className="text-xs font-semibold text-gray-800">{entry.result}</p>
                                                    <p className="text-xs text-gray-500">{entry.reviewed_by} • {new Date(entry.reviewed_at).toLocaleString()}</p>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">{entry.summary}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.approval_requested_date && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                    <p className="text-sm text-blue-800"><strong>Requested on:</strong> {new Date(formData.approval_requested_date).toLocaleString()}</p>
                                    {formData.approval_requested_by && <p className="text-sm text-blue-800 mt-1"><strong>Requested by:</strong> {formData.approval_requested_by}</p>}
                                    {formData.last_reminder_date && <p className="text-sm text-blue-800 mt-1"><strong>Last reminder:</strong> {new Date(formData.last_reminder_date).toLocaleString()}</p>}
                                </div>
                            )}

                            {formData.approval_status === "Rejected" && formData.rejection_reason && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded">
                                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                                    <p className="text-sm text-red-700">{formData.rejection_reason}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleSendForQcApproval} className="px-6 py-2 font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Send for QC1 Approval</button>
                                <button
                                    type="button"
                                    onClick={handleSendForAdminApproval}
                                    disabled={!(formData.supplier_details.length > 0 && formData.supplier_details.every((row) => row.qc_status === "Approved"))}
                                    className="px-6 py-2 font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Send for Admin Approval
                                </button>
                                <button type="button" onClick={handleSendReminder} className="px-6 py-2 font-semibold text-white bg-orange-600 rounded hover:bg-orange-700">Send Reminder</button>
                                {formData.approval_status === "Approved" && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded flex-1">
                                        <p className="text-sm text-green-800">This item has been approved and will move to Post Process when you update.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 pt-6 mt-4 border-t">
                        <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/preprocess`)} className="px-6 py-2 font-semibold border rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                        <button type="submit" className="px-6 py-2 font-semibold text-white bg-green-600 rounded hover:bg-green-700" disabled={formData.approval_status === "Pending Approval"}>
                            {formData.approval_status === "Pending Approval" ? "Awaiting Approval" : "Update Preprocess"}
                        </button>
                    </div>
                </form>
            </div>

            {dialogState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
                        <p className="mt-3 text-gray-600 whitespace-pre-line">{dialogState.message}</p>
                        <div className="flex justify-end mt-6 space-x-4">
                            <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                            <button onClick={dialogState.onConfirm} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {isSupplierModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
                    <div className="w-full max-w-6xl bg-white rounded-lg shadow-xl">
                        <div className="px-6 py-4 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">{editingSupplierIndex !== null ? "Edit Supplier Row" : "Add Supplier Row"}</h2>
                            <p className="text-sm text-gray-600 mt-1">Fill supplier details in this expanded form, then save to the table.</p>
                        </div>

                        <div className="p-6 max-h-[75vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">S.No</label>
                                    <input type="number" value={newSupplierRow.s_no} readOnly className="w-full p-2 mt-1 border rounded bg-gray-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Component Type</label>
                                    <select value={newSupplierRow.component_type} onChange={(e) => handleNewSupplierChange("component_type", e.target.value as SupplierDetail["component_type"])} className="w-full p-2 mt-1 border rounded bg-white">
                                        <option value="Active">Active</option>
                                        <option value="Passive">Passive</option>
                                    </select>
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Manufacturer - Part Number</label>
                                    <input type="text" value={newSupplierRow.manufacturer_part_number} onChange={(e) => handleNewSupplierChange("manufacturer_part_number", e.target.value)} className="w-full p-2 mt-1 border rounded" />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Vendor Details</label>
                                    <input type="text" value={newSupplierRow.vendor_details} onChange={(e) => handleNewSupplierChange("vendor_details", e.target.value)} className="w-full p-2 mt-1 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                                    <select value={newSupplierRow.currency} onChange={(e) => handleNewSupplierChange("currency", e.target.value)} className="w-full p-2 mt-1 border rounded bg-white">
                                        {currencyOptions.map((currency) => (
                                            <option key={currency} value={currency}>{currency}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Percentage</label>
                                    <input type="number" value={newSupplierRow.percentage} onChange={(e) => handleNewSupplierChange("percentage", parseFloat(e.target.value) || 0)} className="w-full p-2 mt-1 border rounded" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Req Quantity</label>
                                    <input type="number" value={newSupplierRow.req_quantity} onChange={(e) => handleNewSupplierChange("req_quantity", parseFloat(e.target.value) || 0)} className="w-full p-2 mt-1 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Excise Quantity</label>
                                    <input type="number" value={newSupplierRow.excise_quantity} readOnly className="w-full p-2 mt-1 border rounded bg-gray-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input type="number" value={newSupplierRow.quantity} onChange={(e) => handleNewSupplierChange("quantity", parseFloat(e.target.value) || 0)} className="w-full p-2 mt-1 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                                    <input type="number" value={newSupplierRow.unit_price} onChange={(e) => handleNewSupplierChange("unit_price", parseFloat(e.target.value) || 0)} className="w-full p-2 mt-1 border rounded" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Price</label>
                                    <input type="number" value={newSupplierRow.total_price} readOnly className="w-full p-2 mt-1 border rounded bg-gray-100" />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSupplierModalOpen(false);
                                    setEditingSupplierIndex(null);
                                }}
                                className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button type="button" onClick={saveSupplierModalRow} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                                {editingSupplierIndex !== null ? "Update Row" : "Add Row"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
