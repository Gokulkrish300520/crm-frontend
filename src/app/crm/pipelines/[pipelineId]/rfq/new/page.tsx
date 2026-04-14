"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { RFQ } from "../page";

type CompanyContact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

type Company = {
  id: string;
  name: string;
  industry?: string;
  address?: string;
  state?: string;
  contacts: CompanyContact[];
  gst?: string;
  createdAt: string;
};

export default function NewRFQPage() {
  const params = useParams();
  const pipelineId = params?.pipelineId as string;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [availableContacts, setAvailableContacts] = useState<CompanyContact[]>([]);
  const [formData, setFormData] = useState<Omit<RFQ, "id" | "date">>({
    pipelineId: pipelineId || "",
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

  useEffect(() => {
    // Load companies from localStorage
    const stored = localStorage.getItem("companyData");
    if (stored) {
      try {
        const parsedCompanies = JSON.parse(stored);
        // Ensure contacts array exists for all companies
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

    // Check if returning from company or contacts page
    const returnUrl = localStorage.getItem("rfq_return_url");
    if (returnUrl && returnUrl === window.location.href) {
      // Clear the return URL
      localStorage.removeItem("rfq_return_url");
      
      // Reload companies in case a new one was added
      const updatedStored = localStorage.getItem("companyData");
      if (updatedStored) {
        try {
          const parsedCompanies = JSON.parse(updatedStored);
          const migratedCompanies = parsedCompanies.map((company: any) => {
            if (!Array.isArray(company.contacts)) {
              return { ...company, contacts: [] };
            }
            return company;
          });
          setCompanies(migratedCompanies);
          
          // If there's a newly added company, select it
          const lastAddedCompany = localStorage.getItem("last_added_company");
          if (lastAddedCompany) {
            handleCompanyChange(lastAddedCompany);
            localStorage.removeItem("last_added_company");
          }
        } catch {
          setCompanies([]);
        }
      }
    }
  }, []);

  const handleCompanyChange = (companyName: string) => {
    const company = companies.find((c) => c.name === companyName);
    setSelectedCompany(company || null);
    
    if (company && company.contacts) {
      setAvailableContacts(company.contacts);
    } else {
      setAvailableContacts([]);
    }
    
    setFormData((prev) => ({ 
      ...prev, 
      company_name: companyName,
      contact: "", // Reset contact when company changes
      state: company?.state || prev.state,
    }));
  };

  const handleAddNewCompany = () => {
    // Save the current return URL
    localStorage.setItem("rfq_return_url", window.location.href);
    // Navigate to company page
    window.location.href = "/crm/company";
  };

  const handleAddNewContact = () => {
    if (!formData.company_name) {
      alert("Please select a company first before adding a contact");
      return;
    }
    // Save the current return URL and selected company
    localStorage.setItem("rfq_return_url", window.location.href);
    localStorage.setItem("selected_company_for_contact", formData.company_name);
    // Navigate to contacts page
    window.location.href = "/crm/contacts";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "company_name") {
      handleCompanyChange(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
          setFormData(prev => ({ ...prev, fileName: "" }));
          return;
      };

      if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
          alert("Please upload a PDF file that is less than 5MB.");
          e.target.value = '';
          return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
          setFormData(prev => ({ ...prev, fileName: reader.result as string }));
      };
      reader.onerror = (error) => {
          console.error("Error converting file:", error);
          alert("Could not process the file.");
      };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRFQ: RFQ = {
      ...formData,
      id: uuidv4(),
      date: new Date().toISOString(),
      pipelineId: pipelineId,
    };

    const storedData = localStorage.getItem("rfqData") || "[]";
    const data: RFQ[] = JSON.parse(storedData);
    data.push(newRFQ);
    localStorage.setItem("rfqData", JSON.stringify(data));

    // Navigate back to the RFQ list for this pipeline
    window.location.href = `/crm/pipelines/${pipelineId}/rfq`;
  };
  
  const handleCancel = () => {
    window.location.href = `/crm/pipelines/${pipelineId}/rfq`;
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="mb-6 text-2xl font-bold text-green-700">Add New RFQ</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 p-6 rounded shadow md:grid-cols-2 bg-green-50">
        
        <div>
          <label className="block font-medium text-green-800">Department <span className="text-red-500">*</span></label>
          <select name="department" value={formData.department} onChange={handleChange} required className="w-full p-2 border rounded">
              <option value="">Select Department</option>
              <option value="Fab">Fab</option>
              <option value="EMS">EMS</option>
              <option value="Component">Component</option>
          </select>
        </div>

        <div>
            <label className="block font-medium text-green-800">Source <span className="text-red-500">*</span></label>
            <select name="source" value={formData.source} onChange={handleChange} required className="w-full p-2 border rounded">
                <option value="">Select Source</option>
                <option value="Expo">Expo</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="JD">JD</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Hold Client">Old Client</option>
            </select>
        </div>

        <div>
            <label className="block font-medium text-green-800">Company Name <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {companies.length > 0 ? (
                <select 
                  name="company_name" 
                  value={formData.company_name} 
                  onChange={handleChange} 
                  required 
                  className="flex-1 p-2 border rounded"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  name="company_name" 
                  value={formData.company_name} 
                  onChange={handleChange} 
                  required 
                  className="flex-1 p-2 border rounded" 
                  placeholder="No companies found - enter manually"
                />
              )}
              <button
                type="button"
                onClick={handleAddNewCompany}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 whitespace-nowrap"
                title="Add New Company"
              >
                + Add New
              </button>
            </div>
            {companies.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">
                💡 Click &quot;Add New&quot; to create companies in the Company List
              </p>
            )}
        </div>

        <div>
            <label className="block font-medium text-green-800">Contact <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {availableContacts.length > 0 ? (
                <select
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className="flex-1 p-2 border rounded"
                >
                  <option value="">Select Contact</option>
                  {availableContacts.map((contact) => (
                    <option key={contact.id} value={`${contact.name} (${contact.phone})`}>
                      {contact.name} - {contact.phone}
                    </option>
                  ))}
                </select>
              ) : formData.company_name ? (
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className="flex-1 p-2 border rounded"
                  placeholder="No contacts for this company - enter manually"
                />
              ) : (
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className="flex-1 p-2 border rounded bg-gray-100"
                  placeholder="Select a company first"
                  disabled
                />
              )}
              <button
                type="button"
                onClick={handleAddNewContact}
                disabled={!formData.company_name}
                className={`px-4 py-2 text-white rounded whitespace-nowrap ${
                  formData.company_name 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                title={formData.company_name ? "Add New Contact" : "Select a company first"}
              >
                + Add New
              </button>
            </div>
            {formData.company_name && availableContacts.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">
                💡 Click &quot;Add New&quot; to add contacts for {formData.company_name}
              </p>
            )}
        </div>

         <div>
            <label className="block font-medium text-green-800">State <span className="text-red-500">*</span></label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} required className="w-full p-2 border rounded" />
        </div>

        <div>
            <label className="block font-medium text-green-800">Deadline <span className="text-red-500">*</span></label>
            <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required className="w-full p-2 border rounded" />
        </div>

        <div className="md:col-span-2">
            <label className="block font-medium text-green-800">Description <span className="text-red-500">*</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="w-full p-2 border rounded"></textarea>
        </div>

        <div>
            <label className="block font-medium text-green-800">File Upload (PDF)</label>
            <input type="file" name="file" accept=".pdf" onChange={handleFileChange} className="w-full p-2 border rounded bg-white" />
        </div>

        <div>
          <label className="block font-medium text-green-800">Priority <span className="text-red-500">*</span></label>
          <select name="priority" value={formData.priority} onChange={handleChange} required className="w-full p-2 border rounded">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
          </select>
        </div>

        <div className="flex justify-end col-span-2 gap-4 mt-4">
          <button type="button" onClick={handleCancel} className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Save</button>
        </div>
      </form>
    </div>
  );
}

