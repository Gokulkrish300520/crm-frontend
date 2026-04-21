"use client";

import { useEffect, useState } from "react";

type DispatchSupplierDetail = {
  s_no: number;
  component_type: "Active" | "Passive";
  manufacturer_part_number: string;
  vendor_details: string;
  req_quantity: number;
  qc2_status?: string;
  total_weight_display?: string;
  excess_duty_display?: string;
};

type DispatchItem = {
  id: string;
  source_postprocess_id?: string;
  pipelineId: string;
  company_name: string;
  dispatch_status: "Draft" | "Pending Admin Approval" | "Approved";
  department?: string;
  project_handled_by?: string;
  created_date?: string;
  supplier_details: DispatchSupplierDetail[];
  stage_history?: Array<{ stage: string; date: string }>;
  dispatch_approved_by?: string;
  dispatch_approved_date?: string;
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

type DispatchApprovalRequest = {
  id: string;
  dispatchId: string;
  pipelineId: string;
  company_name: string;
  status: "Pending" | "Approved";
  requested_by: string;
  requested_date: string;
  approved_by?: string;
  approved_date?: string;
};

type RowDraft = { totalWeight: string; excessDuty: string };

export default function DispatchApprovalsPage() {
  const [requests, setRequests] = useState<DispatchApprovalRequest[]>([]);
  const [dispatchMap, setDispatchMap] = useState<Record<string, DispatchItem>>({});
  const [drafts, setDrafts] = useState<Record<string, RowDraft[]>>({});

  const loadData = () => {
    const reqs: DispatchApprovalRequest[] = JSON.parse(localStorage.getItem("dispatchApprovalRequests") || "[]");
    const dispatchData: DispatchItem[] = JSON.parse(localStorage.getItem("dispatchData") || "[]");

    const map: Record<string, DispatchItem> = {};
    dispatchData.forEach((item) => {
      map[item.id] = item;
    });

    const pending = reqs.filter((req) => req.status === "Pending" && map[req.dispatchId]);
    const nextDrafts: Record<string, RowDraft[]> = {};

    pending.forEach((req) => {
      const item = map[req.dispatchId];
      nextDrafts[req.id] = (item?.supplier_details || []).map((row) => ({
        totalWeight: row.total_weight_display || "-",
        excessDuty: row.excess_duty_display || "-",
      }));
    });

    setRequests(pending);
    setDispatchMap(map);
    setDrafts(nextDrafts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDraftChange = (requestId: string, rowIndex: number, field: "totalWeight" | "excessDuty", value: string) => {
    setDrafts((prev) => {
      const rows = prev[requestId] ? [...prev[requestId]] : [];
      rows[rowIndex] = rows[rowIndex] || { totalWeight: "-", excessDuty: "-" };
      rows[rowIndex] = { ...rows[rowIndex], [field]: value || "-" };
      return { ...prev, [requestId]: rows };
    });
  };

  const approveRequest = (requestId: string) => {
    const request = requests.find((req) => req.id === requestId);
    if (!request) return;

    const dispatchData: DispatchItem[] = JSON.parse(localStorage.getItem("dispatchData") || "[]");
    const finalQcData: FinalQcItem[] = JSON.parse(localStorage.getItem("finalQcData") || "[]");
    const currentUser = localStorage.getItem("currentUser") || "Admin";
    const now = new Date().toISOString();
    let approvedDispatch: DispatchItem | undefined;

    const updatedDispatch = dispatchData.map((item) => {
      if (item.id !== request.dispatchId) return item;

      const rowDrafts = drafts[requestId] || [];
      const supplier_details = (item.supplier_details || []).map((row, index) => ({
        ...row,
        total_weight_display: rowDrafts[index]?.totalWeight || "-",
        excess_duty_display: rowDrafts[index]?.excessDuty || "-",
      }));

      approvedDispatch = {
        ...item,
        supplier_details,
        dispatch_status: "Approved" as const,
        dispatch_approved_by: currentUser,
        dispatch_approved_date: now,
        stage_history: [
          ...(item.stage_history || []),
          { stage: "Dispatch approved by Admin", date: now },
          { stage: "Sent for QC3 Review", date: now },
        ],
      };

      return approvedDispatch;
    });
    localStorage.setItem("dispatchData", JSON.stringify(updatedDispatch));

    if (approvedDispatch) {
      const existingIndex = finalQcData.findIndex((item) => item.dispatch_id === approvedDispatch?.id);
      const nextFinalQcItem: FinalQcItem = {
        id: existingIndex >= 0 ? finalQcData[existingIndex].id : crypto.randomUUID(),
        dispatch_id: approvedDispatch.id,
        source_postprocess_id: approvedDispatch.source_postprocess_id,
        pipelineId: approvedDispatch.pipelineId,
        company_name: approvedDispatch.company_name,
        department: approvedDispatch.department || "",
        project_handled_by: approvedDispatch.project_handled_by || "",
        created_date: approvedDispatch.created_date || now,
        status: "Pending",
        qc3_submitted_date: now,
        qc3_submitted_by: currentUser,
        qc3_reviewed_date: existingIndex >= 0 ? finalQcData[existingIndex].qc3_reviewed_date : "",
        qc3_reviewed_by: existingIndex >= 0 ? finalQcData[existingIndex].qc3_reviewed_by : "",
        qc3_remark: existingIndex >= 0 ? finalQcData[existingIndex].qc3_remark : "",
        supplier_details: approvedDispatch.supplier_details || [],
        stage_history: [
          ...(approvedDispatch.stage_history || []),
          { stage: "Final QC entered with Pending QC3", date: now },
        ],
      };

      if (existingIndex >= 0) {
        finalQcData[existingIndex] = nextFinalQcItem;
      } else {
        finalQcData.push(nextFinalQcItem);
      }

      localStorage.setItem("finalQcData", JSON.stringify(finalQcData));
    }

    const allRequests: DispatchApprovalRequest[] = JSON.parse(localStorage.getItem("dispatchApprovalRequests") || "[]");
    const updatedRequests = allRequests.map((req) =>
      req.id === requestId
        ? {
            ...req,
            status: "Approved" as const,
            approved_by: currentUser,
            approved_date: now,
          }
        : req
    );
    localStorage.setItem("dispatchApprovalRequests", JSON.stringify(updatedRequests));

    alert("Dispatch request approved and sent for QC3 review. Final QC status is now Pending.");
    loadData();
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-700">Dispatch Approvals (Admin)</h1>
          <p className="text-gray-600 mt-1">Fill Total Weight and Excess Duty for each supplier row, then approve.</p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-gray-500">No pending dispatch approvals.</div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const item = dispatchMap[request.dispatchId];
              if (!item) return null;

              return (
                <div key={request.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{request.company_name}</p>
                      <p className="text-xs text-gray-600">Requested by {request.requested_by}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => approveRequest(request.id)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      Approve Dispatch
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
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
                        {(item.supplier_details || []).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{row.s_no}</td>
                            <td className="p-2">{row.component_type}</td>
                            <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                            <td className="p-2">{row.vendor_details || "-"}</td>
                            <td className="p-2 text-right">{row.req_quantity || 0}</td>
                            <td className="p-2">{row.qc2_status || "Not Sent"}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={drafts[request.id]?.[index]?.totalWeight || "-"}
                                onChange={(e) => handleDraftChange(request.id, index, "totalWeight", e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="-"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={drafts[request.id]?.[index]?.excessDuty || "-"}
                                onChange={(e) => handleDraftChange(request.id, index, "excessDuty", e.target.value)}
                                className="w-full p-2 border rounded"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
