"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { CompletedProjectItem } from "../../page";

type EditFormData = {
    company_name: string;
    department: string;
    order_value: string;
    advance_payment: string;
    expense: string;
};

export default function EditCompletedProjectPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [formData, setFormData] = useState<EditFormData | null>(null);
    
    useEffect(() => {
        if (id) {
            const storedData = localStorage.getItem("completedProjectsData") || "[]";
            const data: CompletedProjectItem[] = JSON.parse(storedData);
            const itemToEdit = data.find((item) => item.id === id);
            if (itemToEdit) {
                setFormData({
                    company_name: itemToEdit.company_name,
                    department: itemToEdit.department,
                    order_value: String(itemToEdit.order_value || ''),
                    // Correctly access the amount from the advance_payment object
                    advance_payment: String(itemToEdit.advance_payment?.amount || ''),
                    expense: String(itemToEdit.expense || ''),
                });
            }
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        const storedData = localStorage.getItem("completedProjectsData") || "[]";
        const data: CompletedProjectItem[] = JSON.parse(storedData);
        
        const updatedData = data.map(item => {
            if (item.id === id) {
                const orderValueNum = parseFloat(formData.order_value) || 0;
                const advancePaymentNum = parseFloat(formData.advance_payment) || 0;
                const expenseNum = parseFloat(formData.expense) || 0;
                
                // Recalculate profit
                const profit = orderValueNum - expenseNum;

                return {
                    ...item, // Preserve all original data
                    company_name: formData.company_name,
                    department: formData.department,
                    order_value: orderValueNum,
                    // Preserve the advance_payment object structure
                    advance_payment: {
                        ...item.advance_payment,
                        amount: advancePaymentNum,
                    },
                    expense: expenseNum,
                    profit,
                };
            }
            return item;
        });

        localStorage.setItem("completedProjectsData", JSON.stringify(updatedData));
        router.push("/crm/pipelines/completed-projects");
    };

    if (!formData) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-8 bg-white">
            <h1 className="mb-6 text-2xl font-bold text-green-700">Update Completed Project</h1>
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6 p-6 rounded shadow bg-green-50">
                <div>
                    <label className="block font-medium text-green-800">Company Name</label>
                    <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="w-full p-2 mt-1 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Department</label>
                    <input type="text" name="department" value={formData.department} onChange={handleChange} required className="w-full p-2 mt-1 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Order Value (INR)</label>
                    <input type="number" name="order_value" value={formData.order_value} onChange={handleChange} required className="w-full p-2 mt-1 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Advance Payment (INR)</label>
                    <input type="number" name="advance_payment" value={formData.advance_payment} onChange={handleChange} className="w-full p-2 mt-1 border rounded" />
                </div>
                <div>
                    <label className="block font-medium text-green-800">Expense (INR)</label>
                    <input type="number" name="expense" value={formData.expense} onChange={handleChange} className="w-full p-2 mt-1 border rounded" />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => router.push('/crm/pipelines/completed-projects')} className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Update</button>
                </div>
            </form>
        </div>
    );
}

