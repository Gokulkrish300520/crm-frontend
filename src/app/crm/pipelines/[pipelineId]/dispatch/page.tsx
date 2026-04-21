"use client";

import { getIndexedDbItem, setIndexedDbItem } from "@/utils/indexedDbStorage";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DispatchSupplierDetail = {
  s_no: number;
  component_type: "Active" | "Passive";
  manufacturer_part_number: string;
  vendor_details: string;
  currency: string;
  req_quantity: number;
  excise_quantity: number;
  total_price: number;
  test_report_upload?: string;
  test_report_upload_url?: string;
  test_report_upload_file_key?: string;
  qc2_image_upload?: string;
  qc2_image_upload_url?: string;
  qc2_image_upload_file_key?: string;
  qc2_file?: string;
  qc2_file_url?: string;
  qc2_file_key?: string;
  qc2_status?: "Not Sent" | "Pending QC2" | "QC2 Rework Required" | "Approved" | "Rejected";
  qc2_remark?: string;
  total_weight_display?: string;
  excess_duty_display?: string;
  payment_request_status?: "Not Requested" | "Pending Approval" | "Paid";
  payment_request_id?: string;
};

type DispatchItem = {
  id: string;
  source_postprocess_id: string;
  pipelineId: string;
  company_name: string;
  department: string;
  project_handled_by: string;
  created_date: string;
  dispatch_status: "Draft" | "Pending Admin Approval" | "Approved" | "Returned to Post Process";
  dispatch_submitted_by?: string;
  dispatch_submitted_date?: string;
  dispatch_approved_by?: string;
  dispatch_approved_date?: string;
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

export default function DispatchStagePage() {
  const params = useParams();
  const pipelineId = params.pipelineId as string;
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [selectedRowsByItem, setSelectedRowsByItem] = useState<Record<string, number[]>>({});
  const [invoiceDraftByItem, setInvoiceDraftByItem] = useState<Record<string, { name: string; dataUrl: string }>>({});

  const loadData = () => {
    const allDispatch: DispatchItem[] = JSON.parse(localStorage.getItem("dispatchData") || "[]");
    // Once admin approves dispatch, rows are handled in Final QC and should not stay visible here.
    const filtered = allDispatch.filter(
      (item) => String(item.pipelineId) === String(pipelineId) && item.dispatch_status !== "Approved"
    );
    setItems(filtered);
  };

  useEffect(() => {
    loadData();
  }, [pipelineId]);

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

  const sendPaymentRequest = async (item: DispatchItem) => {
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
    const fileKey = `payment_invoice_dispatch_${item.id}_${Date.now()}`;
    await setIndexedDbItem(fileKey, invoice.dataUrl);

    const selectedDetails = (item.supplier_details || []).filter((row) => selectedRows.includes(row.s_no));
    const currentUser = localStorage.getItem("currentUser") || item.project_handled_by || "Employee";

    const allRequests = JSON.parse(localStorage.getItem("paymentRequests") || "[]");
    allRequests.push({
      id: requestId,
      pipelineId,
      source_stage: "dispatch",
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

    const allDispatch: DispatchItem[] = JSON.parse(localStorage.getItem("dispatchData") || "[]");
    const updatedDispatch = allDispatch.map((entry) => {
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

    localStorage.setItem("dispatchData", JSON.stringify(updatedDispatch));
    setItems(updatedDispatch.filter((entry) => String(entry.pipelineId) === String(pipelineId)));
    setSelectedRowsByItem((prev) => ({ ...prev, [item.id]: [] }));
    setInvoiceDraftByItem((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    alert("Payment request sent to admin.");
  };

  const openFile = async (fileKey?: string, fileUrl?: string) => {
    const resolvedFileUrl = fileKey
      ? ((await getIndexedDbItem<string>(fileKey)) ?? fileUrl)
      : fileUrl;

    if (!resolvedFileUrl) return;
    if (!resolvedFileUrl.startsWith("data:")) {
      window.open(resolvedFileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const [meta, base64] = resolvedFileUrl.split(",");
      if (!meta || !base64) {
        window.open(resolvedFileUrl, "_blank", "noopener,noreferrer");
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
      window.open(resolvedFileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const sendForAdminApproval = (dispatchId: string) => {
    const currentUser = localStorage.getItem("currentUser") || "Current User";
    const now = new Date().toISOString();

    const allDispatch: DispatchItem[] = JSON.parse(localStorage.getItem("dispatchData") || "[]");
    const updatedDispatch = allDispatch.map((item) =>
      item.id === dispatchId
        ? {
            ...item,
            dispatch_status: "Pending Admin Approval" as const,
            dispatch_submitted_by: currentUser,
            dispatch_submitted_date: now,
            stage_history: [
              ...(item.stage_history || []),
              { stage: "Dispatch sent for Admin Approval", date: now },
            ],
          }
        : item
    );
    localStorage.setItem("dispatchData", JSON.stringify(updatedDispatch));

    const requests: DispatchApprovalRequest[] = JSON.parse(localStorage.getItem("dispatchApprovalRequests") || "[]");
    const existing = requests.find((req) => req.dispatchId === dispatchId && req.status === "Pending");
    if (!existing) {
      const source = updatedDispatch.find((item) => item.id === dispatchId);
      requests.push({
        id: crypto.randomUUID(),
        dispatchId,
        pipelineId,
        company_name: source?.company_name || "Unknown",
        status: "Pending",
        requested_by: currentUser,
        requested_date: now,
      });
      localStorage.setItem("dispatchApprovalRequests", JSON.stringify(requests));
    }

    loadData();
    alert("Dispatch record sent for admin approval.");
  };

  const pendingCount = useMemo(() => items.filter((item) => item.dispatch_status === "Pending Admin Approval").length, [items]);

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-green-700">Dispatch Stage</h1>
        <button type="button" onClick={loadData} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">Refresh</button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-50 border rounded p-3">
          <p className="text-xs text-gray-500">Total Dispatch Items</p>
          <p className="text-xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-gray-50 border rounded p-3">
          <p className="text-xs text-gray-500">Pending Admin Approval</p>
          <p className="text-xl font-bold text-yellow-700">{pendingCount}</p>
        </div>
        <div className="bg-gray-50 border rounded p-3">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="text-xl font-bold text-green-700">{items.filter((item) => item.dispatch_status === "Approved").length}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border rounded p-6 text-center text-gray-500">No items in Dispatch stage.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{item.company_name}</p>
                  <p className="text-xs text-gray-600">Department: {item.department} • Handled By: {item.project_handled_by}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.dispatch_status === "Approved"
                      ? "bg-green-100 text-green-800"
                      : item.dispatch_status === "Returned to Post Process"
                      ? "bg-red-100 text-red-800"
                      : item.dispatch_status === "Pending Admin Approval"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {item.dispatch_status}
                  </span>
                  {item.dispatch_status === "Draft" && (
                    <button
                      type="button"
                      onClick={() => sendForAdminApproval(item.id)}
                      className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700"
                    >
                      Send For Admin Approval
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px] text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-2 text-left">Select</th>
                      <th className="p-2 text-left">S.No</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Manufacturer - Part Number</th>
                      <th className="p-2 text-left">Vendor</th>
                      <th className="p-2 text-right">Req Qty</th>
                      <th className="p-2 text-left">Employee File</th>
                      <th className="p-2 text-left">QC2 Image</th>
                      <th className="p-2 text-left">QC2 File</th>
                      <th className="p-2 text-left">QC2 Status</th>
                      <th className="p-2 text-left">QC2 Remark</th>
                      <th className="p-2 text-left">Total Weight</th>
                      <th className="p-2 text-left">Excess Duty</th>
                      <th className="p-2 text-left">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.supplier_details.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-t align-top ${
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
                        <td className="p-2">{row.component_type}</td>
                        <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                        <td className="p-2">{row.vendor_details || "-"}</td>
                        <td className="p-2 text-right">{row.req_quantity || 0}</td>
                        <td className="p-2">
                          {row.test_report_upload ? (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-700">{row.test_report_upload}</p>
                              {(row.test_report_upload_file_key || row.test_report_upload_url) && (
                                <button
                                  type="button"
                                  onClick={() => openFile(row.test_report_upload_file_key, row.test_report_upload_url)}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View file
                                </button>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="p-2">
                          {row.qc2_image_upload ? (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-700">{row.qc2_image_upload}</p>
                              {(row.qc2_image_upload_file_key || row.qc2_image_upload_url) && (
                                <button
                                  type="button"
                                  onClick={() => openFile(row.qc2_image_upload_file_key, row.qc2_image_upload_url)}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View image
                                </button>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="p-2">
                          {row.qc2_file ? (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-700">{row.qc2_file}</p>
                              {(row.qc2_file_key || row.qc2_file_url) && (
                                <button
                                  type="button"
                                  onClick={() => openFile(row.qc2_file_key, row.qc2_file_url)}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View file
                                </button>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="p-2">{row.qc2_status || "Not Sent"}</td>
                        <td className="p-2">{row.qc2_remark || "-"}</td>
                        <td className="p-2">{row.total_weight_display || "-"}</td>
                        <td className="p-2">{row.excess_duty_display || "-"}</td>
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

              <div className="px-4 py-3 border-t bg-gray-50 flex flex-wrap items-center gap-3">
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

              <div className="px-4 py-3 border-t text-xs text-gray-600 bg-gray-50">
                Created: {item.created_date ? format(new Date(item.created_date), "dd/MM/yyyy") : "-"}
                {item.dispatch_submitted_date ? ` • Sent for approval: ${format(new Date(item.dispatch_submitted_date), "dd/MM/yyyy hh:mm a")}` : ""}
                {item.dispatch_approved_date ? ` • Approved: ${format(new Date(item.dispatch_approved_date), "dd/MM/yyyy hh:mm a")}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
