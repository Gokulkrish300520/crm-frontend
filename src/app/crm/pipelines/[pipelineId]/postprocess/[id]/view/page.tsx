"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format, isPast, isValid } from "date-fns";

// --- Type Definitions ---
export type WorkingTimelineItem = {
  s_no: number;
  description: string;
  deadline: string;
  status: "Completed" | "Over Due";
  approved: "Yes" | "Rework";
  assigned_to?: string;
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
};


// --- UI Components ---
const LoadingSkeleton = () => (
    <div className="max-w-4xl p-8 mx-auto animate-pulse">
        <div className="mb-8 border-b pb-4"><div className="h-8 bg-gray-300 rounded w-1/2"></div></div>
        <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 border rounded-lg">
                    <div className="h-6 bg-gray-300 rounded w-1/4 mb-6"></div>
                    <div className="h-16 bg-gray-200 rounded w-full"></div>
                </div>
            ))}
        </div>
    </div>
);

const NotFound = ({ pipelineId }: { pipelineId: string }) => {
    const router = useRouter();
    return (
        <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Project Not Found</h2>
            <p className="text-gray-500 mb-6">The project you are looking for does not exist.</p>
            <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/postprocess`)} className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Return to List</button>
        </div>
    );
};

const DetailItem = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        <p className="mt-1 text-base text-gray-800 break-words">{value || "-"}</p>
    </div>
);

export default function ViewPostProcessPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    const [item, setItem] = useState<PostProcessItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const storedData = localStorage.getItem("postprocessData") || "[]";
            const data: PostProcessItem[] = JSON.parse(storedData);
            const itemToView = data.find((i) => i.id === id);
            if (itemToView) {
                if (typeof itemToView.advance_payment === 'number' || !itemToView.advance_payment) {
                    itemToView.advance_payment = { amount: (itemToView.advance_payment as unknown as number) || 0, bank_details: '', date: '' };
                }
                const sanitizedItem = {
                    ...itemToView,
                    working_timeline: Array.isArray(itemToView.working_timeline) ? itemToView.working_timeline : [],
                    project_timeline: Array.isArray(itemToView.project_timeline) ? itemToView.project_timeline : [],
                };
                setItem(sanitizedItem);
            }
            setLoading(false);
        }
    }, [id]);

    const formatCurrency = (value: number | undefined) => (value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const getProjectStatus = (item: PostProcessItem) => {
        const allTimelines = [...item.working_timeline, ...item.project_timeline];
        if (allTimelines.every(t => t.status === "Completed")) return { text: "Completed", color: "green" };
        if (allTimelines.some(t => t.status === "Over Due" && t.deadline && isPast(new Date(t.deadline)))) return { text: "At Risk", color: "red" };
        return { text: "In Progress", color: "blue" };
    };

    if (loading) return <LoadingSkeleton />;
    if (!item) return <NotFound pipelineId={pipelineId} />;

    const projectStatus = getProjectStatus(item);

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-700">Post Process Details</h1>
                        <p className="text-gray-500 mt-1">Viewing project for: <span className="font-semibold text-gray-700">{item.company_name}</span></p>
                    </div>
                    <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/postprocess`)} className="px-5 py-2 text-white font-semibold bg-green-600 rounded-lg hover:bg-green-700">Back to List</button>
                </header>
                
                <main className="space-y-8">
                    <section className="p-6 bg-white border rounded-lg shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                             <h2 className="text-lg font-semibold text-green-800">Project Information</h2>
                             <span className={`px-3 py-1 text-sm font-semibold rounded-full ${ projectStatus.color === 'red' ? 'bg-red-100 text-red-800' : projectStatus.color === 'green' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{projectStatus.text}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                            <DetailItem label="Company Name" value={item.company_name} />
                            <DetailItem label="Department" value={item.department} />
                            <DetailItem label="Project Handled By" value={item.project_handled_by} />
                            <DetailItem label="Subdeal Department" value={item.subdeal_department} />
                            <DetailItem label="Date Started" value={format(new Date(item.date), "dd MMMM, yyyy")} />
                            <DetailItem label="Final Deadline" value={format(new Date(item.deadline), "dd MMMM, yyyy")} />
                        </div>
                    </section>

                    <section className="p-6 bg-white border rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Financial Summary</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <DetailItem label="Order Value" value={formatCurrency(item.order_value)} />
                            <DetailItem label="Total Expense" value={formatCurrency(item.expense)} />
                            <DetailItem label="Expense Bill Format" value={item.expense_bill_format} />
                            <DetailItem label="Advance Amount" value={formatCurrency(item.advance_payment?.amount)} />
                            <DetailItem label="Bank Details" value={item.advance_payment?.bank_details} />
                            <DetailItem label="Payment Date" value={item.advance_payment?.date && isValid(new Date(item.advance_payment.date)) ? format(new Date(item.advance_payment.date), "dd MMM, yyyy") : '-'} />
                            <div className="col-span-full grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
                                <div className="p-4 bg-blue-50 rounded-lg"><DetailItem label="Calculated Profit" value={formatCurrency(item.profit)} /></div>
                                <div className="p-4 bg-red-50 rounded-lg"><DetailItem label="Balance Due" value={formatCurrency(item.balance_due)} /></div>
                            </div>
                        </div>
                    </section>

                    <section className="p-6 bg-white border rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Working Timeline</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full mt-2 text-sm">
                                <thead className="bg-gray-50 text-left font-medium text-gray-600"><tr><th className="p-2">S.No</th><th className="p-2">Description</th><th className="p-2">Assigned To</th><th className="p-2">Deadline</th><th className="p-2">Status</th><th className="p-2">Approved</th></tr></thead>
                                <tbody>{item.working_timeline.map((t) => (<tr key={t.s_no} className="border-b"><td className="p-2">{t.s_no}</td><td className="p-2">{t.description}</td><td className="p-2 font-medium">{t.assigned_to || 'N/A'}</td><td className="p-2">{t.deadline && isValid(new Date(t.deadline)) ? format(new Date(t.deadline), "dd MMM, yyyy") : "—"}</td><td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.status}</span></td><td className="p-2"><span className={`font-semibold ${t.approved === 'Yes' ? 'text-green-600' : 'text-yellow-600'}`}>{t.approved}</span></td></tr>))}</tbody>
                            </table>
                            {item.working_timeline.length === 0 && <p className="mt-4 text-gray-500">No working timeline entries.</p>}
                        </div>
                    </section>

                    <section className="p-6 bg-white border rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Project Timeline</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full mt-2 text-sm">
                                <thead className="bg-gray-50 text-left font-medium text-gray-600"><tr><th className="p-2">S.No</th><th className="p-2">Description</th><th className="p-2">Deadline</th><th className="p-2">Status</th><th className="p-2">Final File</th></tr></thead>
                                <tbody>{item.project_timeline.map((t) => (<tr key={t.s_no} className="border-b"><td className="p-2">{t.s_no}</td><td className="p-2">{t.description}</td><td className="p-2">{t.deadline && isValid(new Date(t.deadline)) ? format(new Date(t.deadline), "dd MMM, yyyy") : "—"}</td><td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.status}</span></td><td className="p-2 text-blue-600 hover:underline">{t.final_fileName || 'N/A'}</td></tr>))}</tbody>
                            </table>
                            {item.project_timeline.length === 0 && <p className="mt-4 text-gray-500">No project timeline entries found.</p>}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}