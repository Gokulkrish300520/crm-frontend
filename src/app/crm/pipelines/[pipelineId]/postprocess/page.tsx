"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format, isPast } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// --- UPDATED TYPE DEFINITIONS ---
export type StageHistory = {
    stage: string;
    date: string;
};

export type WorkingTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    status: "Completed" | "Over Due";
    approved: "Yes" | "Rework";
};

export type ProjectTimelineItem = {
    s_no: number;
    description: string;
    deadline: string;
    status: "Completed" | "Over Due";
    final_fileName?: string;
};

export type PostProcessItem = {
    id: string;
    date: string;
    department: string;
    company_name: string;
    contact: string;
    state: string;
    deadline: string;
    description: string;
    fileName?: string;
    source: string;
    customer_notes: string;
    order_value: number;
    advance_payment: { amount: number; bank_details: string; date: string; };
    expense: number;
    profit: number;
    balance_due: number;
    subdeal_department?: string;
    project_handled_by: string;
    working_timeline: WorkingTimelineItem[];
    project_timeline: ProjectTimelineItem[];
    expense_bill_format: string;
    post_process_status: "Pending" | "Completed";
    stage_history?: StageHistory[]; // Added field
};

export type PaymentPendingItem = Omit<PostProcessItem, 'post_process_status'> & {
    payment_status: 'Pending';
    stage_history?: StageHistory[]; // Added field
};


export default function PostProcessListPage() {
    const router = useRouter();
    const params = useParams();
    const pipelineId = params?.pipelineId as string;
    const [items, setItems] = useState<PostProcessItem[]>([]);
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        item: null as PostProcessItem | null,
        // Corrected: Added 'none' to the type definition
        mode: 'none' as 'delete' | 'move_to_payment' | 'none'
    });

    useEffect(() => {
        const storedData = localStorage.getItem("postprocessData");
        if (storedData) {
            // Corrected: Replaced 'any' with a more specific partial type for safety
            const parsedData: PostProcessItem[] = JSON.parse(storedData).map((item: Partial<PostProcessItem>) => ({
                ...item,
                id: item.id || uuidv4(),
                working_timeline: Array.isArray(item.working_timeline) ? item.working_timeline : [],
                project_timeline: Array.isArray(item.project_timeline) ? item.project_timeline : [],
                stage_history: Array.isArray(item.stage_history) ? item.stage_history : [], // Added sanitization
            } as PostProcessItem)); // Asserting the final shape after sanitization
            setItems(parsedData);
        }
    }, []);

    const updateLocalStorage = (updatedItems: PostProcessItem[]) => {
        localStorage.setItem("postprocessData", JSON.stringify(updatedItems));
    };

    const closeDialog = () => setDialogState({ isOpen: false, item: null, mode: 'none' });

    const openDeleteDialog = (item: PostProcessItem) => {
        setDialogState({ isOpen: true, item, mode: 'delete' });
    };

    const openMoveDialog = (item: PostProcessItem) => {
        setDialogState({ isOpen: true, item, mode: 'move_to_payment' });
    };

    const handleConfirmDelete = () => {
        if (!dialogState.item) return;
        const updatedItems = items.filter((item) => item.id !== dialogState.item!.id);
        setItems(updatedItems);
        updateLocalStorage(updatedItems);
        closeDialog();
    };

    const handleConfirmMove = () => {
        const itemToMove = dialogState.item;
        if (!itemToMove) return;

        // Corrected: Handle unused variable by renaming to '_'
        const { post_process_status: _, ...rest } = itemToMove;
        const newPaymentItem: PaymentPendingItem = {
            ...rest,
            payment_status: 'Pending',
            stage_history: [
                ...(itemToMove.stage_history || []),
                { stage: 'Moved to Payment Pending', date: new Date().toISOString() }
            ]
        };

        const paymentData = JSON.parse(localStorage.getItem("paymentPendingData") || "[]");
        localStorage.setItem("paymentPendingData", JSON.stringify([...paymentData, newPaymentItem]));

        const updatedItems = items.filter(i => i.id !== itemToMove.id);
        setItems(updatedItems);
        updateLocalStorage(updatedItems);
        closeDialog();
    };

    const formatCurrency = (value: number) => (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const getProjectStatus = (item: PostProcessItem) => {
        const allTimelines = [...item.working_timeline, ...item.project_timeline];
        if (allTimelines.length === 0) return { text: "In Progress", color: "blue" };
        const allCompleted = allTimelines.every(t => t.status === "Completed");
        if (allCompleted) return { text: "Completed", color: "green" };
        const isOverdue = allTimelines.some(t => t.status === "Over Due" && t.deadline && isPast(new Date(t.deadline)));
        if (isOverdue) return { text: "At Risk", color: "red" };
        return { text: "In Progress", color: "blue" };
    };

    return (
        <div className="min-h-screen p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-green-700">Post Process (Ongoing Projects)</h1>
            </div>

            <div className="overflow-x-auto border rounded shadow">
                <table className="w-full border-collapse">
                    <thead className="text-green-800 bg-green-100">
                        <tr>{["Date", "Company", "Handled By", "Balance Due", "Project Status", "Actions"].map((h) => (<th key={h} className="p-2 text-left border">{h}</th>))}</tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? (
                            items.map((item) => {
                                const status = getProjectStatus(item);
                                const rowClass = status.text === "At Risk" ? 'bg-red-50 border-l-4 border-red-500' : 'border-b';

                                return (
                                    <tr key={item.id} className={`${rowClass} hover:bg-green-50`}>
                                        <td className="p-2 border">{format(new Date(item.date), "dd/MM/yyyy")}</td>
                                        <td className="p-2 border">{item.company_name}</td>
                                        <td className="p-2 border">{item.project_handled_by}</td>
                                        <td className="p-2 border font-semibold text-orange-600">{formatCurrency(item.balance_due)}</td>
                                        <td className="p-2 border">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color === 'red' ? 'bg-red-100 text-red-800' : status.color === 'green' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {status.text}
                                            </span>
                                        </td>
                                        <td className="p-2 border">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {status.text === 'Completed' && (
                                                    <button onClick={() => openMoveDialog(item)} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Next</button>
                                                )}
                                                <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/postprocess/${item.id}/view`)} className="px-3 py-1 text-xs text-white bg-blue-500 rounded-md hover:bg-blue-600">View</button>
                                                {status.text !== 'Completed' && (
                                                    <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/postprocess/${item.id}/edit`)} className="px-3 py-1 text-xs text-white bg-yellow-500 rounded-md hover:bg-yellow-600">Edit</button>
                                                )}
                                                <button onClick={() => openDeleteDialog(item)} className="px-3 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={6} className="p-4 text-center text-gray-500">No projects in Post Process.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {dialogState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800">{dialogState.mode === 'delete' ? 'Confirm Deletion' : 'Move to Payment Pending'}</h2>
                        <p className="mt-3 text-gray-600">{`Are you sure you want to ${dialogState.mode === 'delete' ? 'delete' : 'move'} this project for "${dialogState.item?.company_name}"?`}</p>
                        <div className="flex justify-end mt-6 space-x-4">
                            <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                            {dialogState.mode === 'delete' && <button onClick={handleConfirmDelete} className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button>}
                            {dialogState.mode === 'move_to_payment' && <button onClick={handleConfirmMove} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Confirm & Move</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

