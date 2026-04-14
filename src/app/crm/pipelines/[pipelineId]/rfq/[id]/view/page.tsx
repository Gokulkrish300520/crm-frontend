"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import type { RFQ } from "../../page"; // Assuming this type is defined in the parent page

// Define a constant for the localStorage key for better maintainability
const RFQ_STORAGE_KEY = "rfqData";

// --- UI Components for different states ---

/**
 * Displays a skeleton loader while the RFQ data is being fetched.
 */
const LoadingSkeleton = () => (
    <div className="max-w-7xl p-8 mx-auto animate-pulse">
        <div className="flex justify-between items-center mb-8">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-10 bg-gray-300 rounded w-28"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i}>
                        <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
            <div className="h-[75vh] bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

/**
 * Displays a user-friendly message when the requested RFQ is not found.
 */
const NotFound = () => {
    const router = useRouter();
    const params = useParams();
    const pipelineId = params?.pipelineId as string;
    return (
        <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">RFQ Not Found</h2>
            <p className="text-gray-500 mb-6">The RFQ you are looking for does not exist or may have been deleted.</p>
            <button
                onClick={() => router.push(`/crm/pipelines/${pipelineId}/rfq`)}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
                Return to RFQ List
            </button>
        </div>
    );
};

// --- Reusable Detail & Viewer Components ---

/**
 * A reusable component for displaying a single detail item.
 */
const DetailItem = ({ label, value, isPriority = false }: { label: string; value: string; isPriority?: boolean }) => {
    const priorityClasses: { [key: string]: string } = {
        High: "bg-red-500",
        Medium: "bg-yellow-500",
        Low: "bg-blue-500",
    };

    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
            {isPriority ? (
                <span className={`mt-1 inline-block px-3 py-1 text-sm font-semibold text-white rounded-full ${priorityClasses[value] || "bg-gray-400"}`}>
                    {value}
                </span>
            ) : (
                <p className="mt-1 text-base text-gray-800 break-words">{value}</p>
            )}
        </div>
    );
};

/**
 * Component to display the embedded PDF or a placeholder.
 */
const PdfViewer = ({ billUpload }: { billUpload: string | null | undefined }) => (
    <div className="h-full min-h-[500px] lg:h-[75vh]">
        <h2 className="text-lg font-semibold text-green-800 border-b pb-2 mb-4">Uploaded Bill</h2>
        {billUpload && billUpload.startsWith('data:application/pdf') ? (
            <iframe
                src={billUpload}
                className="w-full h-full border rounded-md"
                title="RFQ Bill Preview"
            />
        ) : (
            <div className="flex items-center justify-center w-full h-full border-2 border-dashed rounded-md bg-gray-50">
                <p className="text-gray-500">No PDF Uploaded</p>
            </div>
        )}
    </div>
);


// --- Main Page Component ---

export default function ViewRFQPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params.pipelineId as string;

    // Enhanced state management to handle loading, data, and not-found states explicitly
    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            setError("RFQ ID is missing.");
            return;
        }

        try {
            const storedData = localStorage.getItem(RFQ_STORAGE_KEY);
            if (storedData) {
                const data: RFQ[] = JSON.parse(storedData);
                const rfqToView = data.find((r) => r.id === id);

                if (rfqToView) {
                    setRfq(rfqToView);
                } else {
                    // Handle case where RFQ with the given ID is not found
                    setError("RFQ not found.");
                }
            } else {
                setError("No RFQ data found in storage.");
            }
        } catch (e) {
            console.error("Failed to parse RFQ data:", e);
            setError("An error occurred while retrieving the data.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error || !rfq) {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
            <div className="max-w-7xl p-6 sm:p-8 mx-auto bg-white rounded-xl shadow-md">
                {/* Page Header */}
                <header className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b pb-4">
                    <h1 className="text-3xl font-bold text-green-700">RFQ Details</h1>
                    <button
                        onClick={() => router.push(`/crm/pipelines/${pipelineId}/rfq`)}
                        className="px-5 py-2 text-white font-semibold bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    >
                        Back to List
                    </button>
                </header>
                
                {/* Main Content Grid */}
                <main className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1: RFQ Information */}
                    <section className="space-y-5">
                        <DetailItem label="Date" value={format(new Date(rfq.date), "dd MMMM, yyyy")} />
                        <DetailItem label="Deadline" value={format(new Date(rfq.deadline), "dd MMMM, yyyy")} />
                        <DetailItem label="Company Name" value={rfq.company_name} />
                        <DetailItem label="Department" value={rfq.department} />
                        <DetailItem label="Priority" value={rfq.priority} isPriority />
                        <DetailItem label="Contact" value={rfq.contact} />
                        <DetailItem label="State" value={rfq.state} />
                        <DetailItem label="Source" value={rfq.source} />
                        <div className="pt-2">
                            <DetailItem label="Description" value={rfq.description} />
                        </div>
                    </section>

                    {/* Column 2: PDF Viewer */}
                    <section>
                        <PdfViewer billUpload={rfq.fileName} />
                    </section>
                </main>
            </div>
        </div>
    );
}