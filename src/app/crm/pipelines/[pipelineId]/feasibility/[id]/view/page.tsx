"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // Re-added for Next.js best practices
import { format } from "date-fns";
import type { Feasibility } from "../../page";

// --- UI Components for Loading and Error States ---

const LoadingSkeleton = () => (
    <div className="max-w-7xl p-8 mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-10 bg-gray-300 rounded w-28"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
                {[...Array(3)].map((_, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-4">
                        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
                        {[...Array(3)].map((_, itemIndex) => (
                             <div key={itemIndex} className="pt-2">
                                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="h-[75vh] bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

const NotFound = ({ pipelineId }: { pipelineId: string }) => {
    const router = useRouter();
    return (
        <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Feasibility Item Not Found</h2>
            <p className="text-gray-500 mb-6">The item you are looking for does not exist or may have been deleted.</p>
            <button
                onClick={() => router.push(`/crm/pipelines/${pipelineId}/feasibility`)}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
                Return to Feasibility List
            </button>
        </div>
    );
};


// --- Reusable Detail Components ---

const DetailItem = ({ label, value, isPriority = false }: { label: string; value: string; isPriority?: boolean }) => {
    const priorityClasses: { [key: string]: string } = {
        High: "bg-red-200 text-red-800",
        Medium: "bg-yellow-200 text-yellow-800",
        Low: "bg-blue-200 text-blue-800",
    };

    return (
        <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
            {isPriority ? (
                <span className={`mt-1 inline-block px-3 py-1 text-sm font-semibold rounded-full ${priorityClasses[value] || "bg-gray-200 text-gray-800"}`}>
                    {value}
                </span>
            ) : (
                <p className="mt-1 text-base text-gray-800">{value}</p>
            )}
        </div>
    );
};

const LongTextItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        <p className="mt-2 text-base text-gray-700 whitespace-pre-wrap p-4 bg-gray-50 border rounded-md">
            {value || <span className="text-gray-400">Not provided.</span>}
        </p>
    </div>
);


// --- Main Page Component ---
export default function ViewFeasibilityPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    
    const [item, setItem] = useState<Feasibility | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            try {
                const storedData = localStorage.getItem("feasibilityData") || "[]";
                const data: Feasibility[] = JSON.parse(storedData);
                const itemToView = data.find((i) => i.id === id);
                if (itemToView) {
                    setItem(itemToView);
                } else {
                    setError("Item not found.");
                }
            } catch (e) {
                console.error("Failed to parse data from localStorage:", e);
                setError("Could not retrieve data.");
            } finally {
                setLoading(false);
            }
        } else {
             setLoading(false);
        }
    }, [id]);

    if (loading) return <LoadingSkeleton />;
    if (error || !item) return <NotFound pipelineId={pipelineId} />;

    return (
        <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
            <div className="max-w-7xl p-6 sm:p-8 mx-auto bg-white rounded-xl shadow-md">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-green-700">Feasibility Details</h1>
                        <p className="text-gray-500 mt-1">Viewing details for: <span className="font-semibold text-gray-700">{item.company_name}</span></p>
                    </div>
                    <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/feasibility`)} className="px-5 py-2 text-white font-semibold bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                        Back to List
                    </button>
                </header>
                
                {/* Main Content Grid */}
                <main className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1: Details */}
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">General Information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DetailItem label="Company Name" value={item.company_name} />
                                <DetailItem label="Department" value={item.department} />
                                <DetailItem label="Contact" value={item.contact} />
                                <DetailItem label="State" value={item.state} />
                                <DetailItem label="Source" value={item.source} />
                                <DetailItem label="Priority" value={item.priority} isPriority />
                            </div>
                        </section>

                        <section>
                             <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Key Dates</h2>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <DetailItem label="Date Received" value={format(new Date(item.date), "dd MMMM, yyyy")} />
                                <DetailItem label="Original Deadline" value={format(new Date(item.deadline), "dd MMMM, yyyy")} />
                             </div>
                        </section>

                        <section>
                             <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Internal Assessment</h2>
                             <div className="space-y-4">
                                <LongTextItem label="Description" value={item.description} />
                                <LongTextItem label="Customer Notes" value={item.customer_notes} />
                             </div>
                        </section>
                    </div>

                    {/* Column 2: Document Viewer */}
                    <div className="h-full min-h-[500px] lg:h-[75vh]">
                        <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Original RFQ Document</h2>
                        {item.fileName ? (
                             <iframe src={`/path/to/your/documents/${item.fileName}`} className="w-full h-full border rounded-md" title="RFQ Document Preview" />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-gray-50">
                                <p className="text-gray-500">No document was uploaded for this RFQ.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}