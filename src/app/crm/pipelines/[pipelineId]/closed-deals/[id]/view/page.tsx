"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";

// Define the type directly in the file to resolve the import error
export type ClosedDeal = {
  id: string;
  date: string;
  department: string;
  company_name: string;
  contact: string;
  state: string;
  deadline: string;
  description: string;
  fileName: string;
  source: string;
  customer_notes: string;
  subdeal: string;
  reason: string;
  order_value: number;
  advance_payment: number;
  expense: number;
  profit: number;
  balance_due: number;
};

export default function ViewClosedDealPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<ClosedDeal | null>(null);

  useEffect(() => {
    if (id) {
      const storedData = localStorage.getItem("closedDealsData") || "[]";
      const data: ClosedDeal[] = JSON.parse(storedData);
      const itemToView = data.find((i) => i.id === id);
      if (itemToView) setItem(itemToView);
    }
  }, [id]);

  if (!item) return <div className="p-8">Deal not found or loading...</div>;

  const formatCurrency = (value: number) => {
    return (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl p-8 mx-auto bg-white rounded-lg shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-green-700">Closed Deal Details</h1>
        
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Deal Information</h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <DetailItem label="Date" value={format(new Date(item.date), "dd/MM/yyyy")} />
                <DetailItem label="Deadline" value={format(new Date(item.deadline), "dd/MM/yyyy")} />
                <DetailItem label="Company Name" value={item.company_name} />
                <DetailItem label="Subdeal (Team Member)" value={item.subdeal} />
                <DetailItem label="Contact" value={item.contact} />
                <DetailItem label="State" value={item.state} />
            </div>
        </div>

        <div className="mb-6">
             <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Financial Summary</h2>
             <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <DetailItem label="Order Value" value={formatCurrency(item.order_value)} />
                <DetailItem label="Advance Payment" value={formatCurrency(item.advance_payment)} />
                <DetailItem label="Expense" value={formatCurrency(item.expense)} />
                <DetailItem label="Balance Due" value={formatCurrency(item.balance_due)} />
                <div className="md:col-span-2 p-3 bg-green-50 rounded-lg">
                    <DetailItem label="Calculated Profit" value={formatCurrency(item.profit)} />
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Additional Details</h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4">
                <DetailItem label="Reason for Closing" value={item.reason || "-"} />
                <DetailItem label="Customer Notes" value={item.customer_notes || "-"} />
                <DetailItem label="File Name" value={item.fileName || "-"} />
            </div>
        </div>
        
        <div className="flex justify-end mt-8">
          <button onClick={() => router.push('/crm/pipelines/closed-deals')} className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Back to List</button>
        </div>
      </div>
    </div>
  );
}

const DetailItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <h3 className="text-sm font-medium text-gray-500">{label}</h3>
        <p className="mt-1 text-lg text-gray-900">{value}</p>
    </div>
);
