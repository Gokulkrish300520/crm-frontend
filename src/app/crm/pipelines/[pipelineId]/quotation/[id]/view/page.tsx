"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import type { Quotation, Subdeal } from "../../page";

// --- UI Components for Loading and Error States ---
const LoadingSkeleton = () => (
    <div className="max-w-7xl p-8 mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-10 bg-gray-300 rounded w-28"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column Skeleton */}
            <div className="space-y-8">
                <div className="p-6 border rounded-lg">
                    <div className="h-6 bg-gray-300 rounded w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i}><div className="h-4 bg-gray-200 rounded w-3/4"></div></div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border rounded-lg">
                    <div className="h-6 bg-gray-300 rounded w-1/3 mb-6"></div>
                    <div className="h-12 bg-gray-200 rounded w-full"></div>
                </div>
            </div>
            {/* Right Column Skeleton */}
            <div className="h-[75vh] bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

const NotFound = ({ pipelineId }: { pipelineId: string }) => {
    const router = useRouter();
    return (
        <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Quotation Not Found</h2>
            <p className="text-gray-500 mb-6">The item you are looking for does not exist or may have been deleted.</p>
            <button
                onClick={() => router.push(`/crm/pipelines/${pipelineId}/quotation`)}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
                Return to Quotation List
            </button>
        </div>
    );
};

// --- Reusable Components ---
const DetailItem = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        <p className="mt-1 text-base text-gray-800 break-words">{value || "-"}</p>
    </div>
);

// NEW: Component for the PDF Viewer
const DocumentViewer = ({ fileName }: { fileName: string | undefined }) => (
    <div className="h-full min-h-[500px] lg:h-[75vh]">
        <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Quotation Document</h2>
        {fileName ? (
            // IMPORTANT: Replace '/api/documents/' with the actual path or API endpoint where your files are served.
            <iframe
                src={`/api/documents/${fileName}`}
                className="w-full h-full border rounded-md"
                title="Quotation Document Preview"
            />
        ) : (
            <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-gray-50">
                <p className="text-gray-500">No document was uploaded.</p>
            </div>
        )}
    </div>
);

// --- Main Page Component ---
export default function ViewQuotationPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params.pipelineId as string;
    
    const [item, setItem] = useState<Quotation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            try {
                const storedData = localStorage.getItem("quotationData") || "[]";
                const data: Quotation[] = JSON.parse(storedData);
                const itemToView = data.find((i) => i.id === id);
                if (itemToView) {
                    if (!Array.isArray(itemToView.subdeals)) {
                        itemToView.subdeals = [];
                    }
                    setItem(itemToView);
                } else {
                    setError("Item not found.");
                }
            } catch (e) {
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
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-700">Quotation Details</h1>
                        <p className="text-gray-500 mt-1">Viewing details for: <span className="font-semibold text-gray-700">{item.company_name}</span></p>
                    </div>
                    <button onClick={() => router.push(`/crm/pipelines/${pipelineId}/quotation`)} className="px-5 py-2 text-white font-semibold bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                        Back to List
                    </button>
                </header>
                
                {/* Main Content - MODIFIED to a 2-column layout */}
                <main className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Left Column: Details & Subdeals */}
                    <div className="space-y-8">
                        <section className="p-6 bg-white border rounded-lg shadow-sm">
                            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">General Information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <DetailItem label="Company Name" value={item.company_name} />
                                <DetailItem label="Original Department" value={item.department} />
                                <DetailItem label="Contact" value={item.contact} />
                                <DetailItem label="State" value={item.state} />
                                <DetailItem label="Source" value={item.source} />
                                <DetailItem label="Priority" value={item.priority} />
                                <DetailItem label="Date Received" value={format(new Date(item.date), "dd MMMM, yyyy")} />
                                <DetailItem label="Deadline" value={format(new Date(item.deadline), "dd MMMM, yyyy")} />
                                <div className="sm:col-span-2"><DetailItem label="Description" value={item.description} /></div>
                                <div className="sm:col-span-2"><DetailItem label="Customer Notes" value={item.customer_notes} /></div>
                            </div>
                        </section>

                        <section className="p-6 bg-white border rounded-lg shadow-sm">
                            <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Subdeals / Department Handover</h2>
                            <div className="mt-4 space-y-4">
                                {item.subdeals && item.subdeals.length > 0 ? (
                                    item.subdeals.map(subdeal => (
                                        <div key={subdeal.id} className="p-4 border rounded-md bg-green-50">
                                            <p className="font-semibold text-green-900">{subdeal.department}</p>
                                            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                                {subdeal.notes || <span className="text-gray-400">No additional notes.</span>}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No subdeals have been created.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: PDF Viewer */}
                    <aside>
                        <DocumentViewer fileName={item.fileName} />
                    </aside>
                </main>
            </div>
        </div>
    );
}