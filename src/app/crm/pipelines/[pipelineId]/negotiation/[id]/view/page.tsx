"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";

// --- Type Definitions ---
// Assuming these types are correctly defined in a shared file or the parent page
export type NegotiationEvent = {
  id: string;
  date: string;
  remarks: string;
  next_followup_date: string;
};

export type Negotiation = {
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
  priority: "High" | "Medium" | "Low";
  customer_notes: string;
  subdeal_notes?: string;
  team_member?: string;
  quotation_status: "Followup" | "Closed" | "Convert";
  events: NegotiationEvent[]; // Multiple follow-up dates
  followup_datetime?: string; // Deprecated - keeping for backward compatibility
  closed_reason?: string;
  convert_info?: string;
  po_document?: string;
};

// --- UI Components for Loading and Error States ---
const LoadingSkeleton = () => (
    <div className="max-w-7xl p-8 mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-8 border-b pb-4"><div className="h-8 bg-gray-300 rounded w-1/3"></div><div className="h-10 bg-gray-300 rounded w-28"></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">{[...Array(3)].map((_, i) => (<div key={i} className="space-y-4"><div className="h-6 bg-gray-300 rounded w-1/4"></div><div className="h-5 bg-gray-200 rounded w-3/4"></div><div className="h-5 bg-gray-200 rounded w-1/2"></div></div>))}</div>
            <div className="h-[75vh] bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

const NotFound = ({ pipelineId }: { pipelineId: string }) => {
    const router = useRouter();
    return (
        <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Negotiation Not Found</h2>
            <p className="text-gray-500 mb-6">The item you are looking for does not exist.</p>
            <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/negotiation`)} className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Return to List</button>
        </div>
    );
};

// --- Reusable Detail Components ---
const DetailItem = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        <p className="mt-1 text-base text-gray-800 break-words">{value || "-"}</p>
    </div>
);

const LongTextItem = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        <p className="mt-2 text-base text-gray-700 whitespace-pre-wrap p-4 bg-gray-50 border rounded-md">{value || <span className="text-gray-400">Not provided.</span>}</p>
    </div>
);

const StatusBadge = ({ status }: { status: Negotiation['quotation_status'] }) => {
    const statusStyles = {
        Followup: "bg-blue-100 text-blue-800",
        Closed: "bg-red-100 text-red-800",
        Convert: "bg-green-100 text-green-800",
    };
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[status]}`}>{status}</span>;
};

const DocumentViewer = ({ po_document, fileName }: { po_document?: string, fileName?: string }) => {
    const documentToDisplay = po_document || fileName;
    const title = po_document ? "PO / Confirmation Document" : "Original Quotation Document";

    return (
        <div className="h-full min-h-[500px] lg:h-full">
            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">{title}</h2>
            {documentToDisplay ? (
                <iframe src={`/api/documents/${documentToDisplay}`} className="w-full h-[70vh] border rounded-md" title={title}/>
            ) : (
                <div className="flex items-center justify-center w-full h-[70vh] border-2 border-dashed rounded-md bg-gray-50"><p className="text-gray-500">No document available.</p></div>
            )}
        </div>
    );
};


// --- Main Page Component ---
export default function ViewNegotiationPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    
    const [item, setItem] = useState<Negotiation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            try {
                const storedData = localStorage.getItem("negotiationData") || "[]";
                const data: Negotiation[] = JSON.parse(storedData);
                const itemToView = data.find((i) => i.id === id);
                setItem(itemToView || null);
            } catch (e) { console.error("Failed to load data:", e); }
            finally { setLoading(false); }
        } else { setLoading(false); }
    }, [id]);

    if (loading) return <LoadingSkeleton />;
    if (!item) return <NotFound pipelineId={pipelineId} />;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-700">Negotiation Details</h1>
                        <p className="text-gray-500 mt-1">Viewing deal for: <span className="font-semibold text-gray-700">{item.company_name}</span></p>
                    </div>
                    <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/negotiation`)} className="px-5 py-2 text-white font-semibold bg-green-600 rounded-lg hover:bg-green-700">Back to List</button>
                </header>
                
                <main className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Left Column: Details */}
                    <div className="space-y-8">
                        <section className="p-6 bg-white border rounded-lg shadow-sm">
                            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Deal Status</h2>
                            <div className="space-y-4">
                                <DetailItem label="Current Status" value="" />
                                <StatusBadge status={item.quotation_status} />

                                {item.quotation_status === "Closed" && <LongTextItem label="Reason for Closing" value={item.closed_reason} />}
                                {item.quotation_status === "Convert" && <LongTextItem label="Confirmation / PO Details" value={item.convert_info} />}
                            </div>
                        </section>

                        {/* Follow-up History Section */}
                        {item.quotation_status === "Followup" && (
                            <section className="p-6 bg-white border rounded-lg shadow-sm">
                                <h2 className="text-lg font-semibold text-blue-800 border-b pb-2 mb-4">Follow-up History</h2>
                                {!item.events || item.events.length === 0 ? (
                                    <p className="text-gray-500">No follow-up dates recorded yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {[...item.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(event => (
                                            <div key={event.id} className="p-4 border rounded bg-blue-50">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <p className="text-xs text-gray-500">
                                                        Recorded: {format(new Date(event.date), "dd MMM yyyy, hh:mm a")}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-2">{event.remarks}</p>
                                                <p className="text-xs font-semibold text-blue-700">
                                                    Next Follow-up: {format(new Date(event.next_followup_date), "dd MMM yyyy")}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        <section className="p-6 bg-white border rounded-lg shadow-sm">
                             <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Assignment Details</h2>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <DetailItem label="Department" value={item.department} />
                                <DetailItem label="Assigned Team Member" value={item.team_member} />
                             </div>
                        </section>

                        <section className="p-6 bg-white border rounded-lg shadow-sm">
                            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Original Quotation Details</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <DetailItem label="Company Name" value={item.company_name} />
                                <DetailItem label="Contact" value={item.contact} />
                                <DetailItem label="Deadline" value={format(new Date(item.deadline), "dd MMMM, yyyy")} />
                                <DetailItem label="Priority" value={item.priority} />
                                <div className="sm:col-span-2"><LongTextItem label="Description" value={item.description} /></div>
                                <div className="sm:col-span-2"><LongTextItem label="Subdeal Notes" value={item.subdeal_notes} /></div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Document Viewer */}
                    <aside className="p-6 bg-white border rounded-lg shadow-sm">
                        <DocumentViewer po_document={item.po_document} fileName={item.fileName} />
                    </aside>
                </main>
            </div>
        </div>
    );
}