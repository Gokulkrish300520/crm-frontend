"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";

// --- UPDATED TYPE DEFINITIONS ---
export type StageHistory = {
    stage: string;
    date: string;
};

export type WorkingTimelineItem = { s_no: number; description: string; deadline: string; status: "Completed" | "Over Due"; approved: "Yes" | "Rework"; assigned_to?: string; };
export type ProjectTimelineItem = { s_no: number; description: string; deadline: string; status: "Completed" | "Over Due"; final_fileName?: string; };

export type PostProcessItem = {
    id: string; date: string; department: string; company_name: string; contact: string; state: string; deadline: string; description: string; fileName?: string; source: string; customer_notes: string; order_value: number; advance_payment: { amount: number; bank_details: string; date: string; }; expense: number; profit: number; balance_due: number; subdeal_department?: string; project_handled_by: string; working_timeline: WorkingTimelineItem[]; project_timeline: ProjectTimelineItem[]; expense_bill_format: string; post_process_status: "Pending" | "Completed";
    stage_history?: StageHistory[];
};

export type PaymentPendingItem = Omit<PostProcessItem, 'post_process_status'> & {
    payment_status: 'Pending';
    stage_history?: StageHistory[];
};

export type CompletedProjectItem = Omit<PaymentPendingItem, 'payment_status'> & {
    completion_date: string;
    final_status: 'Paid';
    stage_history?: StageHistory[];
};


export default function PaymentPendingListPage() {
    const router = useRouter();
    const params = useParams();
    const pipelineId = params?.pipelineId as string;
    const [items, setItems] = useState<PaymentPendingItem[]>([]);
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        item: null as PaymentPendingItem | null,
        // Corrected: Added 'none' to the type definition
        mode: 'none' as 'delete' | 'mark_as_paid' | 'none'
    });

    useEffect(() => {
        const storedData = localStorage.getItem("paymentPendingData");
        if (storedData) {
            // Corrected: Replaced 'any' with a more specific partial type for safety
            const sanitizedData = JSON.parse(storedData).map((item: Partial<PaymentPendingItem>) => ({
                ...item,
                stage_history: Array.isArray(item.stage_history) ? item.stage_history : [],
            } as PaymentPendingItem)); // Asserting the final shape after sanitization
            setItems(sanitizedData);
        }
    }, []);

    const updateLocalStorage = (updatedItems: PaymentPendingItem[]) => {
        localStorage.setItem("paymentPendingData", JSON.stringify(updatedItems));
    };

    const closeDialog = () => setDialogState({ isOpen: false, item: null, mode: 'none' });

    const openDeleteDialog = (item: PaymentPendingItem) => {
        setDialogState({ isOpen: true, item, mode: 'delete' });
    };

    const openMarkAsPaidDialog = (item: PaymentPendingItem) => {
        setDialogState({ isOpen: true, item, mode: 'mark_as_paid' });
    };

    const handleConfirmDelete = () => {
        if (!dialogState.item) return;
        const updatedItems = items.filter((item) => item.id !== dialogState.item!.id);
        setItems(updatedItems);
        updateLocalStorage(updatedItems);
        closeDialog();
    };

    const handleConfirmPaid = () => {
        const itemToComplete = dialogState.item;
        if (!itemToComplete) return;

        const newCompletedItem: CompletedProjectItem = {
            ...itemToComplete,
            completion_date: new Date().toISOString(),
            final_status: 'Paid',
            stage_history: [
                ...(itemToComplete.stage_history || []),
                { stage: 'Completed & Paid', date: new Date().toISOString() }
            ],
        };

        const completedData = JSON.parse(localStorage.getItem("completedProjectsData") || "[]");
        localStorage.setItem("completedProjectsData", JSON.stringify([...completedData, newCompletedItem]));

        const updatedItems = items.filter(i => i.id !== itemToComplete.id);
        setItems(updatedItems);
        updateLocalStorage(updatedItems);
        closeDialog();
    };

    const formatCurrency = (value: number) => (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    return (
        <div className="min-h-screen p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-green-700">Payment Pending</h1>
            </div>

            <div className="overflow-x-auto border rounded shadow">
                <table className="w-full border-collapse">
                    <thead className="text-green-800 bg-green-100">
                        <tr>
                            {["Date", "Company", "Department", "Handled By", "Order Value", "Balance Due", "Status", "Actions"].map((h) => (
                                <th key={h} className="p-2 text-left border">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-green-50">
                                    <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                                    <td className="p-2 border">{item.company_name}</td>
                                    <td className="p-2 border">{item.department}</td>
                                    <td className="p-2 border">{item.project_handled_by}</td>
                                    <td className="p-2 border">{formatCurrency(item.order_value)}</td>
                                    <td className="p-2 border font-semibold text-red-600">{formatCurrency(item.balance_due)}</td>
                                    <td className="p-2 border">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            {item.payment_status}
                                        </span>
                                    </td>
                                    <td className="p-2 border">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button onClick={() => openMarkAsPaidDialog(item)} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Mark as Paid</button>
                                            {/* Corrected: Using router.push for efficient client-side navigation */}
                                            <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/payment-pending/${item.id}/view`)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">View</button>
                                            <button onClick={() => openDeleteDialog(item)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} className="p-4 text-center text-gray-500">No projects are pending payment.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {dialogState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800">{dialogState.mode === 'delete' ? 'Confirm Deletion' : 'Confirm Payment Received'}</h2>
                        <p className="mt-3 text-gray-600">{dialogState.mode === 'delete' ? `Are you sure you want to delete the project for "${dialogState.item?.company_name}"?` : `This will mark the project for "${dialogState.item?.company_name}" as paid and move it to a completed archive. Proceed?`}</p>
                        <div className="flex justify-end mt-6 space-x-4">
                            <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                            {dialogState.mode === 'delete' && <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>}
                            {dialogState.mode === 'mark_as_paid' && <button onClick={handleConfirmPaid} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Confirm</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

