"use client";

import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Briefcase, Clock, CheckCircle, AlertTriangle, IndianRupee, FileWarning, Target, Calendar, Trash2 } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storage';
import { readJson } from '@/utils/storage';

// --- TYPE DEFINITIONS (Copied from the first example) ---
type RFQ = { id: string; company_name: string; deadline: string; };
type PreprocessItem = { id: string; company_name: string; deadline: string; project_handled_by: string };
type PostProcessItem = { id: string; company_name: string; deadline: string; project_handled_by: string };
type CompletedProject = { id: string; company_name: string; deadline: string; completion_date: string };
type PaymentPendingItem = { id: string; company_name: string; balance_due: number; };
type GstPurchaseItem = { id: string; vendor: string; total: number; paymentRequest: string; paymentStatus: 'Paid' | 'Unpaid' | 'Partially paid'; };
type OverdueableItem = (RFQ | PreprocessItem | PostProcessItem) & { type: string };

// System-wide deadline item
type DeadlineItem = {
    id: string;
    title: string;
    company_name: string;
    deadline: string;
    type: string;
    stage: string;
    priority?: 'High' | 'Medium' | 'Low';
    status?: string;
    pipelineId?: string;
    assigned_to?: string;
};

// --- HELPER COMPONENTS (Copied from the first example) ---
const CARD_VARIANTS = {
    blue: "from-blue-500 to-blue-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    green: "from-green-500 to-green-600"
} as const;

type CardVariant = keyof typeof CARD_VARIANTS;

const DashboardCard = ({ title, value, icon, variant }: { title: string; value: string | number; icon: React.ReactNode; variant: CardVariant }) => (
    <div className={`p-6 rounded-lg shadow-lg bg-gradient-to-br ${CARD_VARIANTS[variant]} text-white`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-lg font-semibold">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
            <div className="text-4xl opacity-50">{icon}</div>
        </div>
    </div>
);

const OverdueItem = ({ item }: { item: OverdueableItem }) => (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <div>
            <p className="font-semibold text-gray-800">{item.company_name}</p>
            <p className="text-sm text-gray-500">{item.type} - Deadline: {new Date(item.deadline).toLocaleDateString()}</p>
        </div>
        <div className="text-red-500 font-bold">OVERDUE</div>
    </div>
);


export default function CRMPage() {
    // Note: useRouter was imported but not used, so it's removed.
    const [userName] = useState("User"); // setUserName removed as it was unused
    const [stats, setStats] = useState({
        ongoing: 0,
        pendingRfqs: 0,
        onTime: 0,
        delayed: 0,
        overdueItems: [] as OverdueableItem[],
        highPriorityPayments: [] as GstPurchaseItem[],
        customerPendingTotal: 0,
        supplierPendingTotal: 0,
    });

    // --- DATA FETCHING AND CALCULATION LOGIC (Added from the first example) ---
    const loadStats = () => {
        const rfqs = readJson<RFQ[]>(STORAGE_KEYS.RFQ, []);
        const preprocess = readJson<PreprocessItem[]>(STORAGE_KEYS.PREPROCESS, []);
        const postprocess = readJson<PostProcessItem[]>(STORAGE_KEYS.POSTPROCESS, []);
        const completed = readJson<CompletedProject[]>(STORAGE_KEYS.COMPLETED_PROJECTS, []);
        const paymentPending = readJson<PaymentPendingItem[]>(STORAGE_KEYS.PAYMENT_PENDING, []);
        const gstPurchases = readJson<GstPurchaseItem[]>(STORAGE_KEYS.GST_PURCHASE, []);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const onTime = completed.filter(p => new Date(p.completion_date) <= new Date(p.deadline)).length;
        const delayed = completed.length - onTime;
        const ongoing = preprocess.length + postprocess.length;

        const overdueItems: OverdueableItem[] = [
            ...rfqs.filter(item => new Date(item.deadline) < today).map(item => ({ ...item, type: 'RFQ' })),
            ...preprocess.filter(item => new Date(item.deadline) < today).map(item => ({ ...item, type: 'Preprocess' })),
            ...postprocess.filter(item => new Date(item.deadline) < today).map(item => ({ ...item, type: 'Post Process' }))
        ];

        const highPriorityPayments = gstPurchases.filter(item => item.paymentRequest === "High");
        const customerPendingTotal = paymentPending.reduce((sum, item) => sum + item.balance_due, 0);
        const supplierPendingTotal = gstPurchases
            .filter(item => item.paymentStatus === 'Unpaid' || item.paymentStatus === 'Partially paid')
            .reduce((sum, item) => sum + item.total, 0);

        setStats({ ongoing, pendingRfqs: rfqs.length, onTime, delayed, overdueItems, highPriorityPayments, customerPendingTotal, supplierPendingTotal });
    };

    useEffect(() => {
        loadStats();
        
        // Reload stats when window gains focus
        const handleFocus = () => loadStats();
        window.addEventListener('focus', handleFocus);
        
        // Also reload every 30 seconds
        const interval = setInterval(() => {
            loadStats();
        }, 30000);
        
        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, []);

    // --- System-wide deadlines overview ---
    const [allDeadlines, setAllDeadlines] = useState<DeadlineItem[]>([]);

    const loadAllDeadlines = () => {
        const deadlines: DeadlineItem[] = [];

        try {
            const rfqs = readJson<RFQ[]>(STORAGE_KEYS.RFQ, []);
            rfqs.forEach(it => {
                if (it.deadline) deadlines.push({ id: it.id, title: (it as any).description || 'RFQ', company_name: it.company_name, deadline: it.deadline, type: 'RFQ', stage: 'RFQ', priority: 'Medium', status: (it as any).status || 'Active', pipelineId: (it as any).pipelineId || '', assigned_to: (it as any).project_handled_by || '' });
            });
        } catch (e) { }

        try {
            const preprocess = readJson<PreprocessItem[]>(STORAGE_KEYS.PREPROCESS, []);
            preprocess.forEach(it => {
                if (it.deadline) deadlines.push({ id: it.id, title: (it as any).description || 'Preprocess', company_name: it.company_name, deadline: it.deadline, type: 'Preprocess', stage: 'Preprocess', priority: 'High', status: (it as any).approval_status || 'Active', pipelineId: (it as any).pipelineId || '', assigned_to: it.project_handled_by || '' });
                const working = (it as any).working_timeline;
                if (Array.isArray(working)) working.forEach((t: any, idx: number) => { if (t.deadline) deadlines.push({ id: `${it.id}-wt-${idx}`, title: t.description || `Working Timeline ${idx+1}`, company_name: it.company_name, deadline: t.deadline, type: 'Preprocess', stage: 'Preprocess - Working Timeline', priority: 'Medium', status: t.approved || 'Pending', pipelineId: (it as any).pipelineId || '', assigned_to: it.project_handled_by || '' }); });
                const project = (it as any).project_timeline;
                if (Array.isArray(project)) project.forEach((t: any, idx: number) => { if (t.deadline) deadlines.push({ id: `${it.id}-pt-${idx}`, title: t.description || `Project Timeline ${idx+1}`, company_name: it.company_name, deadline: t.deadline, type: 'Preprocess', stage: 'Preprocess - Project Timeline', priority: 'High', status: 'Active', pipelineId: (it as any).pipelineId || '', assigned_to: it.project_handled_by || '' }); });
            });
        } catch (e) { }

        try {
            const postprocess = readJson<PostProcessItem[]>(STORAGE_KEYS.POSTPROCESS, []);
            postprocess.forEach(it => { if ((it as any).deadline) deadlines.push({ id: it.id, title: (it as any).description || 'Postprocess', company_name: it.company_name, deadline: (it as any).deadline || '', type: 'Postprocess', stage: 'Postprocess', priority: 'High', status: (it as any).post_process_status || 'Active', pipelineId: (it as any).pipelineId || '', assigned_to: (it as any).project_handled_by || '' }); });
        } catch (e) { }

        try {
            const paymentPending = readJson<PaymentPendingItem[]>(STORAGE_KEYS.PAYMENT_PENDING, []);
            paymentPending.forEach(it => { if ((it as any).deadline) deadlines.push({ id: it.id, title: (it as any).description || 'Payment Pending', company_name: it.company_name, deadline: (it as any).deadline || '', type: 'Payment Pending', stage: 'Payment Pending', priority: 'High', status: (it as any).payment_status || 'Pending', pipelineId: (it as any).pipelineId || '', assigned_to: (it as any).project_handled_by || '' }); });
        } catch (e) { }

        try {
            const completed = readJson<CompletedProject[]>(STORAGE_KEYS.COMPLETED_PROJECTS, []);
            completed.forEach(it => { if ((it as any).deadline) deadlines.push({ id: it.id, title: (it as any).description || 'Completed Project', company_name: it.company_name, deadline: (it as any).deadline || '', type: 'Completed Projects', stage: 'Completed Projects', priority: 'Low', status: (it as any).final_status || 'Completed', pipelineId: (it as any).pipelineId || '', assigned_to: (it as any).project_handled_by || '' }); });
        } catch (e) { }

        try {
            const negotiation = readJson<any[]>(STORAGE_KEYS.NEGOTIATION || 'negotiationData', []);
            negotiation.forEach(it => {
                if (Array.isArray((it as any).events)) (it as any).events.forEach((ev: any, idx: number) => { if (ev.next_followup_date) deadlines.push({ id: `${it.id}-ev-${idx}`, title: ev.remarks || `Follow-up ${idx+1}`, company_name: it.company_name, deadline: ev.next_followup_date, type: 'Negotiation', stage: 'Negotiation - Follow-up', priority: 'High', status: it.quotation_status || 'Active', pipelineId: (it as any).pipelineId || '', assigned_to: (it as any).project_handled_by || '' }); });
                if ((it as any).deadline) deadlines.push({ id: it.id, title: (it as any).description || 'Negotiation', company_name: it.company_name, deadline: (it as any).deadline || '', type: 'Negotiation', stage: 'Negotiation', priority: 'High', status: it.quotation_status || 'Active', pipelineId: (it as any).pipelineId || '', assigned_to: (it as any).project_handled_by || '' });
            });
        } catch (e) { }

        // sort and set
        deadlines.sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        setAllDeadlines(deadlines);
    };

    useEffect(() => { 
        loadAllDeadlines(); 
        
        // Reload deadlines when window gains focus (detects external changes)
        const handleFocus = () => loadAllDeadlines();
        window.addEventListener('focus', handleFocus);
        
        // Also set up interval to check for updates every 30 seconds
        const interval = setInterval(() => {
            loadAllDeadlines();
        }, 30000);
        
        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, []);

    const getDeadlineStatus = (deadline: string) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const d = new Date(deadline); d.setHours(0,0,0,0);
        const diff = Math.round((d.getTime() - today.getTime()) / (1000*60*60*24));
        if (diff < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-800' };
        if (diff === 0) return { label: 'Today', color: 'bg-orange-100 text-orange-800' };
        if (diff <= 7) return { label: `${diff}d`, color: 'bg-yellow-100 text-yellow-800' };
        return { label: `${diff}d`, color: 'bg-green-100 text-green-800' };
    };

    // --- CHART DATA (Defined based on the 'stats' state) ---
    const pieChartData = [
        { name: 'Ongoing', value: stats.ongoing },
        { name: 'On-Time', value: stats.onTime },
        { name: 'Delayed', value: stats.delayed },
    ];
    const COLORS = ['#0088FE', '#00FFD0', '#FF8042'];

    const [showClearDialog, setShowClearDialog] = useState(false);

    const handleClearLocalStorage = () => {
        localStorage.clear();
        setShowClearDialog(false);
        alert('All local storage data has been cleared. The page will reload.');
        window.location.reload();
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-800">Hi, {userName} 👋</h1>
                <button
                    onClick={() => setShowClearDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                    title="Clear all local storage data"
                >
                    <Trash2 size={18} />
                    Clear Data
                </button>
            </div>
            <p className="text-gray-500 mb-8">Here&apos;s your dashboard for today.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardCard title="Ongoing Works" value={stats.ongoing} icon={<Briefcase />} variant="blue" />
                <DashboardCard title="Pending RFQs" value={stats.pendingRfqs} icon={<Clock />} variant="yellow" />
                <DashboardCard title="Overdue Tasks" value={stats.overdueItems.length} icon={<AlertTriangle />} variant="red" />
                <DashboardCard title="Completed On-Time" value={stats.onTime} icon={<CheckCircle />} variant="green" />
            </div>

            {/* System-Wide Deadlines Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Target className="text-blue-600"/> System-Wide Deadlines Overview</h2>
                        <p className="text-gray-600">All active deadlines across pipelines and stages (including follow-ups)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total Deadlines</p>
                        <p className="text-2xl font-bold text-gray-900">{allDeadlines.length}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{allDeadlines.filter(d => new Date(d.deadline) < new Date()).length}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Due Today</p>
                        <p className="text-2xl font-bold text-orange-600">{allDeadlines.filter(d => { const t = new Date(); t.setHours(0,0,0,0); const dd = new Date(d.deadline); dd.setHours(0,0,0,0); return dd.getTime() === t.getTime(); }).length}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">This Week</p>
                        <p className="text-2xl font-bold text-blue-600">{allDeadlines.filter(d => { const t = new Date(); t.setHours(0,0,0,0); const next = new Date(t); next.setDate(t.getDate()+7); const dd = new Date(d.deadline); return dd >= t && dd <= next; }).length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b">
                        <h3 className="font-semibold text-gray-900">Critical & Upcoming Deadlines (Next 10)</h3>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {allDeadlines.slice(0,10).length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No deadlines found</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        <th className="px-4 py-3">Company</th>
                                        <th className="px-4 py-3">Task</th>
                                        <th className="px-4 py-3">Stage</th>
                                        <th className="px-4 py-3">Deadline</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Assigned To</th>
                                        <th className="px-4 py-3">Priority</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {allDeadlines.slice(0,10).map(d => {
                                        const status = getDeadlineStatus(d.deadline);
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.company_name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{d.title}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">{d.stage}</span></td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{new Date(d.deadline).toLocaleDateString()}</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span></td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{d.assigned_to || '-'}</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.priority === 'High' ? 'bg-red-100 text-red-800' : d.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{d.priority || 'Medium'}</span></td>
                                                <td className="px-4 py-3"><button onClick={() => { if (d.pipelineId) window.location.href = `/crm/pipelines/${d.pipelineId}/${d.type.toLowerCase()}`; }} className="text-blue-600 hover:text-blue-800 font-medium text-sm">View</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Works Overview</h2>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.name}: ${entry.value}`}>
                                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
                    <h2 className="text-xl font-bold text-gray-700">Payments Overview</h2>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full text-red-600"><IndianRupee /></div>
                        <div>
                            <p className="text-gray-500">Customer Pending Payments</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.customerPendingTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600"><IndianRupee /></div>
                        <div>
                            <p className="text-gray-500">Supplier Pending Payments</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.supplierPendingTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Low Stock Items</h2>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {stats.overdueItems.length > 0 ? (
                            stats.overdueItems.map(item => <OverdueItem key={item.id} item={item} />)
                        ) : <p className="text-gray-500">No overdue items. Great job!</p>}
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><FileWarning className="text-orange-500"/> High Priority Payments</h2>
                     <div className="space-y-3 max-h-60 overflow-y-auto">
                        {stats.highPriorityPayments.length > 0 ? (
                            stats.highPriorityPayments.map(item => (
                                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-semibold text-gray-800">{item.vendor}</p>
                                    <p className="text-sm text-gray-500">Amount: {item.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
                                </div>
                            ))
                        ) : <p className="text-gray-500">No high priority payments.</p>}
                    </div>
                </div>
            </div>

            {/* Clear Data Confirmation Dialog */}
            {showClearDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Trash2 className="text-red-600" />
                            Clear All Data?
                        </h2>
                        <p className="mt-3 text-gray-600">
                            This will permanently delete all data stored in your browser including:
                        </p>
                        <ul className="mt-2 ml-6 text-sm text-gray-600 list-disc">
                            <li>All RFQs and pipeline data</li>
                            <li>Companies and contacts</li>
                            <li>Projects and deadlines</li>
                            <li>Payment records</li>
                            <li>All other stored information</li>
                        </ul>
                        <p className="mt-3 text-red-600 font-semibold">
                            This action cannot be undone!
                        </p>
                        <div className="flex justify-end mt-6 space-x-4">
                            <button 
                                onClick={() => setShowClearDialog(false)} 
                                className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleClearLocalStorage} 
                                className="px-5 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Yes, Clear All Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}