"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

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

type PreprocessItem = {
  id: string;
  pipelineId?: string;
  company_name: string;
  department: string;
  project_handled_by: string;
  quotation_upload_reference?: string;
  fileName?: string;
  po_document?: string;
  supplier_details: SupplierDetail[];
  qc_status?: "Not Sent" | "Pending QC1" | "QC1 Rework Required" | "QC1 Approved";
  qc_submitted_date?: string;
  qc_submitted_by?: string;
  qc_reviewed_date?: string;
  qc_reviewed_by?: string;
  qc_review_summary?: string;
  qc_history?: QcHistoryEntry[];
  stage_history?: Array<{ stage: string; date: string }>;
};

export default function Qc1DashboardPage() {
  const [items, setItems] = useState<PreprocessItem[]>([]);

  const loadData = () => {
    const preprocessData = JSON.parse(localStorage.getItem("preprocessData") || "[]");
    const qcQueue = preprocessData.filter(
      (item: PreprocessItem) => item.qc_status === "Pending QC1" || item.qc_status === "QC1 Rework Required"
    );
    setItems(qcQueue);
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = useMemo(
    () => items.filter((item) => item.qc_status === "Pending QC1").length,
    [items]
  );

  const handleRowStatusChange = (itemId: string, rowIndex: number, status: "Pending" | "Approved" | "Rejected") => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const supplier_details = item.supplier_details.map((row, idx) =>
          idx === rowIndex ? { ...row, qc_status: status } : row
        );
        return { ...item, supplier_details };
      })
    );
  };

  const handleRowRemarkChange = (itemId: string, rowIndex: number, remark: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const supplier_details = item.supplier_details.map((row, idx) =>
          idx === rowIndex ? { ...row, qc_remark: remark } : row
        );
        return { ...item, supplier_details };
      })
    );
  };

  const handleRowFileChange = (itemId: string, rowIndex: number, fileName: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const supplier_details = item.supplier_details.map((row, idx) =>
          idx === rowIndex ? { ...row, qc_file: fileName } : row
        );
        return { ...item, supplier_details };
      })
    );
  };

  const handleSubmitQcReview = (itemId: string) => {
    const preprocessData: PreprocessItem[] = JSON.parse(localStorage.getItem("preprocessData") || "[]");
    const reviewItem = items.find((item) => item.id === itemId);
    if (!reviewItem) return;

    const updatedPreprocess = preprocessData.map((item) => {
      if (item.id !== itemId) return item;

      const reviewedAt = new Date().toISOString();

      const withDefaults = reviewItem.supplier_details.map((row) => ({
        ...row,
        qc_status: row.qc_status || "Pending",
        qc_remark: row.qc_remark || "",
        qc_file: row.qc_file || "",
      }));

      const allApproved = withDefaults.length > 0 && withDefaults.every((row) => row.qc_status === "Approved");
      const approvedCount = withDefaults.filter((row) => row.qc_status === "Approved").length;
      const rejectedCount = withDefaults.filter((row) => row.qc_status === "Rejected").length;

      const nextQcStatus = allApproved ? "QC1 Approved" : "QC1 Rework Required";
      const summary = allApproved
        ? "All supplier items approved in QC1. Ready for admin approval."
        : `QC1 review complete: ${approvedCount} approved, ${rejectedCount} rejected. Rework required in Preprocess.`;

      const historyEntry: QcHistoryEntry = {
        reviewed_at: reviewedAt,
        reviewed_by: "QC1",
        result: nextQcStatus,
        summary,
        decisions: withDefaults.map((row) => ({
          s_no: row.s_no,
          status: row.qc_status || "Pending",
          remark: row.qc_remark || "",
          file: row.qc_file || "",
        })),
      };

      return {
        ...item,
        supplier_details: withDefaults,
        qc_status: nextQcStatus,
        qc_reviewed_date: reviewedAt,
        qc_reviewed_by: "QC1",
        qc_review_summary: summary,
        qc_history: [...(item.qc_history || []), historyEntry],
        stage_history: [
          ...(item.stage_history || []),
          {
            stage: allApproved ? "QC1 Approved" : "QC1 Rework Required",
            date: reviewedAt,
          },
        ],
      };
    });

    localStorage.setItem("preprocessData", JSON.stringify(updatedPreprocess));
    loadData();
    alert("QC1 review submitted successfully.");
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-700">QC1 Dashboard</h1>
          <p className="text-gray-600 mt-1">Review supplier items, negotiation files, and submit QC1 decisions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Items In QC Queue</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Pending QC1</p>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Last Refresh</p>
            <p className="text-sm font-semibold text-gray-900">{format(new Date(), "dd/MM/yyyy hh:mm a")}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500">No items pending QC1 review.</div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => {
              const allApproved =
                item.supplier_details.length > 0 &&
                item.supplier_details.every((row) => row.qc_status === "Approved");

              return (
                <div key={item.id} className="bg-white border rounded-lg shadow-sm p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{item.company_name}</h2>
                      <p className="text-sm text-gray-600">Department: {item.department} • Handled By: {item.project_handled_by}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      item.qc_status === "QC1 Rework Required"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {item.qc_status || "Pending QC1"}
                    </span>
                  </div>

                  <div className="p-4 mb-4 rounded-lg border bg-blue-50">
                    <h3 className="font-semibold text-blue-900 mb-2">Negotiation Files</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <p><span className="font-medium text-blue-800">Quotation Upload Reference:</span> {item.quotation_upload_reference || item.fileName || "Not uploaded"}</p>
                      <p><span className="font-medium text-blue-800">Email Confirmation / PO:</span> {item.po_document || "Not uploaded"}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full min-w-[1200px] text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="p-2 text-left">S.No</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-left">Manufacturer - Part Number</th>
                          <th className="p-2 text-left">Vendor</th>
                          <th className="p-2 text-right">Req Qty</th>
                          <th className="p-2 text-right">Excise Qty</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Remark</th>
                          <th className="p-2 text-left">Upload</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.supplier_details.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t align-top">
                            <td className="p-2">{row.s_no}</td>
                            <td className="p-2">{row.component_type}</td>
                            <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                            <td className="p-2">{row.vendor_details || "-"}</td>
                            <td className="p-2 text-right">{row.req_quantity}</td>
                            <td className="p-2 text-right">{row.excise_quantity}</td>
                            <td className="p-2 text-right">{(row.total_price || 0).toLocaleString("en-IN")}</td>
                            <td className="p-2">
                              <select
                                value={row.qc_status || "Pending"}
                                onChange={(e) =>
                                  handleRowStatusChange(item.id, rowIndex, e.target.value as "Pending" | "Approved" | "Rejected")
                                }
                                className="w-full p-2 border rounded bg-white"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approve</option>
                                <option value="Rejected">Reject</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <textarea
                                value={row.qc_remark || ""}
                                onChange={(e) => handleRowRemarkChange(item.id, rowIndex, e.target.value)}
                                rows={2}
                                placeholder="Remark"
                                className="w-full p-2 border rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="file"
                                onChange={(e) => handleRowFileChange(item.id, rowIndex, e.target.files?.[0]?.name || "")}
                                className="w-full p-1 text-xs border rounded bg-white"
                              />
                              {row.qc_file && <p className="text-xs text-gray-500 mt-1">{row.qc_file}</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-600">
                      {allApproved
                        ? "All supplier rows approved. User can now send for admin approval."
                        : "If any row is rejected, item returns to preprocess with row-level QC remarks/files."}
                    </p>
                    <button
                      onClick={() => handleSubmitQcReview(item.id)}
                      className="px-5 py-2 font-semibold text-white bg-teal-600 rounded hover:bg-teal-700"
                    >
                      Submit QC1 Review
                    </button>
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
