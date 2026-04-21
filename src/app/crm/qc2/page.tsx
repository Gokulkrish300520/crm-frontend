"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SupplierDetail = {
  s_no: number;
  component_type: "Active" | "Passive";
  manufacturer_part_number: string;
  vendor_details: string;
  currency: string;
  req_quantity: number;
  excise_quantity: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  test_report_upload?: string;
  test_report_upload_url?: string;
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
  qc2_file?: string;
  qc2_file_url?: string;
};

type PostProcessItem = {
  id: string;
  company_name: string;
  department: string;
  project_handled_by: string;
  supplier_details?: SupplierDetail[];
  qc2_status?: "Not Sent" | "Pending QC2" | "QC2 Rework Required" | "QC2 Approved";
  qc2_submitted_date?: string;
  qc2_submitted_by?: string;
  qc2_reviewed_date?: string;
  qc2_reviewed_by?: string;
  qc2_review_summary?: string;
  stage_history?: Array<{ stage: string; date: string }>;
};

export default function Qc2DashboardPage() {
  const [items, setItems] = useState<PostProcessItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = () => {
    const postprocessData: PostProcessItem[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
    const queue = postprocessData.filter((item) =>
      (item.supplier_details || []).some((row) => row.qc2_status === "Pending QC2" || row.qc2_status === "QC2 Rework Required")
    );
    setItems(queue);
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = useMemo(
    () => items.filter((item) => (item.supplier_details || []).some((r) => r.qc2_status === "Pending QC2")).length,
    [items]
  );

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
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleRowStatusChange = (itemId: string, rowIndex: number, status: "Pending QC2" | "Approved" | "Rejected") => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const supplier_details = (item.supplier_details || []).map((row, idx) =>
          idx === rowIndex ? { ...row, qc2_status: status } : row
        );
        return { ...item, supplier_details };
      })
    );
  };

  const handleRowRemarkChange = (itemId: string, rowIndex: number, remark: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const supplier_details = (item.supplier_details || []).map((row, idx) =>
          idx === rowIndex ? { ...row, qc2_remark: remark } : row
        );
        return { ...item, supplier_details };
      })
    );
  };

  const handleRowFileChange = (itemId: string, rowIndex: number, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";

      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const supplier_details = (item.supplier_details || []).map((row, idx) =>
            idx === rowIndex
              ? { ...row, qc2_file: file.name, qc2_file_url: dataUrl }
              : row
          );
          return { ...item, supplier_details };
        })
      );
    };
    reader.readAsDataURL(file);
  };

  const submitQc2Review = (itemId: string) => {
    const allData: PostProcessItem[] = JSON.parse(localStorage.getItem("postprocessData") || "[]");
    const reviewItem = items.find((item) => item.id === itemId);
    if (!reviewItem) return;

    const updated = allData.map((item) => {
      if (item.id !== itemId) return item;

      const now = new Date().toISOString();
      const rows = (reviewItem.supplier_details || []).map((row) => ({
        ...row,
        qc2_status: row.qc2_status || "Pending QC2",
        qc2_remark: row.qc2_remark || "",
        qc2_file: row.qc2_file || "",
        qc2_file_url: row.qc2_file_url || "",
        qc2_reviewed_date: row.qc2_status === "Approved" || row.qc2_status === "Rejected" ? now : row.qc2_reviewed_date,
        qc2_reviewed_by: row.qc2_status === "Approved" || row.qc2_status === "Rejected" ? "QC2" : row.qc2_reviewed_by,
      }));

      const reviewedRows = rows.filter((r) => r.qc2_status === "Approved" || r.qc2_status === "Rejected");
      const rejectedCount = reviewedRows.filter((r) => r.qc2_status === "Rejected").length;
      const approvedCount = reviewedRows.filter((r) => r.qc2_status === "Approved").length;

      const itemStatus = rejectedCount > 0 ? "QC2 Rework Required" : "QC2 Approved";
      const summary = rejectedCount > 0
        ? `QC2 review complete: ${approvedCount} approved, ${rejectedCount} rejected.`
        : `QC2 review complete: all ${approvedCount} reviewed supplier items approved.`;

      return {
        ...item,
        supplier_details: rows,
        qc2_status: itemStatus,
        qc2_reviewed_date: now,
        qc2_reviewed_by: "QC2",
        qc2_review_summary: summary,
        stage_history: [
          ...(item.stage_history || []),
          { stage: itemStatus, date: now },
        ],
      };
    });

    localStorage.setItem("postprocessData", JSON.stringify(updated));
    loadData();
    alert("QC2 review submitted successfully.");
  };

  const toggleQc2Status = (itemId: string, rowIndex: number, status: "Approved" | "Pending QC2") => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const supplier_details = (item.supplier_details || []).map((row, idx) => {
          if (idx !== rowIndex) return row;
          const nextStatus: "Approved" | "Pending QC2" = status;
          return {
            ...row,
            qc2_status: nextStatus,
          };
        });
        return { ...item, supplier_details };
      })
    );
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-700">QC2 Dashboard</h1>
          <p className="text-gray-600 mt-1">Review selected post process supplier items and submit QC2 decision.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Items In QC2 Queue</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Pending QC2</p>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Last Refresh</p>
            <p className="text-sm font-semibold text-gray-900">{format(new Date(), "dd/MM/yyyy hh:mm a")}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500">No items pending QC2 review.</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const requestedAt = item.qc2_submitted_date ? format(new Date(item.qc2_submitted_date), "dd/MM/yyyy hh:mm a") : "-";
              const requestedBy = item.qc2_submitted_by || item.project_handled_by || "-";
              const reviewRows = (item.supplier_details || [])
                .map((row, originalIndex) => ({ row, originalIndex }))
                .filter(
                  ({ row }) => row.qc2_status === "Pending QC2" || row.qc2_status === "QC2 Rework Required" || row.qc2_status === "Approved" || row.qc2_status === "Rejected"
                );

              return (
                <div key={item.id} className="bg-white border rounded-lg shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full text-left px-4 py-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start md:items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">New QC2 Request</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">{requestedBy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800">{requestedAt}</p>
                      </div>
                      <div>
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">{item.qc2_status || "Pending QC2"}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-teal-700 font-semibold text-sm">
                        {expandedId === item.id ? "Hide Details" : "View Details"}
                        {expandedId === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </button>

                  {expandedId === item.id && (
                    <div className="border-t px-4 pb-4">
                      <div className="mt-4 mb-3">
                        <h2 className="text-lg font-semibold text-gray-900">{item.company_name}</h2>
                        <p className="text-sm text-gray-600">Department: {item.department}</p>
                      </div>

                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full min-w-[1400px] text-sm">
                          <thead className="bg-gray-100 text-gray-700">
                            <tr>
                              <th className="p-2 text-left">S.No</th>
                              <th className="p-2 text-left">Type</th>
                              <th className="p-2 text-left">Manufacturer - Part Number</th>
                              <th className="p-2 text-left">Vendor</th>
                              <th className="p-2 text-right">Req Qty</th>
                              <th className="p-2 text-right">Total</th>
                              <th className="p-2 text-left">QC2 Image</th>
                              <th className="p-2 text-left">QC2 Status</th>
                              <th className="p-2 text-left">QC2 Remark</th>
                              <th className="p-2 text-left">Upload</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewRows.map(({ row, originalIndex }) => (
                              <tr key={originalIndex} className="border-t align-top">
                                <td className="p-2">{row.s_no}</td>
                                <td className="p-2">{row.component_type}</td>
                                <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                                <td className="p-2">{row.vendor_details || "-"}</td>
                                <td className="p-2 text-right">{row.req_quantity}</td>
                                <td className="p-2 text-right">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                                <td className="p-2">
                                  {row.qc2_image_upload ? (
                                    <div>
                                      <p>{row.qc2_image_upload}</p>
                                      {row.qc2_image_upload_url && (
                                        <button type="button" onClick={() => openFile(row.qc2_image_upload_url)} className="text-xs text-blue-600 hover:underline mt-1">View Image</button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-red-500 font-semibold">Missing</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  <select
                                    value={row.qc2_status === "Approved" || row.qc2_status === "Rejected" ? row.qc2_status : "Pending QC2"}
                                    onChange={(e) => handleRowStatusChange(item.id, originalIndex, e.target.value as "Pending QC2" | "Approved" | "Rejected")}
                                    className="w-full p-2 border rounded bg-white"
                                  >
                                    <option value="Pending QC2">Pending QC2</option>
                                    <option value="Approved">Approve</option>
                                    <option value="Rejected">Reject</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <textarea
                                    value={row.qc2_remark || ""}
                                    onChange={(e) => handleRowRemarkChange(item.id, originalIndex, e.target.value)}
                                    rows={2}
                                    className="w-full p-2 border rounded"
                                    placeholder="Remark"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="file"
                                    onChange={(e) => handleRowFileChange(item.id, originalIndex, e.target.files?.[0] || null)}
                                    className="w-full p-1 text-xs border rounded bg-white"
                                  />
                                  {row.qc2_file && (
                                    <div className="mt-1 space-y-1">
                                      <p className="text-xs text-gray-500">{row.qc2_file}</p>
                                      {row.qc2_file_url && (
                                        <button
                                          type="button"
                                          onClick={() => openFile(row.qc2_file_url)}
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          View file
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button onClick={() => submitQc2Review(item.id)} className="px-5 py-2 font-semibold text-white bg-teal-600 rounded hover:bg-teal-700">Submit QC2 Review</button>
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
