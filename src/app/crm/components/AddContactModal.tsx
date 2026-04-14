"use client";

import { useState, useEffect } from "react";

// Define a type for the form data for type safety
type ContactFormData = {
  firstName: string;
  lastName: string;
  title: string;
  emails: string[];
  company: string;
  mobiles: string[];
  description: string;
  mailingStreet: string;
  mailingCity: string;
  mailingState: string;
  mailingCountry: string;
  mailingZip: string;
};

// Define types for the component's props
type AddContactModalProps = {
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  preselectedCompany?: string;
};

export default function AddContactModal({
  onClose,
  onSave,
  preselectedCompany,
}: AddContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: "",
    lastName: "",
    title: "",
    emails: [""],
    company: preselectedCompany || "",
    mobiles: [""],
    description: "",
    mailingStreet: "",
    mailingCity: "",
    mailingState: "",
    mailingCountry: "",
    mailingZip: "",
  });

  useEffect(() => {
    if (preselectedCompany) {
      setFormData(prev => ({ ...prev, company: preselectedCompany }));
    }
  }, [preselectedCompany]);

  // handle text field change (for non-array fields)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // handle array field changes (email/mobile)
  const handleArrayChange = (
    index: number,
    field: "emails" | "mobiles",
    value: string
  ) => {
    const updatedArray = [...formData[field]];
    updatedArray[index] = value;
    setFormData({ ...formData, [field]: updatedArray });
  };

  // add new email or mobile
  const handleAddField = (field: "emails" | "mobiles") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  // remove specific email or mobile
  const handleRemoveField = (field: "emails" | "mobiles", index: number) => {
    const updatedArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updatedArray });
  };

  const handleSave = () => {
    onSave(formData);
  };

  const addressFields: { label: string; name: keyof ContactFormData }[] = [
    { label: "Mailing Street", name: "mailingStreet" },
    { label: "Mailing City", name: "mailingCity" },
    { label: "Mailing State", name: "mailingState" },
    { label: "Mailing Country", name: "mailingCountry" },
    { label: "Mailing Zip", name: "mailingZip" },
  ];

  return (
    <div className="fixed inset-0 flex justify-end bg-black bg-opacity-40 z-50">
      {/* Side Drawer */}
      <div className="w-full sm:w-[500px] bg-white shadow-xl h-full flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Add Contact</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">Contact Information</h3>
            <div className="space-y-4">
              {/* Title Dropdown */}
              <div className="flex items-center">
                <label className="w-40 text-gray-700">Title</label>
                <select
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="">Select</option>
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                </select>
              </div>

              {/* First Name */}
              <div className="flex items-center">
                <label className="w-40 text-gray-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Last Name */}
              <div className="flex items-center">
                <label className="w-40 text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Company */}
              <div className="flex items-center">
                <label className="w-40 text-gray-700">Company Name</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {/* Emails */}
              <div>
                <label className="block text-gray-700 mb-2">Email(s)</label>
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        handleArrayChange(index, "emails", e.target.value)
                      }
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    {formData.emails.length > 1 && (
                      <button
                        onClick={() => handleRemoveField("emails", index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => handleAddField("emails")}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add another email
                </button>
              </div>

              {/* Mobiles */}
              <div>
                <label className="block text-gray-700 mb-2">Mobile Number(s)</label>
                {formData.mobiles.map((mobile, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) =>
                        handleArrayChange(index, "mobiles", e.target.value)
                      }
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    {formData.mobiles.length > 1 && (
                      <button
                        onClick={() => handleRemoveField("mobiles", index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => handleAddField("mobiles")}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Add another mobile
                </button>
              </div>

              {/* Description */}
              <div className="flex items-center">
                <label className="w-40 text-gray-700">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div>
            <h3 className="text-lg font-medium mb-4">Address Details</h3>
            <div className="space-y-4">
              {addressFields.map(({ label, name }) => (
                <div key={name} className="flex items-center">
                  <label className="w-40 text-gray-700">{label}</label>
                  <input
                    type="text"
                    name={name}
                    value={formData[name] as string}
                    onChange={handleChange}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-2xl bg-green-600 text-white hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>

      {/* Animation */}
      <style jsx>{`
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}
