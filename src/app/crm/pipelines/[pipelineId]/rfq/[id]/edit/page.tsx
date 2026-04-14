"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { RFQ } from "../../page";

export default function EditRFQPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const pipelineId = params.pipelineId as string;
  const [formData, setFormData] = useState<RFQ | null>(null);

  useEffect(() => {
    if (id) {
      const storedData = localStorage.getItem("rfqData") || "[]";
      const data: RFQ[] = JSON.parse(storedData);
      const rfqToEdit = data.find((r) => r.id === id);
      if (rfqToEdit) {
        setFormData(rfqToEdit);
      }
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!formData) return;
      const file = e.target.files?.[0];
      setFormData({ ...formData, fileName: file?.name || "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    const storedData = localStorage.getItem("rfqData") || "[]";
    const data: RFQ[] = JSON.parse(storedData);
    const updatedData = data.map((r) => (r.id === id ? formData : r));
    localStorage.setItem("rfqData", JSON.stringify(updatedData));

    router.push(`/crm/pipelines/${pipelineId}/rfq`);
  };

  if (!formData) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="mb-6 text-2xl font-bold text-green-700">Edit RFQ</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 p-6 rounded shadow md:grid-cols-2 bg-green-50">
        
        {/* The form is identical to the New page, but populated with existing data */}
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
            </select>
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

        <div className="md:col-span-2">
            <label className="block font-medium text-green-800">Description <span className="text-red-500">*</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="w-full p-2 border rounded"></textarea>
        </div>

        <div>
            <label className="block font-medium text-green-800">File Upload</label>
            <input type="file" name="file" onChange={handleFileChange} className="w-full p-2 border rounded bg-white" />
            {formData.fileName && <p className="text-xs text-gray-500 mt-1">Current file: {formData.fileName}</p>}
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
          <button type="button" onClick={() => router.push(`/crm/pipelines/${pipelineId}/rfq`)} className="px-4 py-2 border rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Update</button>
        </div>
      </form>
    </div>
  );
}