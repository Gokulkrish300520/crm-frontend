"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import type { Quotation } from "../page";

export default function NewQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const pipelineId = params?.pipelineId as string;
  const [formData, setFormData] = useState<Omit<Quotation, "id" | "date">>({
    department: "",
    company_name: "",
    contact: "",
    state: "",
    deadline: "",
    description: "",
    fileName: "",
    source: "",
    priority: "Medium",
    customer_notes: "",
    subdeals: [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFormData(prev => ({ ...prev, fileName: file?.name || "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: Quotation = {
      ...formData,
      id: uuidv4(),
      date: new Date().toISOString(),
    };

    const storedData = localStorage.getItem("quotationData") || "[]";
    const data: Quotation[] = JSON.parse(storedData);
    data.push(newItem);
    localStorage.setItem("quotationData", JSON.stringify(data));

    router.push(`/crm/pipelines/${pipelineId}/quotation`);
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="mb-6 text-2xl font-bold text-green-700">Add New Quotation</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 p-6 rounded shadow md:grid-cols-2 bg-green-50">
        <div>
          <label className="block font-medium text-green-800">Department <span className="text-red-500">*</span></label>
          <input list="departments" name="department" value={formData.department} onChange={handleChange} required className="w-full p-2 border rounded" />
          <datalist id="departments">
            <option value="Fab" /> <option value="EMS" /> <option value="Component" /> <option value="R&D" />
          </datalist>
        </div>
        <div>
          <label className="block font-medium text-green-800">Company Name <span className="text-red-500">*</span></label>
          <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block font-medium text-green-800">Contact <span className="text-red-500">*</span></label>
          <input type="text" name="contact" value={formData.contact} onChange={handleChange} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block font-medium text-green-800">State <span className="text-red-500">*</span></label>
          <input type="text" name="state" value={formData.state} onChange={handleChange} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block font-medium text-green-800">Deadline <span className="text-red-500">*</span></label>
          <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block font-medium text-green-800">Source</label>
          <input type="text" name="source" value={formData.source} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block font-medium text-green-800">Priority <span className="text-red-500">*</span></label>
          <select name="priority" value={formData.priority} onChange={handleChange} required className="w-full p-2 border rounded">
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block font-medium text-green-800">Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-2 border rounded"></textarea>
        </div>
        <div className="md:col-span-2">
          <label className="block font-medium text-green-800">Customer Notes</label>
          <textarea name="customer_notes" value={formData.customer_notes} onChange={handleChange} rows={2} className="w-full p-2 border rounded"></textarea>
        </div>
        <div>
          <label className="block font-medium text-green-800">File Upload</label>
          <input type="file" onChange={handleFileChange} className="w-full p-2 border rounded bg-white" />
        </div>
        <div className="flex justify-end col-span-2 gap-4 mt-4">
          <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/quotation`)} className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Save</button>
        </div>
      </form>
    </div>
  );
}