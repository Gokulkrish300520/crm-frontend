"use client";

import { setIndexedDbItem } from "@/utils/indexedDbStorage";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type SupplierDetail = {
  s_no: number;
  component_type: "Active" | "Passive";
  manufacturer_part_number: string;
  vendor_details: string;
  req_quantity: number;
  total_price?: number;
  payment_request_status?: "Not Requested" | "Pending Approval" | "Paid";
  payment_request_id?: string;
};

type DeliveryItem = {
  id: string;
  pipelineId: string;
  company_name: string;
  project_handled_by?: string;
  supplier_details?: SupplierDetail[];
  status?: string;
  stage_history?: Array<{ stage: string; date: string }>;
};

export default function DeliveryStagePage() {
  const params = useParams();
  const pipelineId = params.pipelineId as string;
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [selectedRowsByItem, setSelectedRowsByItem] = useState<Record<string, number[]>>({});
  const [invoiceDraftByItem, setInvoiceDraftByItem] = useState<Record<string, { name: string; dataUrl: string }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = () => {
    const all: DeliveryItem[] = JSON.parse(localStorage.getItem("deliveryData") || "[]");
    const updated = all.map((item) => {
      const rows = item.supplier_details || [];
      if (rows.length > 0 && item.status !== "Completed") {
        return {
          ...item,
          status: "Completed",
          stage_history: [
            ...(item.stage_history || []),
            { stage: "All Components Reached Delivery", date: new Date().toISOString() },
          ],
        };
      }
      return item;
    });

    if (JSON.stringify(updated) !== JSON.stringify(all)) {
      localStorage.setItem("deliveryData", JSON.stringify(updated));
    }

    setItems(updated.filter((item) => String(item.pipelineId) === String(pipelineId)));
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

  const sendPaymentRequest = async (item: DeliveryItem) => {
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
    const fileKey = `payment_invoice_delivery_${item.id}_${Date.now()}`;
    await setIndexedDbItem(fileKey, invoice.dataUrl);

    const selectedDetails = (item.supplier_details || []).filter((row) => selectedRows.includes(row.s_no));
    const currentUser = localStorage.getItem("currentUser") || item.project_handled_by || "Employee";

    const allRequests = JSON.parse(localStorage.getItem("paymentRequests") || "[]");
    allRequests.push({
      id: requestId,
      pipelineId,
      source_stage: "delivery",
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

    const allDelivery: DeliveryItem[] = JSON.parse(localStorage.getItem("deliveryData") || "[]");
    const updatedDelivery = allDelivery.map((entry) => {
      if (entry.id !== item.id) return entry;
      return {
        ...entry,
        supplier_details: (entry.supplier_details || []).map((row) =>
          selectedRows.includes(row.s_no)
            ? {
                ...row,
                payment_request_status: "Pending Approval",
                payment_request_id: requestId,
              }
            : row
        ),
        stage_history: [...(entry.stage_history || []), { stage: "Payment Requested", date: now }],
      };
    });

    localStorage.setItem("deliveryData", JSON.stringify(updatedDelivery));
    loadData();
    setSelectedRowsByItem((prev) => ({ ...prev, [item.id]: [] }));
    setInvoiceDraftByItem((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    alert("Payment request sent to admin.");
  };

  const deleteSelectedComponents = (item: DeliveryItem) => {
    const selectedRows = selectedRowsByItem[item.id] || [];
    if (selectedRows.length === 0) {
      alert("Please select at least one component to delete.");
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedRows.length} selected component(s) from Delivery?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const allDelivery: DeliveryItem[] = JSON.parse(localStorage.getItem("deliveryData") || "[]");

    const updatedDelivery = allDelivery
      .map((entry) => {
        if (entry.id !== item.id) return entry;

        const remainingRows = (entry.supplier_details || [])
          .filter((row) => !selectedRows.includes(row.s_no))
          .map((row, index) => ({ ...row, s_no: index + 1 }));

        return {
          ...entry,
          supplier_details: remainingRows,
          stage_history: [
            ...(entry.stage_history || []),
            { stage: `Deleted ${selectedRows.length} component(s) in Delivery`, date: now },
          ],
        };
      })
      .filter((entry) => (entry.supplier_details || []).length > 0);

    localStorage.setItem("deliveryData", JSON.stringify(updatedDelivery));
    setSelectedRowsByItem((prev) => ({ ...prev, [item.id]: [] }));
    loadData();
    alert("Selected delivery component(s) deleted.");
  };

  return (
    <div className="min-h-screen p-6 bg-white">
      <h1 className="text-2xl font-bold text-green-700 mb-4">Delivery Stage</h1>
      {items.length === 0 ? (
        <div className="border rounded p-6 text-center text-gray-500">No items in Delivery stage yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-2 text-left"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.company_name}</p>
                  <p className="text-xs text-gray-600">Handled By: {item.project_handled_by || "-"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{item.status || "Pending"}</span>
                  <span className="text-xs text-blue-700 font-semibold">{expandedId === item.id ? "Hide" : "View"}</span>
                </div>
              </button>

              {expandedId === item.id && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2 text-left">Select</th>
                        <th className="p-2 text-left">S.No</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Manufacturer - Part Number</th>
                        <th className="p-2 text-left">Vendor</th>
                        <th className="p-2 text-right">Req Qty</th>
                        <th className="p-2 text-right">Total</th>
                        <th className="p-2 text-left">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.supplier_details || []).map((row, idx) => (
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
                          <td className="p-2">{row.component_type}</td>
                          <td className="p-2">{row.manufacturer_part_number || "-"}</td>
                          <td className="p-2">{row.vendor_details || "-"}</td>
                          <td className="p-2 text-right">{row.req_quantity || 0}</td>
                          <td className="p-2 text-right">{(row.total_price || 0).toLocaleString("en-IN")}</td>
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
                    <button
                      type="button"
                      onClick={() => deleteSelectedComponents(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      Delete Selected Components
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
