"use client";

import ContactRow from "./ContactRow";

interface Contact {
  name: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
}

export default function ContactsTable({ contacts }: { contacts: Contact[] }) {
  return (
    <table className="min-w-full border border-gray-200 rounded-md bg-white shadow-sm">
      <thead className="bg-gray-100 text-sm text-gray-700">
        <tr>
          <th className="px-4 py-2 border">Contact Name</th>
          <th className="px-4 py-2 border">Company Name</th>
          <th className="px-4 py-2 border">Email</th>
          <th className="px-4 py-2 border">Phone</th>
          <th className="px-4 py-2 border">Contact Owner</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact, idx) => (
          <ContactRow key={idx} contact={contact} />
        ))}
      </tbody>
    </table>
  );
}
