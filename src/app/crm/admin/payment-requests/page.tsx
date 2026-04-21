"use client";

import { getIndexedDbItem } from "@/utils/indexedDbStorage";
import { format } from "date-fns";
import { useEffect, useState } from "react";

type PaymentRequestComponent = {
  s_no: number;
  component_type?: string;
  manufacturer_part_number?: string;
  vendor_details?: string;
  req_quantity?: number;
  total_price?: number;
};

type PaymentRequest = {
  id: string;
  pipelineId: string;
  source_stage: "postprocess" | "dispatch" | "final-qc" | "delivery" | "payment-pending";
  source_item_id: string;
  company_name: string;
  requested_by: string;
  requested_date: string;
  status: "Pending" | "Paid";
  invoice_name?: string;
  invoice_file_key?: string;
  invoice_url?: string;
  component_snos: number[];
  components: PaymentRequestComponent[];
  paid_by?: string;
  paid_date?: string;
};

type StageHistory = { stage: string; date: string };

type StageSupplierDetail = {
  s_no: number;
  component_type?: "Active" | "Passive";
  manufacturer_part_number?: string;
  vendor_details?: string;
  currency?: string;
  req_quantity?: number;
  excise_quantity?: number;
  total_price?: number;
  payment_request_status?: "Not Requested" | "Pending Approval" | "Paid";
  payment_request_id?: string;
  [key: string]: unknown;
};

type PostprocessEntry = {
  id: string;
  pipelineId?: string;
  company_name?: string;
  department?: string;
  project_handled_by?: string;
  date?: string;
  supplier_details?: StageSupplierDetail[];
  stage_history?: StageHistory[];
  [key: string]: unknown;
};

type DispatchEntry = {
  id: string;
  source_postprocess_id?: string;
  pipelineId: string;
  company_name: string;
  department: string;
  project_handled_by: string;
  created_date: string;
  dispatch_status: "Draft" | "Pending Admin Approval" | "Approved" | "Returned to Post Process";
  supplier_details: StageSupplierDetail[];
  stage_history?: StageHistory[];
  [key: string]: unknown;
};

const getStorageKeyForStage = (stage: PaymentRequest["source_stage"]) => {
  if (stage === "postprocess") return "postprocessData";
  if (stage === "dispatch") return "dispatchData";
  if (stage === "final-qc") return "finalQcData";
  if (stage === "delivery") return "deliveryData";
  return "paymentPendingData";
};

export default function PaymentRequestsAdminPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = () => {
    const all: PaymentRequest[] = JSON.parse(localStorage.getItem("paymentRequests") || "[]");
    setRequests(all.sort((a, b) => new Date(b.requested_date).getTime() - new Date(a.requested_date).getTime()));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openInvoice = async (fileKey?: string, fallbackUrl?: string) => {
    const fileUrl = fileKey ? ((await getIndexedDbItem<string>(fileKey)) ?? fallbackUrl) : fallbackUrl;
    if (!fileUrl) {
      alert("Invoice file is not available.");
      return;
    }
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const markAsPaid = (requestId: string) => {
    const allRequests: PaymentRequest[] = JSON.parse(localStorage.getItem("paymentRequests") || "[]");
    const target = allRequests.find((req) => req.id === requestId);
    if (!target) return;

    const now = new Date().toISOString();
    const currentUser = localStorage.getItem("currentUser") || "Admin";

    const updatedRequests = allRequests.map((req) =>
      req.id === requestId
        ? {
            ...req,
            status: "Paid" as const,
            paid_by: currentUser,
            paid_date: now,
          }
        : req
    );
    localStorage.setItem("paymentRequests", JSON.stringify(updatedRequests));

    const storageKey = getStorageKeyForStage(target.source_stage);
    const stageData = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const updatedStageData = stageData.map((entry: { id: string; supplier_details?: Array<{ s_no: number; payment_request_status?: string; payment_request_id?: string }>; stage_history?: Array<{ stage: string; date: string }> }) => {
      if (entry.id !== target.source_item_id) return entry;
      return {
        ...entry,
        supplier_details: (entry.supplier_details || []).map((row) =>
          target.component_snos.includes(row.s_no)
            ? {
                ...row,
                payment_request_status: "Paid",
                payment_request_id: requestId,
              }
            : row
        ),
        stage_history: [...(entry.stage_history || []), { stage: "Payment Completed", date: now }],
      };
    });
    localStorage.setItem(storageKey, JSON.stringify(updatedStageData));

    if (target.source_stage === "postprocess") {
      const allPostprocess: PostprocessEntry[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
      const sourceItem = allPostprocess.find((entry) => entry.id === target.source_item_id);

      if (sourceItem) {
        const sourceRows = Array.isArray(sourceItem.supplier_details) ? sourceItem.supplier_details : [];
        const rowsToMove = sourceRows.filter((row) => target.component_snos.includes(row.s_no));

        if (rowsToMove.length > 0) {
          const remainingRows = sourceRows.filter((row) => !target.component_snos.includes(row.s_no));

          const updatedPostprocess = allPostprocess
            .map((entry) => {
              if (entry.id !== sourceItem.id) return entry;
              return {
                ...entry,
                supplier_details: remainingRows,
                stage_history: [...(entry.stage_history || []), { stage: "Paid Components Moved to Dispatch", date: now }],
              };
            })
            .filter((entry) => (entry.id !== sourceItem.id ? true : (entry.supplier_details || []).length > 0));

          localStorage.setItem("postprocessData", JSON.stringify(updatedPostprocess));

          const allDispatch: DispatchEntry[] = JSON.parse(localStorage.getItem("dispatchData") || "[]");
          const dispatchIndex = allDispatch.findIndex(
            (entry) => entry.source_postprocess_id === sourceItem.id && String(entry.pipelineId) === String(target.pipelineId)
          );

          const movedRows = rowsToMove.map((row, index) => ({
            ...row,
            s_no:
              dispatchIndex >= 0
                ? (allDispatch[dispatchIndex].supplier_details?.length || 0) + index + 1
                : index + 1,
            payment_request_status: "Paid" as const,
            payment_request_id: requestId,
          }));

          if (dispatchIndex >= 0) {
            allDispatch[dispatchIndex] = {
              ...allDispatch[dispatchIndex],
              supplier_details: [...(allDispatch[dispatchIndex].supplier_details || []), ...movedRows],
              stage_history: [...(allDispatch[dispatchIndex].stage_history || []), { stage: "Components Added After Payment Approval", date: now }],
            };
          } else {
            allDispatch.push({
              id: crypto.randomUUID(),
              source_postprocess_id: sourceItem.id,
              pipelineId: target.pipelineId,
              company_name: sourceItem.company_name || target.company_name,
              department: sourceItem.department || "",
              project_handled_by: sourceItem.project_handled_by || "",
              created_date: sourceItem.date || now,
              dispatch_status: "Draft",
              supplier_details: movedRows,
              stage_history: [{ stage: "Moved from Postprocess After Payment Approval", date: now }],
            });
          }

          localStorage.setItem("dispatchData", JSON.stringify(allDispatch));
        }
      }
    }

    loadData();
    alert(target.source_stage === "postprocess" ? "Payment updated and components moved to Dispatch stage." : "Payment updated successfully.");
  };

  const pendingCount = requests.filter((req) => req.status === "Pending").length;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Payment Requests (Admin)</h1>
          <p className="text-gray-600 mt-1">Verify selected components with invoice and update payment status.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-2xl font-bold text-green-700">{requests.filter((req) => req.status === "Paid").length}</p>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500">No payment requests found.</div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white border rounded-lg shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                  className="w-full text-left px-4 py-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{request.company_name}</p>
                      <p className="text-xs text-gray-500 capitalize">Stage: {request.source_stage}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{request.requested_by || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{format(new Date(request.requested_date), "dd/MM/yyyy hh:mm a")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{request.invoice_name || "-"}</p>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          request.status === "Paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="text-right text-sm text-blue-700 font-semibold">{expandedId === request.id ? "Hide Details" : "View Details"}</div>
                  </div>
                </button>

                {expandedId === request.id && (
                  <div className="border-t px-4 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-3">
                      <button
                        type="button"
                        onClick={() => openInvoice(request.invoice_file_key, request.invoice_url)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        View Invoice
                      </button>
                      {request.status === "Pending" ? (
                        <button
                          type="button"
                          onClick={() => markAsPaid(request.id)}
                          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Verify & Mark Payment Done
                        </button>
                      ) : (
                        <p className="text-xs text-green-700 font-semibold">
                          Paid by {request.paid_by || "Admin"} on {request.paid_date ? format(new Date(request.paid_date), "dd/MM/yyyy hh:mm a") : "-"}
                        </p>
                      )}
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="p-2 text-left">S.No</th>
                            <th className="p-2 text-left">Type</th>
                            <th className="p-2 text-left">Manufacturer - Part Number</th>
                            <th className="p-2 text-left">Vendor</th>
                            <th className="p-2 text-right">Req Qty</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(request.components || []).map((row, idx) => (
                            <tr key={idx} className={`border-t ${request.status === "Paid" ? "bg-green-50" : "bg-yellow-50"}`}>
                              <td className="p-2">{row.s_no}</td>
                              <td className="p-2">{row.component_type || "-"}</td>
                              <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                              <td className="p-2">{row.vendor_details || "-"}</td>
                              <td className="p-2 text-right">{row.req_quantity || 0}</td>
                              <td className="p-2 text-right">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
