"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

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

// Define the shape of the form data, with numbers as strings
type FormData = Omit<ClosedDeal, 'id' | 'date' | 'order_value' | 'advance_payment' | 'expense' | 'profit' | 'balance_due'> & {
    order_value: string;
    advance_payment: string;
    expense: string;
};

export default function EditClosedDealPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [formData, setFormData] = useState<FormData | null>(null);

    // Corrected: Moved 'teamMembers' inside the component to fix the Next.js export error.
    const teamMembers: string[] = [
        "Alice",
        "Bob",
        "Charlie",
        "David",
        "Eve",
    ];
    
    useEffect(() => {
        if (id) {
            const storedData = localStorage.getItem("closedDealsData") || "[]";
            const data: ClosedDeal[] = JSON.parse(storedData);
            const itemToEdit = data.find((item) => item.id === id);
            if (itemToEdit) {
                // Convert numbers to strings for form inputs
                setFormData({
                    ...itemToEdit,
                    order_value: String(itemToEdit.order_value || ''),
                    advance_payment: String(itemToEdit.advance_payment || ''),
                    expense: String(itemToEdit.expense || ''),
                });
            }
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // Use functional updates for state to prevent stale state issues
        setFormData(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;
        const file = e.target.files?.[0];
        setFormData(prev => prev ? { ...prev, fileName: file?.name || "" } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        const orderValueNum = parseFloat(formData.order_value) || 0;
        const advancePaymentNum = parseFloat(formData.advance_payment) || 0;
        const expenseNum = parseFloat(formData.expense) || 0;

        const profit = orderValueNum - expenseNum;
        const balance_due = orderValueNum - advancePaymentNum;

        const storedData = localStorage.getItem("closedDealsData") || "[]";
        const data: ClosedDeal[] = JSON.parse(storedData);
        const updatedData = data.map((item) => {
            if (item.id === id) {
                return {
                    ...item, // Keep original ID and date
                    ...formData,
                    order_value: orderValueNum,
                    advance_payment: advancePaymentNum,
                    expense: expenseNum,
                    profit,
                    balance_due,
                }
            }
            return item;
        });
        localStorage.setItem("closedDealsData", JSON.stringify(updatedData));
        
        router.push("/crm/pipelines/closed-deals");
    };

    if (!formData) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-8 bg-white">
            <h1 className="mb-6 text-2xl font-bold text-green-700">Edit Closed Deal</h1>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 p-6 rounded shadow md:grid-cols-3 bg-green-50">
                <div className="md:col-span-3"> <h2 className="text-lg font-semibold text-green-800 border-b pb-2">Deal Information</h2> </div>
                <div>
                    <label className="block font-medium text-green-800">Company Name <span className="text-red-500">*</span></label>
                    <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Subdeal (Team Member) <span className="text-red-500">*</span></label>
                    <input list="teamMembers" name="subdeal" value={formData.subdeal} onChange={handleChange} required className="w-full p-2 border rounded" />
                    <datalist id="teamMembers">
                        {teamMembers.map(m => <option key={m} value={m} />)}
                    </datalist>
                </div>
                <div>
                    <label className="block font-medium text-green-800">Deadline <span className="text-red-500">*</span></label>
                    <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required className="w-full p-2 border rounded" />
                </div>
                
                <div className="md:col-span-3 mt-4"> <h2 className="text-lg font-semibold text-green-800 border-b pb-2">Financials</h2> </div>
                <div>
                    <label className="block font-medium text-green-800">Order Value (INR) <span className="text-red-500">*</span></label>
                    <input type="number" name="order_value" value={formData.order_value} onChange={handleChange} required className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Advance Payment (INR)</label>
                    <input type="number" name="advance_payment" value={formData.advance_payment} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Expense (INR)</label>
                    <input type="number" name="expense" value={formData.expense} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>

                <div className="md:col-span-3 mt-4"> <h2 className="text-lg font-semibold text-green-800 border-b pb-2">Additional Details</h2> </div>
                 <div className="md:col-span-3">
                    <label className="block font-medium text-green-800">Reason for Closing</label>
                    <textarea name="reason" value={formData.reason} onChange={handleChange} rows={2} className="w-full p-2 border rounded"></textarea>
                </div>
                <div className="md:col-span-3">
                    <label className="block font-medium text-green-800">Customer Notes</label>
                    <textarea name="customer_notes" value={formData.customer_notes} onChange={handleChange} rows={2} className="w-full p-2 border rounded"></textarea>
                </div>
                <div className="md:col-span-3">
                    <label className="block font-medium text-green-800">File Upload</label>
                    <input type="file" onChange={handleFileChange} className="w-full p-2 border rounded bg-white" />
                     {formData.fileName && <p className="text-sm text-gray-500 mt-1">Current file: {formData.fileName}</p>}
                </div>

                <div className="flex justify-end col-span-3 gap-4 mt-4">
                    <button type="button" onClick={() => router.push('/crm/pipelines/closed-deals')} className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Update</button>
                </div>
            </form>
        </div>
    );
}
