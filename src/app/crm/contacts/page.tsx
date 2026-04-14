"use client";

import { useState, useEffect } from "react";
import ContactsToolbar from "../components/ContactsToolbar";
import ContactsTable from "../components/ContactsTable";
import AddContactModal from "../components/AddContactModal";
import { v4 as uuidv4 } from "uuid";

// Type for contact data
type Contact = {
  name: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
};

// Type for new contact data from modal - matches AddContactModal's ContactFormData
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
  [key: string]: any;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]); // no dummy data
  const [isModalOpen, setModalOpen] = useState(false);
  const [preselectedCompany, setPreselectedCompany] = useState<string>("");

  useEffect(() => {
    // Check if we're coming from RFQ form with a selected company
    const selectedCompany = localStorage.getItem("selected_company_for_contact");
    if (selectedCompany) {
      setPreselectedCompany(selectedCompany);
      // Auto-open modal if coming from RFQ
      setModalOpen(true);
    }
  }, []);

  const handleAddContact = (data: ContactFormData) => {
    const newContact: Contact = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      company: data.company,
      email: data.emails.filter(e => e.trim()).join(", "), // Join all non-empty emails
      phone: data.mobiles.filter(m => m.trim()).join(", "), // Join all non-empty mobiles
      owner: "company name", // can be dynamic later
    };

    setContacts((prev) => [...prev, newContact]);
    
    // Also add to company's contacts in companyData
    const companyData = localStorage.getItem("companyData");
    if (companyData) {
      try {
        const companies: Company[] = JSON.parse(companyData);
        const companyIndex = companies.findIndex(c => c.name === data.company);
        
        if (companyIndex !== -1) {
          const newCompanyContact: CompanyContact = {
            id: uuidv4(),
            name: `${data.firstName} ${data.lastName}`.trim(),
            phone: data.mobiles[0] || "",
            email: data.emails[0] || "",
          };
          
          if (!companies[companyIndex].contacts) {
            companies[companyIndex].contacts = [];
          }
          companies[companyIndex].contacts.push(newCompanyContact);
          localStorage.setItem("companyData", JSON.stringify(companies));
        }
      } catch (error) {
        console.error("Error updating company contacts:", error);
      }
    }
    
    setModalOpen(false);
    
    // Check if we should return to RFQ form
    const returnUrl = localStorage.getItem("rfq_return_url");
    if (returnUrl) {
      localStorage.removeItem("selected_company_for_contact");
      window.location.href = returnUrl;
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg h-full flex flex-col">
      {/* Toolbar */}
      <ContactsToolbar onAddContact={() => setModalOpen(true)} />

      {/* Table */}
      <div className="mt-4 flex-1 overflow-auto">
        <ContactsTable contacts={contacts} />
      </div>

      {/* Add Contact Modal */}
      {isModalOpen && (
        <AddContactModal
          onClose={() => setModalOpen(false)}
          onSave={handleAddContact}
          preselectedCompany={preselectedCompany}
        />
      )}
    </div>
  );
}
