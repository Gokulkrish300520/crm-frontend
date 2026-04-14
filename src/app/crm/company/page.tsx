"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import AddContactModal from "../components/AddContactModal";

export type CompanyContact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

export type Company = {
  id: string;
  name: string;
  industry?: string;
  address?: string;
  state?: string;
  contacts: CompanyContact[]; // Changed from single contact to array
  gst?: string;
  createdAt: string;
};

export default function CompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCompanyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Omit<Company, "id" | "createdAt">>({
    name: "",
    industry: "",
    address: "",
    state: "",
    contacts: [],
    gst: "",
  });
  const [isContactModalOpen, setContactModalOpen] = useState(false);

  useEffect(() => {
    const storedCompanies = localStorage.getItem("companyData");

    if (storedCompanies) {
      try {
        const parsedCompanies = JSON.parse(storedCompanies);
        // Migrate old data structure to new structure
        const migratedCompanies = parsedCompanies.map((company: any) => {
          if (!Array.isArray(company.contacts)) {
            // Old structure - migrate
            const contacts: CompanyContact[] = [];
            if (company.contact) {
              contacts.push({
                id: uuidv4(),
                name: company.contact,
                phone: company.phone || "",
                email: company.email || "",
              });
            }
            return { ...company, contacts };
          }
          return company;
        });
        setCompanies(migratedCompanies);
        // Save migrated data back
        localStorage.setItem("companyData", JSON.stringify(migratedCompanies));
      } catch {
        setCompanies([]);
      }
    }
  }, []);

  const persistCompanies = (data: Company[]) => {
    setCompanies(data);
    localStorage.setItem("companyData", JSON.stringify(data));
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      industry: "",
      address: "",
      state: "",
      contacts: [],
      gst: "",
    });
    setCompanyModalOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      industry: company.industry || "",
      address: company.address || "",
      state: company.state || "",
      contacts: company.contacts || [],
      gst: company.gst || "",
    });
    setCompanyModalOpen(true);
  };

  const handleDeleteCompany = (id: string) => {
    if (confirm("Are you sure you want to delete this company?")) {
      const updated = companies.filter((c) => c.id !== id);
      persistCompanies(updated);
    }
  };

  const handleSubmitCompany = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCompany) {
      const updated = companies.map((c) =>
        c.id === editingCompany.id ? { ...c, ...formData } : c
      );
      persistCompanies(updated);
    } else {
      const newCompany: Company = {
        ...formData,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      persistCompanies([...companies, newCompany]);
      
      // Store the company name for RFQ form to auto-select
      localStorage.setItem("last_added_company", newCompany.name);
    }

    setCompanyModalOpen(false);
    
    // Check if we should return to RFQ form
    const returnUrl = localStorage.getItem("rfq_return_url");
    if (returnUrl) {
      window.location.href = returnUrl;
    }
  };

  const handleChangeCompany = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveContact = (data: any) => {
    const newContact: CompanyContact = {
      id: uuidv4(),
      name: `${data.firstName} ${data.lastName}`.trim(),
      phone: data.mobiles[0] || "",
      email: data.emails[0] || "",
    };
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, newContact],
    }));
    setContactModalOpen(false);
  };

  const handleRemoveContact = (contactId: string) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== contactId),
    }));
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Companies</h1>
        <button
          onClick={handleAddCompany}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-md transition"
        >
          <Plus size={20} />
          Add Company
        </button>
      </div>

      {/* Table */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          No companies yet. Add one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Name", "Industry", "Address", "State", "Contacts", "GST No.", "Actions"].map(
                  (title) => (
                    <th
                      key={title}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      {title}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{company.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{company.industry || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{company.address || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{company.state || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {company.contacts && company.contacts.length > 0 ? (
                      <div className="space-y-1">
                        {company.contacts.map((contact) => (
                          <div key={contact.id} className="text-xs">
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-gray-400">{contact.phone}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{company.gst || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEditCompany(company)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Company Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity"
            onClick={() => setCompanyModalOpen(false)}
          />

          {/* Slide Panel */}
          <div className="ml-auto w-full max-w-lg bg-white shadow-2xl p-8 h-full flex flex-col transform transition-transform duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                {editingCompany ? "Edit Company" : "Add New Company"}
              </h2>
              <button
                onClick={() => setCompanyModalOpen(false)}
                className="text-gray-500 hover:text-gray-800 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form with inline labels */}
            <form onSubmit={handleSubmitCompany} className="space-y-4 flex-1 flex flex-col">
              {/* Company Name */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700 font-medium">Company Name:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChangeCompany}
                  placeholder="Company Name"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Industry */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700 font-medium">Industry:</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChangeCompany}
                  placeholder="Industry"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Address */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700 font-medium">Address:</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChangeCompany}
                  placeholder="Address"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* State */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700 font-medium">State:</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChangeCompany}
                  placeholder="State"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Contact Management */}
              <div className="flex flex-col gap-4">
                <label className="text-gray-700 font-medium">Contacts:</label>
                
                {/* Display existing contacts */}
                {formData.contacts.length > 0 && (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                    {formData.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.phone}</div>
                          {contact.email && (
                            <div className="text-xs text-gray-400">{contact.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(contact.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add new contact button */}
                <button
                  type="button"
                  onClick={() => setContactModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition self-start"
                >
                  + Add Contact
                </button>
              </div>

              {/* GST Number */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700 font-medium">GST Number:</label>
                <input
                  type="text"
                  name="gst"
                  value={formData.gst}
                  onChange={handleChangeCompany}
                  placeholder="GST Number"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  {editingCompany ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isContactModalOpen && (
        <AddContactModal
          onClose={() => setContactModalOpen(false)}
          onSave={handleSaveContact}
        />
      )}
    </div>
  );
}
