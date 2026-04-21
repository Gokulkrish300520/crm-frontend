"use client";

import { setIndexedDbItem } from "@/utils/indexedDbStorage";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type StageHistory = {
    stage: string;
    date: string;
};

export type WorkingTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    status: "Completed" | "Over Due" | "Working Within Deadline";
    approved: "Yes" | "Rework";
    admin_status?: "Not Approved" | "Approved" | "Rework";
    admin_remark?: string;
};

export type ProjectTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    status: "Completed" | "Over Due" | "Working Within Deadline";
    final_fileName?: string;
    admin_status?: "Not Approved" | "Approved" | "Rework";
    admin_remark?: string;
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
    test_report_upload?: string;
    test_report_upload_url?: string;
    test_report_upload_file_key?: string;
    payment_terms?: string;
    dispatch_date?: string;
    sf_number?: string;
    sf_date?: string;
    awb_number?: string;
    awb_date?: string;
    total_weight_kg?: number;
    tracking_number?: string;
    courier_details?: string;
    duty_details?: string;
    shipment_details?: string;
    qc2_status?: "Not Sent" | "Pending QC2" | "QC2 Rework Required" | "Approved" | "Rejected";
    qc2_remark?: string;
    qc2_submitted_date?: string;
    qc2_submitted_by?: string;
    qc2_reviewed_date?: string;
    qc2_reviewed_by?: string;
    qc2_image_upload?: string;
    qc2_image_upload_url?: string;
    qc2_image_upload_file_key?: string;
    qc2_file?: string;
    qc2_file_url?: string;
    qc2_file_key?: string;
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
    expense_bill_format: string;
    post_process_status: "Pending" | "Completed";
    qc2_status?: "Not Sent" | "Pending QC2" | "QC2 Rework Required" | "QC2 Approved";
    qc2_submitted_date?: string;
    qc2_submitted_by?: string;
    qc2_reviewed_date?: string;
    qc2_reviewed_by?: string;
    qc2_review_summary?: string;
    stage_history?: StageHistory[];
};

export default function EditPostProcessPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params.pipelineId as string;

    const [formData, setFormData] = useState<PostProcessItem | null>(null);
    const [selectedSupplierRows, setSelectedSupplierRows] = useState<number[]>([]);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplierIndex, setEditingSupplierIndex] = useState<number | null>(null);
    const [supplierModalMode, setSupplierModalMode] = useState<"shipment" | "component">("shipment");
    const [supplierDraft, setSupplierDraft] = useState<SupplierDetail | null>(null);
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
        isValidation: false,
    });

    const expenseOptions = ["Format 1", "Format 2", "Format 3", "Format 4", "Format 5"];

    const deriveTimelineState = (
        deadline: string,
        deliveryCompletionDate?: string
    ): { status: "Completed" | "Over Due" | "Working Within Deadline"; approved: "Yes" | "Rework" } => {
        const deadlineDate = deadline ? new Date(deadline) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (deadlineDate) {
            deadlineDate.setHours(0, 0, 0, 0);
        }

        if (deliveryCompletionDate) {
            const completionDate = new Date(deliveryCompletionDate);
            completionDate.setHours(0, 0, 0, 0);
            if (deadlineDate && completionDate > deadlineDate) {
                return { status: "Over Due", approved: "Rework" };
            }
            return { status: "Completed", approved: "Yes" };
        }

        if (!deadlineDate) return { status: "Working Within Deadline", approved: "Rework" };
        if (deadlineDate < today) {
            return { status: "Over Due", approved: "Rework" };
        }
        return { status: "Working Within Deadline", approved: "Rework" };
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

    useEffect(() => {
        if (!id) return;

        const storedData = localStorage.getItem("postprocessData") || "[]";
        const data: PostProcessItem[] = JSON.parse(storedData);
        const itemToEdit = data.find((item) => item.id === id);
        if (!itemToEdit) return;

        const deliveryData = JSON.parse(localStorage.getItem("deliveryData") || "[]");
        const matchingDelivery = deliveryData.find(
            (entry: { source_postprocess_id?: string; id?: string }) =>
                String(entry.source_postprocess_id || entry.id) === String(itemToEdit.id)
        );
        const deliveryCompletionDate =
            matchingDelivery?.completed_date ||
            matchingDelivery?.stage_history?.find((entry: { stage?: string; date?: string }) =>
                String(entry.stage || "").toLowerCase().includes("all components reached delivery")
            )?.date;

        if (typeof itemToEdit.advance_payment === "number" || !itemToEdit.advance_payment) {
            itemToEdit.advance_payment = {
                amount: (itemToEdit.advance_payment as unknown as number) || 0,
                bank_details: "",
                date: "",
            };
        }

        const supplierDetails = Array.isArray(itemToEdit.supplier_details)
            ? itemToEdit.supplier_details.map((row, index) => ({
                  s_no: Number(row.s_no || index + 1),
                  component_type: row.component_type || "Active",
                  manufacturer_part_number: row.manufacturer_part_number || "",
                  vendor_details: row.vendor_details || "",
                  currency: row.currency || "INR",
                  percentage: Number(row.percentage || 0),
                  req_quantity: Number(row.req_quantity || 0),
                  excise_quantity: Number(row.excise_quantity || 0),
                  quantity: Number(row.quantity || 0),
                  unit_price: Number(row.unit_price || 0),
                  total_price: Number(row.total_price || 0),
                  test_report_upload: row.test_report_upload || "",
                  test_report_upload_url: row.test_report_upload_url || "",
                  test_report_upload_file_key: row.test_report_upload_file_key || "",
                  payment_terms: row.payment_terms || "",
                  dispatch_date: row.dispatch_date || "",
                  sf_number: row.sf_number || "",
                  sf_date: row.sf_date || "",
                  awb_number: row.awb_number || "",
                  awb_date: row.awb_date || "",
                  total_weight_kg: Number(row.total_weight_kg || 0),
                  tracking_number: row.tracking_number || "",
                  courier_details: row.courier_details || "",
                  duty_details: row.duty_details || "",
                  shipment_details: row.shipment_details || "",
                  qc2_status: row.qc2_status || "Not Sent",
                  qc2_remark: row.qc2_remark || "",
                  qc2_submitted_date: row.qc2_submitted_date,
                  qc2_submitted_by: row.qc2_submitted_by,
                  qc2_reviewed_date: row.qc2_reviewed_date,
                  qc2_reviewed_by: row.qc2_reviewed_by,
                  qc2_image_upload: row.qc2_image_upload || "",
                  qc2_image_upload_url: row.qc2_image_upload_url || "",
                                    qc2_image_upload_file_key: row.qc2_image_upload_file_key || "",
                                    qc2_file: row.qc2_file || "",
                                    qc2_file_url: row.qc2_file_url || "",
                                    qc2_file_key: row.qc2_file_key || "",
              }))
            : [];

        const sanitizedItem: PostProcessItem = {
            ...itemToEdit,
            working_timeline: Array.isArray(itemToEdit.working_timeline)
                ? itemToEdit.working_timeline.map((row) => {
                      const derived = deriveTimelineState(row.deadline || "", deliveryCompletionDate);
                      return {
                          ...row,
                          status: derived.status,
                          approved: derived.approved,
                      };
                  })
                : [],
            project_timeline: Array.isArray(itemToEdit.project_timeline)
                ? itemToEdit.project_timeline.map((row) => {
                      const derived = deriveTimelineState(row.deadline || "", deliveryCompletionDate);
                      return {
                          ...row,
                          status: derived.status,
                      };
                  })
                : [],
            supplier_details: supplierDetails,
            qc2_status: itemToEdit.qc2_status || "Not Sent",
            stage_history: Array.isArray(itemToEdit.stage_history) ? itemToEdit.stage_history : [],
        };

        setFormData(sanitizedItem);
    }, [id]);

    useEffect(() => {
        if (!formData) return;
        const profit = (formData.order_value || 0) - (formData.expense || 0);

        if (profit !== formData.profit) {
            setFormData((prev) => (prev ? { ...prev, profit } : null));
        }
    }, [formData?.order_value, formData?.expense, formData?.profit]);

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
            const updatedTimeline = prev[timelineType].map((item, i) => {
                if (i !== index) return item;
                const nextItem = { ...item, [field]: value };

                if (field === "deadline") {
                    const derived = deriveTimelineState(String(value || ""));
                    if (timelineType === "working_timeline") {
                        return {
                            ...(nextItem as WorkingTimelineItem),
                            status: derived.status,
                            approved: derived.approved,
                        };
                    }
                    return {
                        ...(nextItem as ProjectTimelineItem),
                        status: derived.status,
                    };
                }

                return nextItem;
            });
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
                    status: "Working Within Deadline",
                    approved: "Rework",
                };
                return { ...prev, working_timeline: [...prev.working_timeline, newRow] };
            }
            const newRow: ProjectTimelineItem = {
                s_no: prev.project_timeline.length + 1,
                description: "",
                deadline: "",
                status: "Working Within Deadline",
                final_fileName: "",
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

    const handleTimelineFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        handleTimelineChange(index, "final_fileName", file?.name || "", "project_timeline");
    };

    const updateDerivedSupplierFields = (row: SupplierDetail): SupplierDetail => {
        const reqQty = Number(row.req_quantity) || 0;
        const pct = Number(row.percentage) || 0;
        const unitPrice = Number(row.unit_price) || 0;
        const exciseQty = Number((reqQty + (reqQty * pct) / 100).toFixed(2));
        return {
            ...row,
            excise_quantity: exciseQty,
            total_price: Number((exciseQty * unitPrice).toFixed(2)),
        };
    };

    const moveSupplierBackToPreprocess = async (supplierRow: SupplierDetail) => {
        const currentFormData = formData;
        if (!currentFormData) return;

        const now = new Date().toISOString();
        const preprocessData = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        const preprocessSupplier = {
            s_no: 1,
            component_type: supplierRow.component_type,
            manufacturer_part_number: supplierRow.manufacturer_part_number,
            vendor_details: supplierRow.vendor_details,
            currency: supplierRow.currency || "INR",
            percentage: Number(supplierRow.percentage || 0),
            req_quantity: Number(supplierRow.req_quantity || 0),
            excise_quantity: Number(supplierRow.excise_quantity || 0),
            quantity: Number(supplierRow.quantity || 0),
            unit_price: Number(supplierRow.unit_price || 0),
            total_price: Number(supplierRow.total_price || 0),
            qc_status: "Pending" as const,
            qc_remark: "",
            qc_file: "",
            qc_file_url: "",
            admin_component_status: "Not Approved" as const,
            admin_component_remark: "",
            origin_postprocess_id: currentFormData.id,
            origin_supplier_s_no: supplierRow.s_no,
        };

        const preprocessItem = {
            id: crypto.randomUUID(),
            pipelineId,
            date: currentFormData.date,
            department: currentFormData.department,
            company_name: currentFormData.company_name,
            contact: currentFormData.contact,
            state: currentFormData.state,
            deadline: currentFormData.deadline,
            description: currentFormData.description,
            fileName: currentFormData.fileName,
            source: currentFormData.source,
            customer_notes: currentFormData.customer_notes,
            order_value: Number(supplierRow.total_price || 0),
            advance_payment: currentFormData.advance_payment,
            expense: Number(supplierRow.total_price || 0),
            profit: 0,
            balance_due: Number(supplierRow.total_price || 0),
            subdeal_department: currentFormData.subdeal_department,
            project_handled_by: currentFormData.project_handled_by,
            working_timeline: currentFormData.working_timeline.map((row) => ({ ...row, admin_status: "Not Approved", admin_remark: row.admin_remark || "" })),
            project_timeline: currentFormData.project_timeline.map((row) => ({ ...row, admin_status: "Not Approved", admin_remark: row.admin_remark || "" })),
            supplier_details: [preprocessSupplier],
            expense_bill_format: currentFormData.expense_bill_format,
            approval_status: "Modification",
            qc_status: "Not Sent",
            approval_requested_date: now,
            approval_requested_by: localStorage.getItem("currentUser") || currentFormData.project_handled_by || "Current User",
            stage_history: [...(currentFormData.stage_history || []), { stage: "Returned from Post Process for Reapproval", date: now }],
        };

        preprocessData.push(preprocessItem);
        localStorage.setItem("preprocessData", JSON.stringify(preprocessData));
    };

    const removeSupplierRow = (indexToRemove: number) => {
        setFormData((prev) => {
            if (!prev) return null;
            const rows = (prev.supplier_details || [])
                .filter((_, i) => i !== indexToRemove)
                .map((row, i) => ({ ...row, s_no: i + 1 }));
            return { ...prev, supplier_details: rows };
        });
        setSelectedSupplierRows((prev) => prev.filter((i) => i !== indexToRemove));
    };

    const handleSupplierChange = (index: number, field: keyof SupplierDetail, value: string | number) => {
        setFormData((prev) => {
            if (!prev) return null;
            const rows = (prev.supplier_details || []).map((row, i) => {
                if (i !== index) return row;
                return updateDerivedSupplierFields({ ...row, [field]: value } as SupplierDetail);
            });
            return { ...prev, supplier_details: rows };
        });
    };

    const openEditSupplierModal = (index: number, mode: "shipment" | "component" = "shipment") => {
        const row = formData?.supplier_details?.[index];
        if (!row) return;
        setEditingSupplierIndex(index);
        setSupplierModalMode(mode);
        setSupplierDraft({ ...row });
        setIsSupplierModalOpen(true);
    };

    const closeSupplierModal = () => {
        setIsSupplierModalOpen(false);
        setEditingSupplierIndex(null);
        setSupplierModalMode("shipment");
        setSupplierDraft(null);
    };

    const handleSupplierDraftImageUpload = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            setSupplierDraft((prev) =>
                prev
                    ? {
                          ...prev,
                          qc2_image_upload: file.name,
                          qc2_image_upload_url: dataUrl,
                      }
                    : null
            );
        };
        reader.readAsDataURL(file);
    };

    const handleSupplierDraftChange = (field: keyof SupplierDetail, value: string | number) => {
        setSupplierDraft((prev) => (prev ? updateDerivedSupplierFields({ ...prev, [field]: value } as SupplierDetail) : null));
    };

    const handleSupplierDraftFileUpload = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            setSupplierDraft((prev) =>
                prev
                    ? {
                          ...prev,
                          test_report_upload: file.name,
                          test_report_upload_url: dataUrl,
                      }
                    : null
            );
        };
        reader.readAsDataURL(file);
    };

    const saveSupplierModal = () => {
        if (editingSupplierIndex === null || !supplierDraft) return;
        const currentFormData = formData;
        if (!currentFormData) return;

        const originalRow = currentFormData.supplier_details?.[editingSupplierIndex];
        if (!originalRow) return;

        // Shipment/QC2 updates should stay in Post Process and not restart approvals.
        if (supplierModalMode === "shipment") {
            setFormData((prev) => {
                if (!prev) return null;
                const rows = (prev.supplier_details || []).map((row, i) =>
                    i === editingSupplierIndex ? updateDerivedSupplierFields({ ...supplierDraft, s_no: row.s_no }) : row
                );
                return { ...prev, supplier_details: rows };
            });
            closeSupplierModal();
            return;
        }

        void (async () => {
            await moveSupplierBackToPreprocess(updateDerivedSupplierFields({ ...supplierDraft, s_no: originalRow.s_no }));

            setFormData((prev) => {
                if (!prev) return null;
                const remainingRows = (prev.supplier_details || [])
                    .filter((_, i) => i !== editingSupplierIndex)
                    .map((row, i) => ({ ...row, s_no: i + 1 }));
                return { ...prev, supplier_details: remainingRows };
            });

            closeSupplierModal();

            if ((currentFormData.supplier_details || []).length === 1) {
                const allPostprocess = JSON.parse(localStorage.getItem("postprocessData") || "[]");
                const updatedPostprocess = allPostprocess.filter((item: PostProcessItem) => item.id !== currentFormData.id);
                localStorage.setItem("postprocessData", JSON.stringify(updatedPostprocess));
                router.push(`/crm/pipelines/${pipelineId}/postprocess`);
            }

            alert("Edited supplier row sent back to Pre-Process for QC1 and admin approval.");
        })();
    };

    const handleSupplierFileUpload = (index: number, file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            setFormData((prev) => {
                if (!prev) return null;
                const rows = (prev.supplier_details || []).map((row, i) =>
                    i === index ? { ...row, test_report_upload: file.name, test_report_upload_url: dataUrl } : row
                );
                return { ...prev, supplier_details: rows };
            });
        };
        reader.readAsDataURL(file);
    };

    const toggleSupplierSelection = (index: number) => {
        setSelectedSupplierRows((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    const requiresQc2Approval = (row: SupplierDetail) => {
        const reqQty = Number(row.req_quantity) || 0;
        if (row.component_type === "Active") return reqQty > 50;
        return reqQty > 1000;
    };

    const sendSelectedForQc2Approval = () => {
        if (!formData) return;
        if (selectedSupplierRows.length === 0) {
            alert("Please select at least one supplier item to send for QC2 approval.");
            return;
        }

        const rows = formData.supplier_details || [];
        const nonQcRows = selectedSupplierRows.filter((index) => {
            const row = rows[index];
            return row ? !requiresQc2Approval(row) : false;
        });

        if (nonQcRows.length > 0) {
            alert("Some selected rows do not require QC2 approval based on quantity thresholds. Use 'Move Selected to Dispatch' for those rows.");
            return;
        }

        const invalidIndex = selectedSupplierRows.find((index) => {
            const row = rows[index];
            if (!row) return true;
            return !row.dispatch_date || !row.sf_number || !row.sf_date || !row.awb_number || !row.awb_date ||
                !row.total_weight_kg || !row.tracking_number || !row.courier_details || !row.duty_details || !row.shipment_details;
        });

        if (typeof invalidIndex === "number") {
            alert(`Please fill all shipment fields for supplier row ${invalidIndex + 1} before sending to QC2.`);
            return;
        }

        const now = new Date().toISOString();
        const currentUser = localStorage.getItem("currentUser") || "Current User";

        const updatedRows = rows.map((row, index) =>
            selectedSupplierRows.includes(index)
                ? {
                      ...row,
                      qc2_status: "Pending QC2" as const,
                      qc2_submitted_date: now,
                      qc2_submitted_by: currentUser,
                  }
                : row
        );

        const updatedForm = {
            ...formData,
            supplier_details: updatedRows,
            qc2_status: "Pending QC2" as const,
            qc2_submitted_date: now,
            qc2_submitted_by: currentUser,
            stage_history: [
                ...(formData.stage_history || []),
                { stage: `Sent ${selectedSupplierRows.length} supplier item(s) for QC2 Approval`, date: now },
            ],
        };

        const allData: PostProcessItem[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
        const updatedAll = allData.map((item) => (item.id === id ? updatedForm : item));
        localStorage.setItem("postprocessData", JSON.stringify(updatedAll));
        setFormData(updatedForm);
        setSelectedSupplierRows([]);
        alert("Selected supplier items sent for QC2 approval.");
    };

    const moveSelectedToDispatch = async () => {
        if (!formData) return;
        if (selectedSupplierRows.length === 0) {
            alert("Please select at least one supplier item to move to Dispatch stage.");
            return;
        }

        const rows = formData.supplier_details || [];
        const blockedRow = selectedSupplierRows.find((index) => {
            const row = rows[index];
            if (!row) return true;
            return requiresQc2Approval(row) && row.qc2_status !== "Approved";
        });

        if (typeof blockedRow === "number") {
            alert(`Supplier row ${blockedRow + 1} requires QC2 approval (Active > 50 or Passive > 1000). Approve it in QC2 before moving to Dispatch.`);
            return;
        }

        const dispatchRows = await Promise.all(
            selectedSupplierRows
                .map((index) => rows[index])
                .filter(Boolean)
                .map(async (row) => {
                    const nextRow: SupplierDetail & {
                        total_weight_display: string;
                        excess_duty_display: string;
                    } = {
                        ...row,
                        total_weight_display: "-",
                        excess_duty_display: "-",
                    };

                    if (row.test_report_upload_url && !row.test_report_upload_file_key) {
                        const fileKey = `dispatch_emp_file_${formData.id}_${row.s_no}_${Date.now()}`;
                        await setIndexedDbItem(fileKey, row.test_report_upload_url);
                        nextRow.test_report_upload_file_key = fileKey;
                    }

                    if (row.qc2_image_upload_url && !row.qc2_image_upload_file_key) {
                        const fileKey = `dispatch_qc2_image_${formData.id}_${row.s_no}_${Date.now()}`;
                        await setIndexedDbItem(fileKey, row.qc2_image_upload_url);
                        nextRow.qc2_image_upload_file_key = fileKey;
                    }

                    if (row.qc2_file_url && !row.qc2_file_key) {
                        const fileKey = `dispatch_qc2_file_${formData.id}_${row.s_no}_${Date.now()}`;
                        await setIndexedDbItem(fileKey, row.qc2_file_url);
                        nextRow.qc2_file_key = fileKey;
                    }

                    delete nextRow.test_report_upload_url;
                    delete nextRow.qc2_image_upload_url;
                    delete nextRow.qc2_file_url;

                    return nextRow;
                })
        );

        const now = new Date().toISOString();
        const currentUser = localStorage.getItem("currentUser") || "Current User";

        const dispatchData = JSON.parse(localStorage.getItem("dispatchData") || "[]");
        dispatchData.push({
            id: crypto.randomUUID(),
            source_postprocess_id: formData.id,
            pipelineId,
            company_name: formData.company_name,
            department: formData.department,
            project_handled_by: formData.project_handled_by,
            created_date: formData.date,
            dispatch_status: "Draft",
            dispatch_submitted_by: currentUser,
            dispatch_submitted_date: now,
            supplier_details: dispatchRows,
            stage_history: [
                ...(formData.stage_history || []),
                { stage: `Moved ${dispatchRows.length} supplier item(s) to Dispatch`, date: now },
            ],
        });
        localStorage.setItem("dispatchData", JSON.stringify(dispatchData));

        const remainingRows = rows
            .filter((_, index) => !selectedSupplierRows.includes(index))
            .map((row, index) => ({ ...row, s_no: index + 1 }));

        const allPostprocess: PostProcessItem[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
        const updatedPostprocess = allPostprocess
            .map((item) => (item.id === formData.id ? { ...item, supplier_details: remainingRows } : item))
            .filter((item) => item.id !== formData.id || (Array.isArray(item.supplier_details) && item.supplier_details.length > 0));

        localStorage.setItem("postprocessData", JSON.stringify(updatedPostprocess));

        const updatedForm = { ...formData, supplier_details: remainingRows };
        setFormData(updatedForm);
        setSelectedSupplierRows([]);

        if (remainingRows.length === 0) {
            alert("Selected rows moved to Dispatch. No supplier rows left in this Post Process item.");
            router.push(`/crm/pipelines/${pipelineId}/postprocess`);
            return;
        }

        alert("Selected rows moved to Dispatch stage.");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        if (formData.post_process_status === "Completed") {
            const isProjectComplete = formData.working_timeline.length > 0 &&
                formData.working_timeline.every((task) => task.status === "Completed" && task.approved === "Yes");

            if (isProjectComplete) {
                setDialogState({
                    isOpen: true,
                    title: "Project Complete",
                    message: "All tasks are complete and approved. Mark this post process project as completed?",
                    onConfirm: () => proceedWithUpdate(),
                    isValidation: false,
                });
            } else {
                setDialogState({
                    isOpen: true,
                    title: "Cannot Complete Project",
                    message: "Please ensure all tasks in the Working Timeline are marked as 'Completed' and approved as 'Yes' before finishing the project.",
                    onConfirm: () => closeDialog(),
                    isValidation: true,
                });
            }
        } else {
            setDialogState({
                isOpen: true,
                title: "Confirm Update",
                message: "Are you sure you want to save these changes?",
                onConfirm: () => proceedWithUpdate(),
                isValidation: false,
            });
        }
    };

    const closeDialog = () => setDialogState({ isOpen: false, title: "", message: "", onConfirm: () => {}, isValidation: false });

    const proceedWithUpdate = () => {
        if (!formData) return;
        const data: PostProcessItem[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
        const updatedData = data.map((item) => (item.id === id ? formData : item));
        localStorage.setItem("postprocessData", JSON.stringify(updatedData));
        router.push(`/crm/pipelines/${pipelineId}/postprocess`);
    };

    if (!formData) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-green-700">Edit Post Process</h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8 flex flex-col">
                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm order-1">
                        <legend className="text-lg font-semibold text-gray-600">Original Details</legend>
                        <div className="grid grid-cols-1 gap-5 mt-4 md:grid-cols-4">
                            <div><label className="text-sm font-medium text-gray-500">Company</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.company_name}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Contact</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.contact}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">State</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.state}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Source</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.source}</p></div>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm order-2">
                        <legend className="text-lg font-semibold text-green-800">Financials & Billing</legend>
                        <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-2 lg:grid-cols-3">
                            <div><label className="block font-medium">Order Value</label><input type="number" name="order_value" value={formData.order_value} onChange={handleChange} className="w-full p-2 mt-1 border rounded" /></div>
                            <div><label className="block font-medium">Expense</label><input type="number" name="expense" value={formData.expense} onChange={handleChange} className="w-full p-2 mt-1 border rounded" /></div>
                            <div className="md:col-span-2 lg:col-span-1"><label className="block font-medium">Expense Bill Format</label><select name="expense_bill_format" value={formData.expense_bill_format} onChange={handleChange} className="w-full p-2 mt-1 bg-white border rounded"><option value="">Select a format</option>{expenseOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                            <div><label className="block font-medium text-blue-600">Profit</label><input type="text" value={(formData.profit || 0).toLocaleString("en-IN")} readOnly className="w-full p-2 mt-1 bg-blue-50 border-blue-200 rounded text-blue-800 font-semibold" /></div>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm order-6">
                        <legend className="text-lg font-semibold text-green-800">Supplier Details (Post Process)</legend>

                        <div className="overflow-x-auto border rounded">
                            <table className="w-full min-w-[1200px] text-sm table-fixed">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="p-2 text-left">Select</th>
                                        <th className="p-2 text-left">S.No</th>
                                        <th className="p-2 text-left">Component Type</th>
                                        <th className="p-2 text-left">Manufacturer - Part Number</th>
                                        <th className="p-2 text-left">Vendor</th>
                                        <th className="p-2 text-left">Currency</th>
                                        <th className="p-2 text-right">Req Qty</th>
                                        <th className="p-2 text-right">Excise Qty</th>
                                        <th className="p-2 text-right">Total Price</th>
                                        <th className="p-2 text-left">QC2 Image</th>
                                        <th className="p-2 text-left">QC2</th>
                                        <th className="p-2 text-left">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(formData.supplier_details || []).map((row, index) => (
                                        <tr key={`main-${index}`} className="border-t align-top">
                                            <td className="p-2"><input type="checkbox" checked={selectedSupplierRows.includes(index)} onChange={() => toggleSupplierSelection(index)} /></td>
                                            <td className="p-2">{row.s_no}</td>
                                            <td className="p-2">{row.component_type}</td>
                                            <td className="p-2 max-w-[220px] truncate" title={row.manufacturer_part_number}>{row.manufacturer_part_number || "-"}</td>
                                            <td className="p-2 max-w-[180px] truncate" title={row.vendor_details}>{row.vendor_details || "-"}</td>
                                            <td className="p-2">{row.currency || "-"}</td>
                                            <td className="p-2 text-right">{row.req_quantity}</td>
                                            <td className="p-2 text-right">{row.excise_quantity}</td>
                                            <td className="p-2 text-right font-semibold">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                                            <td className="p-2">
                                                {row.qc2_image_upload ? (
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-gray-600 truncate" title={row.qc2_image_upload}>{row.qc2_image_upload}</p>
                                                        {row.qc2_image_upload_url && (
                                                            <button type="button" onClick={() => openFile(row.qc2_image_upload_url)} className="text-xs text-blue-600 hover:underline">View Image</button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-red-500 font-semibold">Missing</span>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                                    row.qc2_status === "Approved"
                                                        ? "bg-green-100 text-green-800"
                                                        : row.qc2_status === "Rejected" || row.qc2_status === "QC2 Rework Required"
                                                        ? "bg-red-100 text-red-800"
                                                        : row.qc2_status === "Pending QC2"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-gray-100 text-gray-800"
                                                }`}>
                                                    {row.qc2_status === "Rejected" || row.qc2_status === "QC2 Rework Required" ? "Not Approved" : row.qc2_status || "Not Sent"}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => openEditSupplierModal(index, "shipment")} className="p-2 text-blue-500 hover:text-blue-700" title="Edit shipment/QC2 details">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditSupplierModal(index, "component")}
                                                        className="px-2 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-50"
                                                        title="Edit component details (will go to Pre-Process reapproval)"
                                                    >
                                                        Edit Details
                                                    </button>
                                                    <button type="button" onClick={() => removeSupplierRow(index)} className="p-2 text-red-500 hover:text-red-700" title="Delete row"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
                            <span className="text-xs text-gray-500">Selected: {selectedSupplierRows.length}</span>
                            <button type="button" onClick={moveSelectedToDispatch} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded hover:bg-emerald-700">Move Selected to Dispatch</button>
                            <button type="button" onClick={sendSelectedForQc2Approval} className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">Send Selected Items for QC2 Approval</button>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm order-4">
                        <legend className="text-lg font-semibold text-green-800">Working Timeline</legend>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                                        <th>S.No</th><th className="px-2">Description</th><th className="px-2">Deadline</th><th className="px-2">Status</th><th className="px-2">Approved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.working_timeline.map((row, index) => (
                                        <tr key={index}>
                                            <td className="p-2">{row.s_no}</td>
                                            <td className="px-2 py-2">{row.description || "-"}</td>
                                            <td className="px-2 py-2">{row.deadline || "-"}</td>
                                            <td className="px-2"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${row.status === "Completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{row.status}</span></td>
                                            <td className="px-2"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${row.approved === "Yes" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{row.approved}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm order-5">
                        <legend className="text-lg font-semibold text-green-800">Project Timeline</legend>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                                        <th>S.No</th><th className="px-2">Description</th><th className="px-2">Deadline</th><th className="px-2">Status</th><th className="px-2">Final File</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.project_timeline.map((row, index) => (
                                        <tr key={index}>
                                            <td className="p-2">{row.s_no}</td>
                                            <td className="px-2 py-2">{row.description || "-"}</td>
                                            <td className="px-2 py-2">{row.deadline || "-"}</td>
                                            <td className="px-2"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${row.status === "Completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{row.status}</span></td>
                                            <td className="px-2 py-2">{row.final_fileName || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm order-7">
                        <legend className="text-lg font-semibold text-green-800">Project Status</legend>
                        <div className="mt-4">
                            <label htmlFor="post_process_status" className="block font-medium">Update Project Status</label>
                            <select id="post_process_status" name="post_process_status" value={formData.post_process_status} onChange={handleChange} className="w-full p-2 mt-1 bg-white border rounded">
                                <option value="Pending">In Progress</option>
                                <option value="Completed">Mark as Completed</option>
                            </select>
                            <p className="text-sm text-gray-500 mt-2">To mark this project as completed, ensure all Working Timeline tasks are marked as Completed and approved as Yes.</p>
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 pt-6 mt-4 border-t">
                        <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/postprocess`)} className="px-6 py-2 font-semibold border rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                        <button type="submit" className="px-6 py-2 font-semibold text-white bg-green-600 rounded hover:bg-green-700">Update Project</button>
                    </div>
                </form>
            </div>

            {dialogState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
                        <p className="mt-3 text-gray-600">{dialogState.message}</p>
                        <div className="flex justify-end mt-6 space-x-4">
                            {!dialogState.isValidation && <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>}
                            <button onClick={dialogState.onConfirm} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">{dialogState.isValidation ? "OK" : "Confirm"}</button>
                        </div>
                    </div>
                </div>
            )}

            {isSupplierModalOpen && supplierDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
                    <div className="w-full max-w-6xl bg-white rounded-lg shadow-xl">
                        <div className="px-6 py-4 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">
                                {supplierModalMode === "shipment" ? "Edit Shipment & QC2 Fields" : "Edit Component Details"} #{supplierDraft.s_no}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {supplierModalMode === "shipment"
                                    ? "Component details are read-only here. Use Edit Details to modify component master fields."
                                    : "Saving here sends this component back to Pre-Process for QC1 and Admin approval, then it rejoins Post Process."}
                            </p>
                        </div>

                        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                            {supplierModalMode === "shipment" ? (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <h3 className="font-semibold text-gray-800 mb-3">Supplier Details (Read-only)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        <div><label className="block text-gray-600">Component Type</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.component_type || "-"}</p></div>
                                        <div className="lg:col-span-3"><label className="block text-gray-600">Manufacturer - Part Number</label><p className="mt-1 p-2 bg-white border rounded break-words">{supplierDraft.manufacturer_part_number || "-"}</p></div>
                                        <div className="lg:col-span-2"><label className="block text-gray-600">Vendor Details</label><p className="mt-1 p-2 bg-white border rounded break-words">{supplierDraft.vendor_details || "-"}</p></div>
                                        <div><label className="block text-gray-600">Currency</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.currency || "-"}</p></div>
                                        <div><label className="block text-gray-600">Percentage</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.percentage ?? 0}</p></div>
                                        <div><label className="block text-gray-600">Req Quantity</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.req_quantity ?? 0}</p></div>
                                        <div><label className="block text-gray-600">Excise Quantity</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.excise_quantity ?? 0}</p></div>
                                        <div><label className="block text-gray-600">Quantity</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.quantity ?? 0}</p></div>
                                        <div><label className="block text-gray-600">Unit Price</label><p className="mt-1 p-2 bg-white border rounded">{supplierDraft.unit_price ?? 0}</p></div>
                                        <div><label className="block text-gray-600">Total Price</label><p className="mt-1 p-2 bg-white border rounded font-semibold">{supplierDraft.total_price ?? 0}</p></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border rounded-lg p-4 bg-indigo-50">
                                    <h3 className="font-semibold text-gray-800 mb-3">Component Details (Editable)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <label className="block text-gray-600">Component Type</label>
                                            <select value={supplierDraft.component_type} onChange={(e) => handleSupplierDraftChange("component_type", e.target.value)} className="w-full p-2 border rounded mt-1 bg-white">
                                                <option value="Active">Active</option>
                                                <option value="Passive">Passive</option>
                                            </select>
                                        </div>
                                        <div className="lg:col-span-3">
                                            <label className="block text-gray-600">Manufacturer - Part Number</label>
                                            <input type="text" value={supplierDraft.manufacturer_part_number || ""} onChange={(e) => handleSupplierDraftChange("manufacturer_part_number", e.target.value)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="block text-gray-600">Vendor Details</label>
                                            <input type="text" value={supplierDraft.vendor_details || ""} onChange={(e) => handleSupplierDraftChange("vendor_details", e.target.value)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Currency</label>
                                            <input type="text" value={supplierDraft.currency || ""} onChange={(e) => handleSupplierDraftChange("currency", e.target.value)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Percentage</label>
                                            <input type="number" value={supplierDraft.percentage ?? 0} onChange={(e) => handleSupplierDraftChange("percentage", parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Req Quantity</label>
                                            <input type="number" value={supplierDraft.req_quantity ?? 0} onChange={(e) => handleSupplierDraftChange("req_quantity", parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Quantity</label>
                                            <input type="number" value={supplierDraft.quantity ?? 0} onChange={(e) => handleSupplierDraftChange("quantity", parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Unit Price</label>
                                            <input type="number" value={supplierDraft.unit_price ?? 0} onChange={(e) => handleSupplierDraftChange("unit_price", parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded mt-1 bg-white" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Excise Quantity</label>
                                            <input type="number" value={supplierDraft.excise_quantity ?? 0} readOnly className="w-full p-2 border rounded mt-1 bg-gray-100" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600">Total Price</label>
                                            <input type="number" value={supplierDraft.total_price ?? 0} readOnly className="w-full p-2 border rounded mt-1 bg-gray-100 font-semibold" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {supplierModalMode === "shipment" && (
                                <div className="border rounded-lg p-4 bg-blue-50">
                                    <h3 className="font-semibold text-gray-800 mb-3">QC2 Image Upload (Required)</h3>
                                    <input type="file" accept="image/*" onChange={(e) => handleSupplierDraftImageUpload(e.target.files?.[0] || null)} className="w-full p-2 border rounded bg-white text-sm" />
                                    {supplierDraft.qc2_image_upload && (
                                        <div className="mt-3">
                                            <p className="text-xs text-gray-600 break-words">{supplierDraft.qc2_image_upload}</p>
                                            {supplierDraft.qc2_image_upload_url && (
                                                <button type="button" onClick={() => openFile(supplierDraft.qc2_image_upload_url)} className="text-xs text-blue-600 hover:underline mt-1">View Image</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {supplierModalMode === "shipment" && (
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-800 mb-3">Shipment Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        <div><label className="block text-gray-600">Dispatch Date</label><input type="date" value={supplierDraft.dispatch_date || ""} onChange={(e) => handleSupplierDraftChange("dispatch_date", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">SF Number</label><input type="text" value={supplierDraft.sf_number || ""} onChange={(e) => handleSupplierDraftChange("sf_number", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">SF Date</label><input type="date" value={supplierDraft.sf_date || ""} onChange={(e) => handleSupplierDraftChange("sf_date", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">AWB Number</label><input type="text" value={supplierDraft.awb_number || ""} onChange={(e) => handleSupplierDraftChange("awb_number", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">AWB Date</label><input type="date" value={supplierDraft.awb_date || ""} onChange={(e) => handleSupplierDraftChange("awb_date", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">Total Weight (kg)</label><input type="number" value={supplierDraft.total_weight_kg || 0} onChange={(e) => handleSupplierDraftChange("total_weight_kg", parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">Tracking Number</label><input type="text" value={supplierDraft.tracking_number || ""} onChange={(e) => handleSupplierDraftChange("tracking_number", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">Courier Details</label><input type="text" value={supplierDraft.courier_details || ""} onChange={(e) => handleSupplierDraftChange("courier_details", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div><label className="block text-gray-600">Duty Details</label><input type="text" value={supplierDraft.duty_details || ""} onChange={(e) => handleSupplierDraftChange("duty_details", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                        <div className="lg:col-span-2"><label className="block text-gray-600">Shipment Details</label><input type="text" value={supplierDraft.shipment_details || ""} onChange={(e) => handleSupplierDraftChange("shipment_details", e.target.value)} className="w-full p-2 border rounded mt-1" /></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t flex justify-end gap-3">
                            <button type="button" onClick={closeSupplierModal} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                            <button type="button" onClick={saveSupplierModal} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                                {supplierModalMode === "shipment" ? "Save Shipment" : "Save & Send To Pre-Process"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
