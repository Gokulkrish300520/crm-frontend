"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// --- 1. Corrected Type Definitions ---

export type NegotiationEvent = {
    id: string;
    date: string;
    remarks: string;
    next_followup_date: string;
};

// Represents a single negotiation task, created from a quotation or a subdeal.
export type Negotiation = {
    id: string;
    date: string;
    department: string; // The specific department for this negotiation task
    company_name: string;
    contact: string;
    state: string;
    deadline: string;
    description: string;
    fileName?: string;
    source: string;
    priority: "High" | "Medium" | "Low";
    customer_notes: string; // Notes from the parent quotation
    subdeal_notes?: string; // Notes from the specific subdeal, if applicable

    // Fields for the negotiation workflow
    team_member?: string; // The team member assigned to this task
    quotation_status: "Followup" | "Closed" | "Convert";
    events: NegotiationEvent[]; // Multiple follow-up dates and remarks
    followup_datetime?: string; // Deprecated - keeping for backward compatibility
    closed_reason?: string;
    convert_info?: string;
    po_document?: string;
};

// Represents an item moved to the "Preprocess" pipeline after conversion.
type Preprocess = Omit<Negotiation, 'quotation_status' | 'closed_reason' | 'followup_datetime'> & {
    preprocess_status: "Pending";
};

// Represents an item moved to the "Closed" pipeline.
type ClosedItem = {
    id: string;
    company_name: string;
    department: string;
    rejection_stage: "RFQ" | "Feasibility" | "Quotation" | "Negotiation";
    rejection_reason: string;
    closed_date: string;
};


export default function EditNegotiationPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    const [formData, setFormData] = useState<Negotiation | null>(null);
    const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [isAddingFollowup, setIsAddingFollowup] = useState(false);
    const [newFollowup, setNewFollowup] = useState({ remarks: "", next_followup_date: "" });

    // Moved inside the component to fix Next.js page export error
    const teamMembers = ["Sophia Chen", "Liam Goldberg", "Aarav Patel", "Isabella Rossi", "Noah Kim"];

    useEffect(() => {
        if (id) {
            const storedData = localStorage.getItem("negotiationData") || "[]";
            const data: Negotiation[] = JSON.parse(storedData);
            const itemToEdit = data.find((item) => item.id === id);
            if (itemToEdit) {
                // Ensure events array exists
                if (!Array.isArray(itemToEdit.events)) {
                    itemToEdit.events = [];
                }
                setFormData(itemToEdit);
            }
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!formData) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const handleFileChange = (fieldName: 'fileName' | 'po_document') => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;
        const file = e.target.files?.[0];
        setFormData({ ...formData, [fieldName]: file?.name || "" });
    };

    const handleAddFollowup = () => {
        if (!formData) return;
        
        if (!newFollowup.remarks.trim() || !newFollowup.next_followup_date) {
            alert("Both remarks and next follow-up date are required.");
            return;
        }

        const followupEvent: NegotiationEvent = {
            id: uuidv4(),
            date: new Date().toISOString(),
            remarks: newFollowup.remarks,
            next_followup_date: newFollowup.next_followup_date,
        };

        setFormData({
            ...formData,
            events: [...(formData.events || []), followupEvent],
        });

        setNewFollowup({ remarks: "", next_followup_date: "" });
        setIsAddingFollowup(false);
    };

    const handleRemoveFollowup = (followupId: string) => {
        if (!formData) return;
        setFormData({
            ...formData,
            events: formData.events.filter(event => event.id !== followupId),
        });
    };

    // --- 2. Corrected Logic for Handling Status Changes ---

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        let confirmationMessage = "Are you sure you want to save these changes?";
        let confirmAction = () => proceedWithUpdate();

        switch (formData.quotation_status) {
            case "Closed":
                if (!formData.closed_reason?.trim()) {
                    alert("A reason is required to close the deal.");
                    return;
                }
                confirmationMessage = `This will move the deal to the Closed pipeline. Proceed?`;
                confirmAction = () => proceedToClose();
                break;
            case "Convert":
                confirmationMessage = `This will convert the deal and move it to the Preprocess pipeline. Proceed?`;
                confirmAction = () => proceedToConvert();
                break;
        }
        
        setDialogState({ isOpen: true, title: "Confirm Action", message: confirmationMessage, onConfirm: confirmAction });
    };
    
    const closeDialog = () => setDialogState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const proceedWithUpdate = () => {
        const data = JSON.parse(localStorage.getItem("negotiationData") || "[]");
        const updatedData = data.map((item: Negotiation) => (item.id === id ? formData : item));
        localStorage.setItem("negotiationData", JSON.stringify(updatedData));
        router.push(`/crm/pipelines/${pipelineId}/negotiation`);
    };

    const proceedToClose = () => {
        if (!formData || !formData.closed_reason) return;
        const newClosedItem: ClosedItem = {
            id: formData.id,
            company_name: formData.company_name,
            department: formData.department,
            rejection_stage: "Negotiation",
            rejection_reason: formData.closed_reason,
            closed_date: new Date().toISOString(),
        };
        const closedData = JSON.parse(localStorage.getItem("closedData") || "[]");
        localStorage.setItem("closedData", JSON.stringify([...closedData, newClosedItem]));
        
        const negotiationData = JSON.parse(localStorage.getItem("negotiationData") || "[]");
        const updatedNegotiation = negotiationData.filter((item: Negotiation) => item.id !== id);
        localStorage.setItem("negotiationData", JSON.stringify(updatedNegotiation));
        router.push(`/crm/pipelines/${pipelineId}/negotiation`);
    };

    const proceedToConvert = () => {
        if (!formData) return;
        const { quotation_status, closed_reason, followup_datetime, ...rest } = formData;
        const newPreprocessItem: Preprocess = { ...rest, preprocess_status: "Pending" };
        const preprocessData = JSON.parse(localStorage.getItem("preprocessData") || "[]");
        localStorage.setItem("preprocessData", JSON.stringify([...preprocessData, newPreprocessItem]));

        const negotiationData = JSON.parse(localStorage.getItem("negotiationData") || "[]");
        const updatedNegotiation = negotiationData.filter((item: Negotiation) => item.id !== id);
        localStorage.setItem("negotiationData", JSON.stringify(updatedNegotiation));
        router.push(`/crm/pipelines/${pipelineId}/negotiation`);
    };

    if (!formData) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-green-700">Edit Negotiation</h1>
                    <p className="text-gray-500 mt-1">Updating deal for: <span className="font-semibold text-gray-700">{formData.company_name}</span></p>
                </header>

                {/* --- 3. Redesigned Form UI --- */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-gray-600">Original Details (Read-only)</legend>
                        <div className="grid grid-cols-1 gap-5 mt-4 md:grid-cols-2">
                            <div><label className="text-sm font-medium text-gray-500">Company</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.company_name}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Department</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.department}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Contact</label><p className="p-2 mt-1 bg-gray-100 rounded">{formData.contact}</p></div>
                            <div><label className="text-sm font-medium text-gray-500">Deadline</label><p className="p-2 mt-1 bg-gray-100 rounded">{format(new Date(formData.deadline), "dd MMMM, yyyy")}</p></div>
                             {formData.subdeal_notes && <div className="md:col-span-2"><label className="text-sm font-medium text-gray-500">Subdeal Notes</label><p className="p-2 mt-1 bg-gray-100 rounded whitespace-pre-wrap">{formData.subdeal_notes}</p></div>}
                        </div>
                    </fieldset>

                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Negotiation Details</legend>
                        <div className="grid grid-cols-1 gap-6 mt-4">
                            <div>
                                <label htmlFor="team_member" className="block font-medium text-green-800">Assigned Team Member <span className="text-red-500">*</span></label>
                                <input list="teamMembers" id="team_member" name="team_member" value={formData.team_member || ''} onChange={handleChange} required className="w-full p-2 mt-1 border rounded" placeholder="Type to search for a team member"/>
                                <datalist id="teamMembers">
                                    {teamMembers.map(m => <option key={m} value={m} />)}
                                </datalist>
                            </div>
                        </div>
                    </fieldset>

                    {/* Follow-up History Section */}
                    <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-blue-800">Follow-up History</legend>
                        
                        {/* List of Existing Follow-ups */}
                        <div className="mt-4 space-y-3">
                            {!formData.events || formData.events.length === 0 ? (
                                <p className="text-gray-500">No follow-up dates recorded yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {[...formData.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(event => (
                                        <div key={event.id} className="flex items-start justify-between gap-4 p-3 border rounded bg-blue-50">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <p className="text-xs text-gray-500">
                                                        Recorded: {format(new Date(event.date), "dd MMM yyyy, hh:mm a")}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-1">{event.remarks}</p>
                                                <p className="text-xs font-semibold text-blue-700">
                                                    Next Follow-up: {format(new Date(event.next_followup_date), "dd MMM yyyy")}
                                                </p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveFollowup(event.id)} 
                                                className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded hover:bg-red-200"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Button to show the 'Add Follow-up' form */}
                        {!isAddingFollowup && (
                            <div className="pt-4 mt-4 border-t">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddingFollowup(true)} 
                                    className="px-4 py-2 font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                                >
                                    + Add Follow-up Date
                                </button>
                            </div>
                        )}
                        
                        {/* Form to Add a New Follow-up */}
                        {isAddingFollowup && (
                            <div className="p-4 mt-4 border-t border-blue-200 bg-blue-50">
                                <h3 className="font-semibold text-gray-700 mb-3">New Follow-up Entry</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Remarks / Notes <span className="text-red-500">*</span></label>
                                        <textarea 
                                            value={newFollowup.remarks}
                                            onChange={(e) => setNewFollowup({ ...newFollowup, remarks: e.target.value })}
                                            rows={3} 
                                            className="w-full p-2 border rounded"
                                            placeholder="What was discussed? What are the next steps?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Next Follow-up Date <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date"
                                            value={newFollowup.next_followup_date}
                                            onChange={(e) => setNewFollowup({ ...newFollowup, next_followup_date: e.target.value })}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            type="button" 
                                            onClick={handleAddFollowup} 
                                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded hover:bg-blue-600"
                                        >
                                            Save Follow-up
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setIsAddingFollowup(false);
                                                setNewFollowup({ remarks: "", next_followup_date: "" });
                                            }} 
                                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </fieldset>

                     <fieldset className="p-6 bg-white border rounded-lg shadow-sm">
                        <legend className="text-lg font-semibold text-green-800">Update Status</legend>
                        <div className="grid grid-cols-1 gap-6 mt-4">
                             <div>
                                <label htmlFor="quotation_status" className="block font-medium text-green-800">Negotiation Status <span className="text-red-500">*</span></label>
                                <select id="quotation_status" name="quotation_status" value={formData.quotation_status} onChange={handleChange} required className="w-full p-2 mt-1 border rounded bg-white">
                                    <option value="Followup">Followup</option>
                                    <option value="Closed">Closed</option>
                                    <option value="Convert">Convert</option>
                                </select>
                            </div>
                            {formData.quotation_status === "Followup" && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                    <p className="text-sm text-blue-800">
                                        💡 Use the &quot;Follow-up History&quot; section above to add multiple follow-up dates and track conversation history.
                                    </p>
                                </div>
                            )}
                            {formData.quotation_status === "Closed" && (
                                <div>
                                    <label htmlFor="closed_reason" className="block font-medium text-green-800">Reason for Closing <span className="text-red-500">*</span></label>
                                    <textarea id="closed_reason" name="closed_reason" value={formData.closed_reason || ''} onChange={handleChange} required rows={3} className="w-full p-2 mt-1 border rounded"></textarea>
                                </div>
                            )}
                            {formData.quotation_status === "Convert" && (
                                <>
                                    <div>
                                        <label htmlFor="convert_info" className="block font-medium text-green-800">Mail Confirmation / PO Details</label>
                                        <textarea id="convert_info" name="convert_info" value={formData.convert_info || ''} onChange={handleChange} rows={3} className="w-full p-2 mt-1 border rounded"></textarea>
                                    </div>
                                    <div>
                                        <label className="block font-medium text-green-800">Upload PO/Confirmation Document</label>
                                        <input type="file" onChange={handleFileChange('po_document')} className="w-full p-2 mt-1 text-sm border rounded bg-white" />
                                        {formData.po_document && <p className="text-xs text-gray-500 mt-1">Current PO file: {formData.po_document}</p>}
                                    </div>
                                </>
                            )}
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 pt-6 mt-4 border-t">
                        <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/negotiation`)} className="px-6 py-2 font-semibold border rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                        <button type="submit" className="px-6 py-2 font-semibold text-white bg-green-600 rounded hover:bg-green-700">Update</button>
                    </div>
                </form>
            </div>

            {dialogState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                        <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
                        <p className="mt-3 text-gray-600">{dialogState.message}</p>
                        <div className="flex justify-end mt-6 space-x-4">
                            <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                            <button onClick={dialogState.onConfirm} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
