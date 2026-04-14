"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
// Import the base type and rename it to avoid conflicts
import type { Feasibility as BaseFeasibility } from "../../page";

// Create a new local type that extends the base type with the missing property
type Feasibility = BaseFeasibility & {
    subdeal: "Yes" | "No";
    subdealRfqId?: string; // Track the created subdeal RFQ
};

type RFQ = {
  id: string;
  pipelineId: string;
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
  stage_history?: Array<{ stage: string; date: string }>;
  isSubdeal?: boolean;
  parentFeasibilityId?: string;
};

type CompanyContact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

type Company = {
  id: string;
  name: string;
  contacts: CompanyContact[];
  state?: string;
  createdAt: string;
};


export default function EditFeasibilityPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;
    const [formData, setFormData] = useState<Feasibility | null>(null);
    const [showSubdealForm, setShowSubdealForm] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [availableContacts, setAvailableContacts] = useState<CompanyContact[]>([]);
    const [subdealData, setSubdealData] = useState<Omit<RFQ, "id" | "date" | "pipelineId" | "isSubdeal" | "parentFeasibilityId" | "stage_history">>({
        department: "",
        company_name: "",
        contact: "",
        state: "",
        deadline: "",
        description: "",
        fileName: "",
        source: "",
        priority: "Low",
    });
    const [subdealInitialized, setSubdealInitialized] = useState(false);
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        mode: 'none' as 'confirm_update' | 'none',
        message: '',
        title: '',
    });

    useEffect(() => {
        if (id) {
            const storedData = localStorage.getItem("feasibilityData") || "[]";
            const data: Feasibility[] = JSON.parse(storedData);
            const itemToEdit = data.find((item) => item.id === id);
            if (itemToEdit) {
                // Ensure subdeal field exists
                if (!itemToEdit.subdeal) {
                    itemToEdit.subdeal = "No";
                }
                setFormData(itemToEdit);
                setShowSubdealForm(itemToEdit.subdeal === "Yes" && !itemToEdit.subdealRfqId);
                
                // Initialize subdeal data with parent RFQ values (only once)
                if (!subdealInitialized) {
                    setSubdealData({
                        department: itemToEdit.department,
                        company_name: itemToEdit.company_name,
                        contact: itemToEdit.contact,
                        state: itemToEdit.state,
                        deadline: "",
                        description: "",
                        fileName: "",
                        source: itemToEdit.source,
                        priority: "Low",
                    });
                    setSubdealInitialized(true);
                }
            }
        }
        
        // Load companies
        const stored = localStorage.getItem("companyData");
        if (stored) {
            try {
                const parsedCompanies = JSON.parse(stored);
                const migratedCompanies = parsedCompanies.map((company: any) => {
                    if (!Array.isArray(company.contacts)) {
                        return { ...company, contacts: [] };
                    }
                    return company;
                });
                setCompanies(migratedCompanies);
            } catch {
                setCompanies([]);
            }
        }
    }, [id, subdealInitialized]);

    // Automatically load contacts when subdeal company is pre-filled
    useEffect(() => {
        if (subdealData.company_name && companies.length > 0 && !selectedCompany) {
            const company = companies.find((c) => c.name === subdealData.company_name);
            if (company) {
                setSelectedCompany(company);
                setAvailableContacts(company.contacts || []);
            }
        }
    }, [subdealData.company_name, companies, selectedCompany]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!formData) return;
        const { name, value } = e.target;
        
        // If subdeal changes from No to Yes, show subdeal form
        if (name === "subdeal" && value === "Yes" && formData.subdeal === "No") {
            setShowSubdealForm(true);
        } else if (name === "subdeal" && value === "No") {
            setShowSubdealForm(false);
        }
        
        setFormData({ ...formData, [name]: value });
    };

    const handleSubdealChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSubdealData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubdealFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setSubdealData(prev => ({ ...prev, fileName: "" }));
            return;
        }

        if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
            alert("Please upload a PDF file that is less than 5MB.");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setSubdealData(prev => ({ ...prev, fileName: reader.result as string }));
        };
        reader.onerror = (error) => {
            console.error("Error converting file:", error);
            alert("Could not process the file.");
        };
    };

    const proceedWithUpdate = () => {
        if (!formData) return;
        
        // If subdeal is Yes and we haven't created an RFQ yet, create one from subdealData
        if (formData.subdeal === "Yes" && !formData.subdealRfqId) {
            // Validate subdeal form (only editable fields need validation)
            if (!subdealData.deadline || !subdealData.description || !subdealData.priority) {
                alert("Please fill in all required fields for the Sub-Deal RFQ (Deadline, Description, Priority).");
                return;
            }
            
            const newSubdealRfq: RFQ = {
                id: uuidv4(),
                pipelineId: pipelineId,
                date: new Date().toISOString(),
                department: subdealData.department,
                company_name: subdealData.company_name,
                contact: subdealData.contact,
                state: subdealData.state,
                deadline: subdealData.deadline,
                description: subdealData.description,
                fileName: subdealData.fileName,
                source: subdealData.source,
                priority: subdealData.priority,
                stage_history: [
                    { stage: 'Created as Sub-Deal from Feasibility', date: new Date().toISOString() }
                ],
                isSubdeal: true,
                parentFeasibilityId: formData.id,
            };
            
            // Save to RFQ data
            const rfqData = JSON.parse(localStorage.getItem("rfqData") || "[]");
            rfqData.push(newSubdealRfq);
            localStorage.setItem("rfqData", JSON.stringify(rfqData));
            
            // Update formData with subdeal RFQ ID
            formData.subdealRfqId = newSubdealRfq.id;
        }
        
        const storedData = localStorage.getItem("feasibilityData") || "[]";
        const data: Feasibility[] = JSON.parse(storedData);
        const updatedData = data.map((item) => (item.id === id ? formData : item));
        localStorage.setItem("feasibilityData", JSON.stringify(updatedData));
        
        closeDialog();
        router.push(`/crm/pipelines/${pipelineId}/feasibility`);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData) return;

        if (formData.customer_notes.trim() === "") {
            setDialogState({
                isOpen: true,
                mode: 'confirm_update',
                title: 'Confirm Update',
                message: 'You have not added any customer notes. Do you want to update anyway?'
            });
        } else {
            proceedWithUpdate();
        }
    };

    const closeDialog = () => {
        setDialogState({ isOpen: false, mode: 'none', message: '', title: '' });
    };

    const Dialog = () => {
        if (!dialogState.isOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                <div className="w-full max-w-md p-6 m-4 bg-white rounded-lg shadow-xl">
                    <h2 className="text-xl font-bold text-gray-800">{dialogState.title}</h2>
                    <p className="mt-3 text-gray-600">{dialogState.message}</p>
                    <div className="flex justify-end mt-6 space-x-4">
                        <button onClick={closeDialog} className="px-5 py-2 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                            Go Back
                        </button>
                        <button onClick={proceedWithUpdate} className="px-5 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                            Update Anyway
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (!formData) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-green-700">Edit Feasibility Check</h1>
                    <p className="text-gray-500 mt-1">Updating details for: <span className="font-semibold text-gray-700">{formData.company_name}</span></p>
                </header>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white border rounded-lg shadow-sm">
                
                    {/* Read-only fields for context */}
                    <fieldset className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <h2 className="text-lg font-semibold text-gray-600 md:col-span-2 border-b pb-2">Original RFQ Info (Read-only)</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Company Name</label>
                            <input type="text" value={formData.company_name} readOnly className="w-full p-2 mt-1 bg-gray-100 border-gray-200 rounded cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Department</label>
                            <input type="text" value={formData.department} readOnly className="w-full p-2 mt-1 bg-gray-100 border-gray-200 rounded cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Contact</label>
                            <input type="text" value={formData.contact} readOnly className="w-full p-2 mt-1 bg-gray-100 border-gray-200 rounded cursor-not-allowed" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-500">Deadline</label>
                            <input type="text" value={format(new Date(formData.deadline), 'dd MMMM, yyyy')} readOnly className="w-full p-2 mt-1 bg-gray-100 border-gray-200 rounded cursor-not-allowed" />
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500">Description</label>
                            <textarea value={formData.description} readOnly rows={3} className="w-full p-2 mt-1 bg-gray-100 border-gray-200 rounded cursor-not-allowed"></textarea>
                        </div>
                    </fieldset>
                    
                    {/* Editable fields */}
                    <div className="space-y-6 pt-6 border-t">
                         <h2 className="text-lg font-semibold text-green-800">Feasibility Assessment (Editable)</h2>
                         <div>
                           <label htmlFor="customer_notes" className="block font-medium text-green-800">Customer Notes <span className="text-gray-400 font-normal">(Required for Acceptance)</span></label>
                           <textarea 
                                id="customer_notes"
                                name="customer_notes" 
                                value={formData.customer_notes} 
                                onChange={handleChange} 
                                rows={4} 
                                className="w-full p-2 mt-1 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                placeholder="Add technical notes, feasibility status, comments, etc."
                           />
                         </div>
                         <div>
                            <label htmlFor="subdeal" className="block font-medium text-green-800">
                                Add Sub-Deals <span className="text-gray-400 font-normal">(Create new RFQ for alternate solution)</span>
                            </label>
                            <select 
                                id="subdeal"
                                name="subdeal" 
                                value={formData.subdeal} 
                                onChange={handleChange} 
                                className="w-full p-2 mt-1 bg-white border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                            >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                            
                            {formData.subdealRfqId && (
                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                                    <p className="text-xs text-green-600 mt-1">
                                        ✓ Sub-deal RFQ already created (ID: {formData.subdealRfqId.substring(0, 8)}...)
                                    </p>
                                </div>
                            )}
                         </div>
                    </div>

                    {/* Sub-Deal RFQ Form */}
                    {showSubdealForm && !formData.subdealRfqId && (
                        <div className="p-6 space-y-6 border-t bg-blue-50">
                            <h2 className="text-lg font-semibold text-blue-800">Sub-Deal RFQ Details</h2>
                            <p className="text-sm text-blue-600">Fill in all the details for the alternate solution RFQ</p>
                            
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="block font-medium text-blue-800">Department </label>
                                    <input 
                                        type="text" 
                                        name="department" 
                                        value={subdealData.department} 
                                        readOnly 
                                        className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">Source </label>
                                    <input 
                                        type="text" 
                                        name="source" 
                                        value={subdealData.source} 
                                        readOnly 
                                        className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">Company Name </label>
                                    <input 
                                        type="text" 
                                        name="company_name" 
                                        value={subdealData.company_name} 
                                        readOnly 
                                        className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">Contact </label>
                                    <input 
                                        type="text" 
                                        name="contact" 
                                        value={subdealData.contact} 
                                        readOnly 
                                        className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">State </label>
                                    <input 
                                        type="text" 
                                        name="state" 
                                        value={subdealData.state} 
                                        readOnly 
                                        className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">Deadline <span className="text-red-500">*</span></label>
                                    <input type="date" name="deadline" value={subdealData.deadline} onChange={handleSubdealChange} required className="w-full p-2 border rounded bg-white" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block font-medium text-blue-800">Description <span className="text-red-500">*</span></label>
                                    <textarea name="description" value={subdealData.description} onChange={handleSubdealChange} required rows={4} className="w-full p-2 border rounded bg-white"></textarea>
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">File Upload (PDF)</label>
                                    <input type="file" name="file" accept=".pdf" onChange={handleSubdealFileChange} className="w-full p-2 border rounded bg-white" />
                                </div>

                                <div>
                                    <label className="block font-medium text-blue-800">Priority <span className="text-red-500">*</span></label>
                                    <select name="priority" value={subdealData.priority} onChange={handleSubdealChange} required className="w-full p-2 border rounded bg-white">
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end col-span-2 gap-4 pt-6 mt-4 border-t">
                        <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/feasibility`)} className="px-6 py-2 font-semibold border rounded bg-gray-100 hover:bg-gray-200">Cancel</button>
                        <button type="submit" className="px-6 py-2 font-semibold text-white bg-green-600 rounded hover:bg-green-700">Update Feasibility</button>
                    </div>
                </form>
            </div>
            <Dialog />
        </div>
    );
}
