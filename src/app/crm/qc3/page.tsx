"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DispatchSupplierDetail = {
  s_no: number;
  component_type: "Active" | "Passive";
  manufacturer_part_number: string;
  vendor_details: string;
  req_quantity: number;
  qc2_status?: string;
  total_weight_display?: string;
  excess_duty_display?: string;
  qc3_remark?: string;
};

type FinalQcItem = {
  id: string;
  dispatch_id: string;
  source_postprocess_id?: string;
  pipelineId: string;
  company_name: string;
  department?: string;
  project_handled_by?: string;
  created_date?: string;
  status: "Pending" | "Approved" | "Rejected";
  qc3_submitted_date?: string;
  qc3_submitted_by?: string;
  qc3_reviewed_date?: string;
  qc3_reviewed_by?: string;
  qc3_remark?: string;
  supplier_details: DispatchSupplierDetail[];
  stage_history?: Array<{ stage: string; date: string }>;
};

type DeliveryItem = {
  id: string;
  pipelineId: string;
  company_name: string;
  project_handled_by?: string;
  supplier_details?: DispatchSupplierDetail[];
  status?: string;
  stage_history?: Array<{ stage: string; date: string }>;
  source_final_qc_id?: string;
};

type PostProcessItem = {
  id: string;
  date: string;
  department: string;
  company_name: string;
  contact: string;
  state: string;
  deadline: string;
  description: string;
  source: string;
  customer_notes: string;
  order_value: number;
  advance_payment: { amount: number; bank_details: string; date: string };
  expense: number;
  profit: number;
  balance_due: number;
  project_handled_by: string;
  working_timeline: Array<{ s_no: number; description: string; deadline: string; status: "Completed" | "Over Due"; approved: "Yes" | "Rework" }>;
  project_timeline: Array<{ s_no: number; description: string; deadline: string; status: "Completed" | "Over Due"; final_fileName?: string }>;
  supplier_details?: DispatchSupplierDetail[];
  expense_bill_format: string;
  post_process_status: "Pending" | "Completed";
  stage_history?: Array<{ stage: string; date: string }>;
};

export default function Qc3DashboardPage() {
  const [items, setItems] = useState<FinalQcItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = () => {
    const all: FinalQcItem[] = JSON.parse(localStorage.getItem("finalQcData") || "[]");
    setItems(all);
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = useMemo(() => items.filter((item) => item.status === "Pending").length, [items]);

  const setItemDraft = (itemId: string, patch: Partial<FinalQcItem>) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  };

  const upsertRejectedToPostProcess = (qcItem: FinalQcItem, now: string) => {
    const allPostprocess: PostProcessItem[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
    const sourceId = qcItem.source_postprocess_id || `postprocess_from_qc3_${qcItem.dispatch_id}`;

    const existingIndex = allPostprocess.findIndex((item) => item.id === sourceId);
    if (existingIndex >= 0) {
      const existing = allPostprocess[existingIndex];
      const existingRows = Array.isArray(existing.supplier_details) ? existing.supplier_details : [];
      const incomingRows = (qcItem.supplier_details || []).map((row, idx) => ({
        ...row,
        s_no: existingRows.length + idx + 1,
      }));

      allPostprocess[existingIndex] = {
        ...existing,
        post_process_status: "Pending",
        supplier_details: [...existingRows, ...incomingRows],
        stage_history: [
          ...(existing.stage_history || []),
          { stage: "Returned from QC3 Rejection", date: now },
        ],
      };
    } else {
      const restoredItem: PostProcessItem = {
        id: sourceId,
        date: now,
        department: qcItem.department || "",
        company_name: qcItem.company_name,
        contact: "",
        state: "",
        deadline: "",
        description: "Returned from QC3 for rework",
        source: "QC3 Rejection",
        customer_notes: qcItem.qc3_remark || "",
        order_value: 0,
        advance_payment: { amount: 0, bank_details: "", date: "" },
        expense: 0,
        profit: 0,
        balance_due: 0,
        project_handled_by: qcItem.project_handled_by || "",
        working_timeline: [],
        project_timeline: [],
        supplier_details: (qcItem.supplier_details || []).map((row, idx) => ({ ...row, s_no: idx + 1 })),
        expense_bill_format: "",
        post_process_status: "Pending",
        stage_history: [{ stage: "Returned from QC3 Rejection", date: now }],
      };

      allPostprocess.push(restoredItem);
    }

    localStorage.setItem("postprocessData", JSON.stringify(allPostprocess));
  };

  const upsertApprovedToDelivery = (qcItem: FinalQcItem, now: string) => {
    const allDelivery: DeliveryItem[] = JSON.parse(localStorage.getItem("deliveryData") || "[]");
    const existingIndex = allDelivery.findIndex((entry) => entry.source_final_qc_id === qcItem.id);

    const nextDeliveryItem: DeliveryItem = {
      id: existingIndex >= 0 ? allDelivery[existingIndex].id : crypto.randomUUID(),
      source_final_qc_id: qcItem.id,
      pipelineId: qcItem.pipelineId,
      company_name: qcItem.company_name,
      project_handled_by: qcItem.project_handled_by || "",
      supplier_details: (qcItem.supplier_details || []).map((row, index) => ({
        ...row,
        s_no: index + 1,
      })),
      status: "Completed",
      stage_history: [
        ...(qcItem.stage_history || []),
        { stage: "Moved to Delivery", date: now },
      ],
    };

    if (existingIndex >= 0) {
      allDelivery[existingIndex] = nextDeliveryItem;
    } else {
      allDelivery.push(nextDeliveryItem);
    }

    localStorage.setItem("deliveryData", JSON.stringify(allDelivery));
  };

  const handleSubmitReview = (itemId: string) => {
    const allFinalQc: FinalQcItem[] = JSON.parse(localStorage.getItem("finalQcData") || "[]");
    const current = items.find((item) => item.id === itemId);
    if (!current) return;
    if (current.status === "Pending") {
      alert("Please choose Approved or Rejected before submitting QC3 review.");
      return;
    }

    const now = new Date().toISOString();
    const currentUser = localStorage.getItem("currentUser") || "QC3 Team";

    const reviewedCurrent: FinalQcItem = {
      ...current,
      status: current.status,
      qc3_remark: current.qc3_remark || "",
      qc3_reviewed_date: now,
      qc3_reviewed_by: currentUser,
      stage_history: [
        ...(current.stage_history || []),
        { stage: current.status === "Approved" ? "QC3 Approved" : "QC3 Rejected", date: now },
      ],
    };

    const updatedFinalQc =
      current.status === "Approved"
        ? allFinalQc.filter((item) => item.id !== itemId)
        : allFinalQc.map((item) => (item.id === itemId ? reviewedCurrent : item));
    localStorage.setItem("finalQcData", JSON.stringify(updatedFinalQc));

    const dispatchData = JSON.parse(localStorage.getItem("dispatchData") || "[]");
    const updatedDispatch = dispatchData.map((item: { id: string; dispatch_status: string; stage_history?: Array<{ stage: string; date: string }> }) => {
      if (item.id !== current.dispatch_id) return item;
      return {
        ...item,
        dispatch_status: current.status === "Rejected" ? "Returned to Post Process" : item.dispatch_status,
        stage_history: [
          ...(item.stage_history || []),
          { stage: current.status === "Approved" ? "QC3 Approved" : "QC3 Rejected and returned to Post Process", date: now },
        ],
      };
    });
    localStorage.setItem("dispatchData", JSON.stringify(updatedDispatch));

    if (current.status === "Rejected") {
      upsertRejectedToPostProcess(reviewedCurrent, now);
    }

    if (current.status === "Approved") {
      upsertApprovedToDelivery(reviewedCurrent, now);
    }

    loadData();
    alert(current.status === "Approved" ? "QC3 approved. Item moved to Delivery stage." : "QC3 rejected. Item moved back to Post Process.");
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-700">QC3 Dashboard</h1>
          <p className="text-gray-600 mt-1">Physical inspection queue for components sent after Dispatch admin approval.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Final QC Items</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Pending QC3</p>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Last Refresh</p>
            <p className="text-sm font-semibold text-gray-900">{format(new Date(), "dd/MM/yyyy hh:mm a")}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500">No items pending QC3 review.</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const submittedAt = item.qc3_submitted_date ? format(new Date(item.qc3_submitted_date), "dd/MM/yyyy hh:mm a") : "-";

              return (
                <div key={item.id} className="bg-white border rounded-lg shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full text-left px-4 py-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start md:items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">{item.project_handled_by || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">{submittedAt}</p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            item.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : item.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-teal-700 font-semibold text-sm">
                        {expandedId === item.id ? "Hide Details" : "View Details"}
                        {expandedId === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </button>

                  {expandedId === item.id && (
                    <div className="border-t px-4 pb-4">
                      <div className="mt-4 mb-3 flex flex-wrap items-center gap-3">
                        <div className="min-w-[200px]">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">QC3 Decision</label>
                          <select
                            value={item.status}
                            onChange={(e) => setItemDraft(item.id, { status: e.target.value as "Pending" | "Approved" | "Rejected" })}
                            className="w-full p-2 border rounded bg-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="flex-1 min-w-[240px]">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">QC3 Remark</label>
                          <input
                            type="text"
                            value={item.qc3_remark || ""}
                            onChange={(e) => setItemDraft(item.id, { qc3_remark: e.target.value })}
                            placeholder="Inspection remark"
                            className="w-full p-2 border rounded"
                          />
                        </div>
                        <div className="self-end">
                          <button
                            type="button"
                            onClick={() => handleSubmitReview(item.id)}
                            className="px-5 py-2 font-semibold text-white bg-teal-600 rounded hover:bg-teal-700"
                          >
                            Submit QC3 Review
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full min-w-[1100px] text-sm">
                          <thead className="bg-gray-100 text-gray-700">
                            <tr>
                              <th className="p-2 text-left">S.No</th>
                              <th className="p-2 text-left">Type</th>
                              <th className="p-2 text-left">Manufacturer - Part Number</th>
                              <th className="p-2 text-left">Vendor</th>
                              <th className="p-2 text-right">Req Qty</th>
                              <th className="p-2 text-left">QC2 Status</th>
                              <th className="p-2 text-left">Total Weight</th>
                              <th className="p-2 text-left">Excess Duty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(item.supplier_details || []).map((row, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">{row.s_no}</td>
                                <td className="p-2">{row.component_type}</td>
                                <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                                <td className="p-2">{row.vendor_details || "-"}</td>
                                <td className="p-2 text-right">{row.req_quantity || 0}</td>
                                <td className="p-2">{row.qc2_status || "-"}</td>
                                <td className="p-2">{row.total_weight_display || "-"}</td>
                                <td className="p-2">{row.excess_duty_display || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
